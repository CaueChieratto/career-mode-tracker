interface FirestoreTimestamp {
  toDate: () => Date;
}

export const isFirestoreTimestamp = (
  value: unknown,
): value is FirestoreTimestamp => {
  return typeof value === "object" && value !== null && "toDate" in value;
};
