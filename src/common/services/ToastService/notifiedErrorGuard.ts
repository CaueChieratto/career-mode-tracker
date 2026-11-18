const notifiedErrors = new WeakSet<object>();

export function markErrorAsNotified<T>(error: T): T {
  if (typeof error === "object" && error !== null) {
    notifiedErrors.add(error);
  }
  return error;
}

export function isErrorNotified(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && notifiedErrors.has(error)
  );
}

