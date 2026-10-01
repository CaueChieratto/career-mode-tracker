interface CardConflictResult {
  updates: { key: string; value: boolean }[];
}

export const resolveCardConflicts = (
  fieldId: string,
  value: boolean,
): CardConflictResult => {
  const updates: { key: string; value: boolean }[] = [];

  if (fieldId.startsWith("opponentSecondYellow_") && value) {
    const index = fieldId.split("_")[1];
    updates.push({ key: `opponentRed_${index}`, value: false });
  }

  if (fieldId.startsWith("opponentRed_") && value) {
    const index = fieldId.split("_")[1];
    updates.push({ key: `opponentSecondYellow_${index}`, value: false });
  }

  if (fieldId.startsWith("opponentYellow_") && !value) {
    const index = fieldId.split("_")[1];
    updates.push({ key: `opponentSecondYellow_${index}`, value: false });
  }

  return { updates };
};
