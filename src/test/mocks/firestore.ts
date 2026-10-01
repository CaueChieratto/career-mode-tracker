import { vi } from 'vitest';

export interface TestReference { path: string }
const reference = (parent: TestReference | unknown, ...segments: string[]): TestReference => ({
  path: [parent && typeof parent === 'object' && 'path' in parent ? parent.path : '', ...segments]
    .filter(Boolean).join('/'),
});
const blocked = (): never => { throw new Error('UNCONFIGURED_FIRESTORE_OPERATION'); };
export const doc = vi.fn(reference);
export const collection = vi.fn(reference);
export const collectionGroup = vi.fn(reference);
export const getDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>(blocked);
export const getDocs = vi.fn<(...args: unknown[]) => Promise<unknown>>(blocked);
export const getDocsFromServer = vi.fn<(...args: unknown[]) => Promise<unknown>>(blocked);
export const onSnapshot = vi.fn<(...args: unknown[]) => () => void>(blocked);
export const setDoc = vi.fn<(...args: unknown[]) => Promise<void>>(blocked);
export const updateDoc = vi.fn<(...args: unknown[]) => Promise<void>>(blocked);
export const deleteDoc = vi.fn<(...args: unknown[]) => Promise<void>>(blocked);
export const writeBatch = vi.fn(blocked);
export const runTransaction = vi.fn(blocked);
export const arrayUnion = vi.fn((...elements: unknown[]) => ({
  __op: "arrayUnion",
  elements,
}));
export const query = vi.fn(blocked);
export const where = vi.fn(blocked);

export const documentSnapshot = (id: string, data: unknown, exists = true) => ({
  id, ref: { path: id }, exists: () => exists, data: () => data,
  metadata: { fromCache: false, hasPendingWrites: false },
});
export const querySnapshot = (records: { id: string; data: unknown }[]) => ({
  empty: records.length === 0,
  docs: records.map(({ id, data }) => documentSnapshot(id, data)),
});
