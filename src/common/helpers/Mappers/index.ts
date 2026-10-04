import { Career } from "../../interfaces/Career";
import { Players } from "../../interfaces/playersInfo/players";
import { formatDisplayValue, parseValue } from "../../utils/FormatValue";
import { Contract } from "../../interfaces/playersInfo/contract";
import { Positions } from "../../types/Positions";
import { brasilDatePlaceholderShort, parseBrasilDate } from "../../utils/Date";
import { ClubData } from "../../interfaces/club/clubData";
import { getSeasonDateRange } from "../../utils/GetSeasonDateRange";

export const mapPlayerToFormValues = (
  player: Players,
  currency: string = "EUR",
) => {
  const latestContract =
    player.contract?.[player.contract.length - 1] || player.contract?.[0];
  const isIncomingLoan = !!(
    latestContract?.isLoan && !latestContract?.leftClub
  );

  const displaySalary =
    isIncomingLoan && latestContract?.fullSalary
      ? formatDisplayValue(latestContract.fullSalary, currency)
      : formatDisplayValue(player.salary, currency);

  const formValues = {
    playerName: player.name || "",
    overall: player.overall?.toString() || "",
    sector: player.sector || "",
    position: (player.position as string) || "",
    age: player.age?.toString() || "",
    nation: player.nation || "",
    shirtNumber: player.shirtNumber || "",
    playerValue: formatDisplayValue(player.playerValue, currency),
    contractTime: isIncomingLoan
      ? latestContract?.loanDuration?.toString() ||
        player.contractTime?.toString() ||
        ""
      : player.contractTime?.toString() || "",
    salary: displaySalary,
    fromClub: latestContract?.fromClub || "",
    buyValue:
      player.buy && latestContract?.buyValue
        ? formatDisplayValue(latestContract.buyValue as number, currency)
        : "",
    dateArrival: latestContract?.dataArrival
      ? brasilDatePlaceholderShort(new Date(latestContract.dataArrival))
      : "",
    loanDuration: latestContract?.loanDuration?.toString() || "",
    wagePercentage: latestContract?.wagePercentage?.toString() || "",
    playedWithUs: player.playedWithUs || "",
  };

  return formValues;
};

export const mapFormDataToPlayerData = (
  formData: FormData,
  career: Career,
  season: ClubData,
  player?: Players,
): Partial<Players> => {
  const formIsSigning = formData.get("isSigning");
  const formIsLoan = formData.get("isLoan");

  const isSigning =
    formIsSigning !== null ? formIsSigning === "true" : !!player?.buy;
  const isIncomingLoan =
    formIsLoan !== null ? formIsLoan === "true" : !!player?.incomingLoan;

  const buyValueRaw = (formData.get("buyValue") as string) || "";
  const fromClubRaw = (formData.get("fromClub") as string) || "";
  const dateArrivalRaw = (formData.get("dateArrival") as string) || "";
  const loanDurationRaw = (formData.get("loanDuration") as string) || "";
  const wagePercentageRaw = (formData.get("wagePercentage") as string) || "";

  const rawSalary = parseValue((formData.get("salary") as string) || "0");
  const wagePercentage = Number(wagePercentageRaw) || 100;
  const finalSalary = isIncomingLoan
    ? rawSalary * (wagePercentage / 100)
    : rawSalary;

  const { startDate, endDate } = getSeasonDateRange(
    season.seasonNumber,
    career.createdAt,
    career.nation,
  );

  const newContract: Contract[] = [];

  if (
    isSigning ||
    isIncomingLoan ||
    buyValueRaw ||
    fromClubRaw ||
    dateArrivalRaw
  ) {
    let dataArrival: Date | null = null;

    if (dateArrivalRaw && dateArrivalRaw.includes("/")) {
      const parts = dateArrivalRaw.split("/");
      const month = parts.length > 1 ? Number(parts[1]) - 1 : 0;

      const arrivalYear =
        month < startDate.getMonth()
          ? endDate.getFullYear()
          : startDate.getFullYear();

      dataArrival = parseBrasilDate(dateArrivalRaw, arrivalYear);
    }

    newContract.push({
      buyValue: isSigning ? parseValue(buyValueRaw) : 0,
      fromClub: fromClubRaw,
      sellValue: 0,
      leftClub: "",
      dataArrival: dataArrival,
      dataExit: null,
      ...(isIncomingLoan && {
        isLoan: true,
        loanDuration: Number(loanDurationRaw) || 0,
        wagePercentage: wagePercentage,
        fullSalary: rawSalary,
      }),
    });
  }

  const playedWithUsRaw = formData.get("playedWithUs");
  const playedWithUs =
    playedWithUsRaw !== null
      ? (playedWithUsRaw as string).trim() || undefined
      : player?.playedWithUs;

  return {
    name: (formData.get("playerName") as string) || "",
    overall: Number(formData.get("overall")) || 0,
    sector: (formData.get("sector") as string) || "",
    position: formData.get("position") as keyof Positions,
    age: Number(formData.get("age")) || 0,
    nation: (formData.get("nation") as string) || "",
    shirtNumber: (formData.get("shirtNumber") as string) || "",
    playerValue: parseValue((formData.get("playerValue") as string) || "0"),
    contractTime: isIncomingLoan
      ? Number(loanDurationRaw) || 0
      : Number(formData.get("contractTime")) || 0,
    salary: finalSalary,
    buy: isSigning,
    captain: (formData.get("isCaptain") as string) === "true",
    sell: false,
    loan: false,
    incomingLoan: isIncomingLoan,
    ballonDor: player?.ballonDor ?? 0,
    statsLeagues: player?.statsLeagues ?? [],
    ...(player?.manualStatsLeagues
      ? { manualStatsLeagues: player.manualStatsLeagues }
      : {}),
    ...(playedWithUs ? { playedWithUs } : {}),
    ...(newContract.length > 0 && { contract: newContract }),
  };
};
