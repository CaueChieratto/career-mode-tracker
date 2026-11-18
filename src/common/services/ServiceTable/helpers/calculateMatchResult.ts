export const calculateMatchResult = (
  homeScore: number,
  awayScore: number,
  isUserHome: boolean,
  hasPenalties: boolean,
  homePen: number,
  awayPen: number,
): "V" | "E" | "D" | "?" => {
  if (homeScore === awayScore) {
    if (hasPenalties) {
      if (homePen > awayPen) return isUserHome ? "V" : "D";
      if (awayPen > homePen) return isUserHome ? "D" : "V";
    }
    return "E";
  }

  if (isUserHome) {
    return homeScore > awayScore ? "V" : "D";
  }

  return awayScore > homeScore ? "V" : "D";
};
