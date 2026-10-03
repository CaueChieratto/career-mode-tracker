import { vi } from "vitest";

const blocked = (): never => {
  throw new Error("UNCONFIGURED_FUNCTIONS_OPERATION");
};

export const httpsCallable = vi.fn(blocked);
export const getFunctions = vi.fn(blocked);
export const connectFunctionsEmulator = vi.fn(blocked);
