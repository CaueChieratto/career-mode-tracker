// Real SDK operations, with an explicit fault/scheduling seam only in tests.
import * as sdk from "firebase/firestore";
import {
  assertSafeEnvironment,
  assertSafePath,
} from "./protected-user-guard.cjs";
export * from "firebase/firestore";
export type Operation =
  | "getDoc"
  | "getDocs"
  | "setDoc"
  | "updateDoc"
  | "deleteDoc";
export interface Call {
  operation: Operation;
  path: string;
  phase: "before" | "after";
}
export const boundary: {
  hook?: (call: Call) => void | Promise<void>;
  calls: Call[];
} = { calls: [] };
function intercept<F extends (...args: never[]) => unknown>(
  operation: Operation,
  fn: F,
): F {
  return (async (...args: Parameters<F>) => {
    const ref = args[0] as {
      path?: string;
      _query?: {
        path: { canonicalString(): string };
        collectionGroup: string | null;
        filters: {
          field: { canonicalString(): string };
          op: string;
          value: { referenceValue?: string };
        }[];
      };
    };
    const path =
      ref.path ||
      (!ref._query?.collectionGroup
        ? ref._query?.path.canonicalString()
        : "") ||
      "";
    assertSafePath(path);
    // Ordinary filtered queries retain their collection path; allow only fixture careers.
    if (
      !ref.path &&
      path &&
      !/^users\/emulator-fixture-[ab]\/careers$/.test(path)
    )
      throw new Error("UNSCOPED_TEST_QUERY");
    if (!path) {
      const filters = ref._query?.filters || [];
      const lower = filters.find(
        (f) => f.field.canonicalString() === "__name__" && f.op === ">=",
      )?.value.referenceValue;
      const upper = filters.find(
        (f) => f.field.canonicalString() === "__name__" && f.op === "<",
      )?.value.referenceValue;
      if (!lower || upper !== lower + "\u0000")
        throw new Error("UNSCOPED_TEST_QUERY");
      assertSafePath(lower);
      if (
        !/\/documents\/users\/emulator-fixture-[ab]\/careers\/[^/]+(?:\/seasons\/[^/]+)?$/.test(
          lower,
        )
      )
        throw new Error("UNSCOPED_TEST_QUERY");
    }
    const before = { operation, path, phase: "before" as const };
    boundary.calls.push(before);
    await boundary.hook?.(before);
    const result = await fn(...args);
    const after = { operation, path, phase: "after" as const };
    boundary.calls.push(after);
    await boundary.hook?.(after);
    return result;
  }) as F;
}
export const getDoc = intercept("getDoc", sdk.getDoc);
export const getDocs = intercept("getDocs", sdk.getDocs);
export const setDoc = intercept("setDoc", sdk.setDoc);
export const updateDoc = intercept("updateDoc", sdk.updateDoc);
export const deleteDoc = intercept("deleteDoc", sdk.deleteDoc);
export const getDocFromServer = intercept("getDoc", sdk.getDocFromServer);
export const getDocsFromServer = intercept("getDocs", sdk.getDocsFromServer);

function guardedReference<F extends (...args: never[]) => unknown>(fn: F): F {
  return ((...args: Parameters<F>) => {
    const parent = args[0] as { path?: string };
    assertSafePath(
      [
        parent.path || "",
        ...args.slice(1).filter((arg) => typeof arg === "string"),
      ].join("/"),
    );
    return fn(...args);
  }) as F;
}
export const doc = guardedReference(sdk.doc);
export const collection = guardedReference(sdk.collection);
export const initializeFirestore: typeof sdk.initializeFirestore = (
  ...args
) => {
  assertSafeEnvironment();
  if (args[0].options.projectId !== "demo-career-tracker-integration")
    throw new Error("DESTRUCTIVE_TEST_GUARD_REQUIRED");
  return sdk.initializeFirestore(...args);
};

export const writeBatch: typeof sdk.writeBatch = (...args) => {
  assertSafeEnvironment();
  const batch = sdk.writeBatch(...args);
  const writes: { operation: Operation; path: string }[] = [];
  const proxy = new Proxy(batch, {
    get(target, key) {
      if (key === "commit")
        return async () => {
          for (const write of writes) {
            const call = { ...write, phase: "before" as const };
            boundary.calls.push(call);
            await boundary.hook?.(call);
          }
          await target.commit();
          for (const write of writes) {
            const call = { ...write, phase: "after" as const };
            boundary.calls.push(call);
            await boundary.hook?.(call);
          }
        };
      if (key === "set" || key === "update" || key === "delete")
        return (...input: unknown[]) => {
          const path = (input[0] as { path: string }).path;
          assertSafePath(path);
          Reflect.apply(target[key], target, input);
          writes.push({
            operation:
              key === "set"
                ? "setDoc"
                : key === "update"
                  ? "updateDoc"
                  : "deleteDoc",
            path,
          });
          return proxy;
        };
      return Reflect.get(target, key);
    },
  });
  return proxy;
};

export async function runTransaction<T>(
  firestore: sdk.Firestore,
  updateFunction: (transaction: sdk.Transaction) => Promise<T>,
  options?: sdk.TransactionOptions,
): Promise<T> {
  assertSafeEnvironment();
  let committed: { operation: Operation; path: string }[] = [];
  const result = await sdk.runTransaction(
    firestore,
    async (transaction) => {
      const writes: {
        operation: Operation;
        path: string;
        apply: () => void;
      }[] = [];
      const proxy = new Proxy(transaction, {
        get(target, key) {
          if (key === "get")
            return intercept("getDoc", target.get.bind(target));
          if (key === "set" || key === "update" || key === "delete")
            return (...input: unknown[]) => {
              const path = (input[0] as { path: string }).path;
              assertSafePath(path);
              writes.push({
                operation:
                  key === "set"
                    ? "setDoc"
                    : key === "update"
                      ? "updateDoc"
                      : "deleteDoc",
                path,
                apply: () => {
                  Reflect.apply(target[key], target, input);
                },
              });
              return proxy;
            };
          return Reflect.get(target, key);
        },
      });
      const value = await updateFunction(proxy);
      for (const { operation, path } of writes) {
        const call = { operation, path, phase: "before" as const };
        boundary.calls.push(call);
        await boundary.hook?.(call);
      }
      for (const write of writes) write.apply();
      committed = writes;
      return value;
    },
    options,
  );
  for (const { operation, path } of committed) {
    const call = { operation, path, phase: "after" as const };
    boundary.calls.push(call);
    await boundary.hook?.(call);
  }
  return result;
}
