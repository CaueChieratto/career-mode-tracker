import { vi } from 'vitest';
const blocked = (): never => { throw new Error('UNCONFIGURED_AUTH_OPERATION'); };
export const onAuthStateChanged = vi.fn<(...args: unknown[]) => () => void>(blocked);
export const signInWithEmailAndPassword = vi.fn(blocked);
export const createUserWithEmailAndPassword = vi.fn(blocked);
