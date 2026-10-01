export interface EmulatorEnvironment {
  GCLOUD_PROJECT?: string;
  FIREBASE_EMULATOR_HOST?: string;
  FIRESTORE_EMULATOR_HOST?: string;
  FIREBASE_AUTH_EMULATOR_HOST?: string;
}

// Deliberately accepts only explicit loopback emulators and a demo project.
export function requireEmulators(env: EmulatorEnvironment): void {
  if (!env.GCLOUD_PROJECT?.startsWith('demo-')) throw new Error('EMULATOR_REQUIRED: GCLOUD_PROJECT must start with demo-');
  for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST'] as const) {
    const value = env[key];
    if (!value || !/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(value)) throw new Error(`EMULATOR_REQUIRED: ${key} must be an explicit loopback host:port`);
    const port = Number(value.slice(value.lastIndexOf(':') + 1));
    if (port < 1 || port > 65535) throw new Error(`EMULATOR_REQUIRED: invalid port in ${key}`);
  }
}
