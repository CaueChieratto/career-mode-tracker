import { Match } from "../../../../../../../../../../../common/interfaces/Match";

const parseDateObj = (date: string) => {
  const [day, month, rawYear] = date.split("/").map(Number);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  return new Date(year, month - 1, day);
};

export const getLatestFinishedMatch = (matches: Match[]): Match | null => {
  const finished = matches.filter((m) => m.status === "FINISHED");

  if (!finished.length) return null;

  return finished.reduce((latest, current) => {
    return parseDateObj(current.date) > parseDateObj(latest.date)
      ? current
      : latest;
  });
};
