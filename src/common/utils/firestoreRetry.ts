/**
 * Utilitário de resiliência e retry com backoff exponencial para operações do Firestore.
 * Trata erros transitórios comuns em produção como 429 (Too Many Requests),
 * resource-exhausted (estouro temporário de quota/rate limit) e unavailable (falhas pontuais de conexão).
 */
export async function withFirestoreRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  initialDelayMs = 200,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: unknown) {
      attempt++;
      const err = error as { code?: string; message?: string } | undefined;
      const errorCode = err?.code || "";
      const errorMessage = err?.message || "";

      const isRetryable =
        errorCode === "unavailable" ||
        errorCode === "resource-exhausted" ||
        errorCode === "aborted" ||
        errorCode === "deadline-exceeded" ||
        errorMessage.includes("429") ||
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("Quota exceeded");

      if (attempt > maxRetries || !isRetryable) {
        throw error;
      }

      const delay =
        initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
