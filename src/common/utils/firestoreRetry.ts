let quotaExceededUntil = 0;
const DEFAULT_QUOTA_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Marca que a quota do Firestore foi excedida ou sofreu rate limit, ativando
 * o circuit breaker para evitar novas requisições fadadas a erro 429.
 */
export const markQuotaExceeded = (
  cooldownMs = DEFAULT_QUOTA_COOLDOWN_MS,
): void => {
  quotaExceededUntil = Date.now() + cooldownMs;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "cmt_quota_exceeded_until",
        String(quotaExceededUntil),
      );
    }
  } catch {
    // ignore
  }
};

/**
 * Verifica se o circuit breaker de quota está ativo.
 */
export const isQuotaExceededActive = (): boolean => {
  if (Date.now() < quotaExceededUntil) return true;
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("cmt_quota_exceeded_until");
      if (stored) {
        const until = Number(stored);
        if (Date.now() < until) {
          quotaExceededUntil = until;
          return true;
        }
      }
    }
  } catch {
    // ignore
  }
  return false;
};

/**
 * Reseta o estado do circuit breaker de quota (usado principalmente em testes ou reinício manual).
 */
export const resetQuotaExceeded = (): void => {
  quotaExceededUntil = 0;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("cmt_quota_exceeded_until");
    }
  } catch {
    // ignore
  }
};

/**
 * Verifica se um erro retornado pelo Firestore é decorrente de estouro de quota ou rate-limit (429 / resource-exhausted).
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "string") {
    const lower = error.toLowerCase();
    return (
      lower.includes("resource-exhausted") ||
      lower.includes("quota exceeded") ||
      lower.includes("too many requests") ||
      lower.includes("429")
    );
  }
  const err = error as Record<string, unknown>;
  const code = String(err.code || "").toLowerCase();
  const message = String(err.message || "").toLowerCase();
  const details = String(err.details || "").toLowerCase();
  const status = Number(err.status);

  return (
    code === "resource-exhausted" ||
    code.includes("429") ||
    message.includes("quota exceeded") ||
    message.includes("resource-exhausted") ||
    message.includes("too many requests") ||
    message.includes("429") ||
    details.includes("resource-exhausted") ||
    details.includes("quota exceeded") ||
    details.includes("429") ||
    status === 429
  );
}

/**
 * Utilitário de resiliência e retry com backoff exponencial para operações do Firestore.
 * Trata erros transitórios comuns em produção como unavailable (falhas pontuais de conexão).
 * Se o erro for de quota (429 / resource-exhausted), marca imediatamente o circuit breaker e aborta sem retries redundantes.
 */
export async function withFirestoreRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  initialDelayMs = 200,
  shouldRetry?: (error: unknown) => boolean,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
        throw error;
      }
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }
      attempt++;
      const err = error as { code?: string; message?: string } | undefined;
      const errorCode = err?.code || "";

      const isRetryable =
        errorCode === "unavailable" ||
        errorCode === "aborted" ||
        errorCode === "deadline-exceeded";

      if (attempt > maxRetries || !isRetryable) {
        throw error;
      }

      const delay =
        initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
