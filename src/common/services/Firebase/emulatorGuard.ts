/**
 * Funções de guarda para conexão com Firebase Emulator.
 * Garante que a aplicação NUNCA tente conectar a emuladores em 127.0.0.1
 * quando executando em domínios remotos de produção (ex.: Firebase Hosting, Vercel).
 */

export const isLocalhostEnvironment = (customHostname?: string): boolean => {
  if (customHostname !== undefined) {
    return (
      customHostname === "localhost" ||
      customHostname === "127.0.0.1" ||
      customHostname === "::1" ||
      customHostname === "[::1]" ||
      customHostname.endsWith(".localhost")
    );
  }

  if (typeof window === "undefined" || !window.location) {
    // Ambiente sem window (ex.: Node.js / runner de teste)
    return true;
  }

  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
};

let hasWarnedRemoteEmulator = false;

export const resetEmulatorGuardState = (): void => {
  hasWarnedRemoteEmulator = false;
};

export const shouldConnectEmulator = (
  envFlag = import.meta.env.VITE_USE_FIREBASE_EMULATOR,
  customHostname?: string,
): boolean => {
  if (envFlag !== "true") {
    return false;
  }

  // Em ambientes de navegador, NUNCA conecta a 127.0.0.1 a partir de domínios remotos
  // (ex.: *.web.app, *.vercel.app). Conectar a localhost em produção remota causa
  // net::ERR_CONNECTION_REFUSED e "Could not reach Cloud Firestore backend".
  const isLocal = isLocalhostEnvironment(customHostname);
  const isBrowserOrExplicitHost =
    typeof window !== "undefined" || customHostname !== undefined;

  if (isBrowserOrExplicitHost && !isLocal) {
    if (!hasWarnedRemoteEmulator) {
      hasWarnedRemoteEmulator = true;
      const currentHost =
        customHostname ??
        (typeof window !== "undefined" ? window.location.hostname : "remote");
      console.warn(
        `[Firebase] Conexão com o emulador bloqueada: aplicação rodando no host remoto (${currentHost}). Utilizando Firebase de produção.`,
      );
    }
    return false;
  }

  return true;
};

