import { Career } from "../../interfaces/Career";
import { Players } from "../../interfaces/playersInfo/players";
import { formatDisplayValue, parseValue } from "../../utils/FormatValue";
import { Contract } from "../../interfaces/playersInfo/contract";
import { Positions } from "../../types/Positions";
import { brasilDatePlaceholderShort, parseBrasilDate } from "../../utils/Date";
import { ClubData } from "../../interfaces/club/clubData";
import { getSeasonDateRange } from "../../utils/GetSeasonDateRange";
import { SquadRole, ContractDetails, validateContractDetails } from "../../interfaces/playersInfo/contractClauses";
import { TransferTiming } from "../../interfaces/playersInfo/transferTerms";
import { leaguesByContinent } from "../../utils/league";
import { calculateContractYears } from "../../utils/calculateContractYears";
import { calculatePlayerAge } from "../../utils/calculatePlayerAge";

export const mapPlayerToFormValues = (
  player: Players,
  currency: string = "EUR",
  seasonYear?: number,
  career?: Career,
  season?: ClubData,
) => {
  const latestContract =
    player.contract?.[player.contract.length - 1] || player.contract?.[0];
  const isIncomingLoan = !!(
    latestContract?.isLoan && !latestContract?.leftClub
  );

  const displaySalary =
    isIncomingLoan && latestContract?.fullSalary
      ? formatDisplayValue(latestContract.fullSalary, currency)
      : player.salary !== undefined && player.salary > 0
      ? formatDisplayValue(player.salary, currency)
      : "";

  const contractDetails = player.contractDetails || latestContract?.contractDetails;

  let birthDate = player.birthDate || "";
  if (!birthDate && player.age && player.age > 0 && seasonYear) {
    const estimatedYear = seasonYear - player.age;
    birthDate = `01/01/${estimatedYear}`;
  }

  let contractUntil = player.contractUntil || "";
  if (!contractUntil && player.contractTime && player.contractTime > 0 && career?.createdAt) {
    const { startDate } = getSeasonDateRange(
      season?.seasonNumber || 1,
      new Date(career.createdAt),
      career.nation || "",
    );
    const startYear = startDate.getFullYear();
    const endYear = startYear + player.contractTime;
    const isEuropean = Object.keys(leaguesByContinent.Europa).includes(
      career.nation || "",
    );
    contractUntil = isEuropean ? `31/07/${endYear}` : `31/12/${endYear}`;
  }

  const dynamicAge = birthDate
    ? calculatePlayerAge(
        birthDate,
        career?.createdAt,
        season?.seasonNumber || 1,
        career?.nation,
        season?.matches,
      )
    : 0;

  const formValues = {
    playerName: player.name || "",
    overall:
      player.overall && player.overall > 0 ? player.overall.toString() : "",
    potential:
      player.potential && player.potential > 0
        ? player.potential.toString()
        : "",
    sector: player.sector || "",
    position: (player.position as string) || "",
    age:
      dynamicAge > 0
        ? dynamicAge.toString()
        : player.age && player.age > 0
        ? player.age.toString()
        : "",
    birthDate,
    height: player.height || "",
    weight: player.weight || "",
    captainRank:
      player.captainRank !== undefined ? player.captainRank.toString() : "",
    nation: player.nation || "",
    shirtNumber: player.shirtNumber || "",
    playerValue:
      player.playerValue !== undefined && player.playerValue > 0
        ? formatDisplayValue(player.playerValue, currency)
        : "",
    contractTime: isIncomingLoan
      ? latestContract?.loanDuration?.toString() ||
        player.contractTime?.toString() ||
        ""
      : player.contractTime !== undefined && player.contractTime > 0
      ? player.contractTime.toString()
      : "",
    contractUntil,
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
    squadRole: player.squadRole || contractDetails?.squadRole || "",
    signingBonus:
      contractDetails?.signingBonus !== undefined
        ? formatDisplayValue(contractDetails.signingBonus, currency)
        : "",
    agentFee:
      contractDetails?.agentFee !== undefined
        ? formatDisplayValue(contractDetails.agentFee, currency)
        : "",
    releaseClause:
      contractDetails?.releaseClause !== undefined
        ? formatDisplayValue(contractDetails.releaseClause, currency)
        : "",
    timing: latestContract?.timing || "",
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

  const squadRoleRaw = (formData.get("squadRole") as string | null) || "";
  const signingBonusRaw = (formData.get("signingBonus") as string | null) || "";
  const agentFeeRaw = (formData.get("agentFee") as string | null) || "";
  const releaseClauseRaw = (formData.get("releaseClause") as string | null) || "";
  const isRenewalRaw = formData.get("isRenewal");
  const isRenewal = isRenewalRaw !== null ? isRenewalRaw === "true" : false;
  const timingRaw = (formData.get("timing") as string | null) || "";

  const wageAdjPctRaw = formData.get("wageAdjustmentPercentage") as string | null;
  const wageAdjBasisRaw = formData.get("wageAdjustmentBasis") as string | null;
  const wageAdjObjRaw = formData.get("wageAdjustmentObjective") as string | null;

  const playerValueRaw = (formData.get("playerValue") as string | null)?.trim() || "";
  const salaryRaw = (formData.get("salary") as string | null)?.trim() || "";
  const contractUntilRaw = (formData.get("contractUntil") as string | null)?.trim() || "";
  const contractTimeRaw = (formData.get("contractTime") as string | null)?.trim() || "";

  const hasSalaryInput = formData.get("salary") !== null;
  const hasPlayerValueInput = formData.get("playerValue") !== null;
  const hasContractUntilInput = formData.get("contractUntil") !== null;
  const hasContractTimeInput = formData.get("contractTime") !== null;

  let parsedPlayerValue: number | undefined;
  if (playerValueRaw) {
    parsedPlayerValue = parseValue(playerValueRaw);
  } else if (!hasPlayerValueInput) {
    parsedPlayerValue = player?.playerValue;
  } else {
    parsedPlayerValue = undefined;
  }

  const wagePercentage = Number(wagePercentageRaw) || 100;
  let finalSalary: number | undefined;
  let rawSalary = 0;
  if (salaryRaw) {
    rawSalary = parseValue(salaryRaw);
    finalSalary =
      !player && isIncomingLoan
        ? rawSalary * (wagePercentage / 100)
        : rawSalary;
  } else if (!hasSalaryInput) {
    finalSalary = player?.salary;
    rawSalary = player?.salary || 0;
  } else {
    finalSalary = undefined;
    rawSalary = 0;
  }

  let parsedDuration: number | undefined;
  let finalContractUntil: string | undefined;

  if (contractUntilRaw) {
    finalContractUntil = contractUntilRaw;
    const calculatedDuration = calculateContractYears(
      contractUntilRaw,
      career.createdAt,
      season.seasonNumber,
      career.nation,
    );
    parsedDuration =
      calculatedDuration > 0
        ? calculatedDuration
        : Number(contractTimeRaw) || undefined;
  } else if (contractTimeRaw) {
    parsedDuration = Number(contractTimeRaw) || undefined;
    finalContractUntil = undefined;
  } else if (!player && isIncomingLoan && loanDurationRaw) {
    parsedDuration = Number(loanDurationRaw) || undefined;
    finalContractUntil = undefined;
  } else if (!hasContractUntilInput && !hasContractTimeInput) {
    parsedDuration = player?.contractTime;
    finalContractUntil = player?.contractUntil;
  } else {
    parsedDuration = undefined;
    finalContractUntil = undefined;
  }

  const parsedAgentFee = agentFeeRaw ? parseValue(agentFeeRaw) : undefined;
  if (isRenewal && parsedAgentFee && parsedAgentFee > 0) {
    throw new Error("Taxa de agência não é permitida em renovações contratuais.");
  }

  const squadRole = (squadRoleRaw as SquadRole) || player?.squadRole;

  let contractDetails: ContractDetails | undefined = player?.contractDetails
    ? { ...player.contractDetails }
    : undefined;
  if (squadRole || signingBonusRaw || agentFeeRaw || releaseClauseRaw || wageAdjPctRaw) {
    const signingBonus = signingBonusRaw ? parseValue(signingBonusRaw) : undefined;
    const releaseClause = releaseClauseRaw ? parseValue(releaseClauseRaw) : undefined;
    const wageAdjustment =
      wageAdjPctRaw && Number(wageAdjPctRaw) > 0
        ? {
            enabled: true,
            percentage: Number(wageAdjPctRaw),
            competitionBasis: (wageAdjBasisRaw as "league" | "cup") || "league",
            targetObjective: wageAdjObjRaw || "",
          }
        : undefined;

    const updatedContractDetails: ContractDetails = {
      ...(contractDetails || {}),
      weeklyWage: finalSalary ?? 0,
      durationYears: parsedDuration ?? 1,
      squadRole: (squadRole as SquadRole) || "Rodízio",
      ...(isRenewal ? { isRenewal: true } : {}),
      ...(signingBonus !== undefined ? { signingBonus } : {}),
      ...(!isRenewal && parsedAgentFee !== undefined ? { agentFee: parsedAgentFee } : {}),
      ...(releaseClause !== undefined ? { releaseClause } : {}),
      ...(wageAdjustment ? { wageAdjustment } : {}),
    };
    if (signingBonus === undefined) delete updatedContractDetails.signingBonus;
    if (isRenewal || parsedAgentFee === undefined) delete updatedContractDetails.agentFee;
    if (releaseClause === undefined) delete updatedContractDetails.releaseClause;
    if (!wageAdjustment) delete updatedContractDetails.wageAdjustment;
    if (!isRenewal) delete updatedContractDetails.isRenewal;

    validateContractDetails(updatedContractDetails);
    contractDetails = updatedContractDetails;
  }

  const { startDate, endDate } = getSeasonDateRange(
    season.seasonNumber,
    career.createdAt,
    career.nation,
  );

  const newContract: Contract[] = [];

  if (
    !player &&
    (isSigning ||
      isIncomingLoan ||
      buyValueRaw ||
      fromClubRaw ||
      dateArrivalRaw)
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

    const contractItem: Contract = {
      buyValue: isSigning ? parseValue(buyValueRaw) : 0,
      fromClub: fromClubRaw,
      sellValue: 0,
      leftClub: "",
      dataArrival: dataArrival,
      dataExit: null,
      ...(timingRaw ? { timing: timingRaw as TransferTiming } : {}),
      ...(contractDetails ? { contractDetails } : {}),
      ...(isIncomingLoan && {
        isLoan: true,
        loanDuration: Number(loanDurationRaw) || 0,
        wagePercentage: wagePercentage,
        fullSalary: rawSalary,
      }),
    };
    newContract.push(contractItem);
  }

  const playedWithUsRaw = formData.get("playedWithUs");
  const playedWithUs =
    playedWithUsRaw !== null
      ? (playedWithUsRaw as string).trim()
      : (player?.playedWithUs || "");

  const birthDateRaw = (formData.get("birthDate") as string) || "";
  const potentialRaw = formData.get("potential");
  const heightRaw = (formData.get("height") as string) || "";
  const weightRaw = (formData.get("weight") as string) || "";
  const captainRankRaw = formData.get("captainRank");

  const calculatedAge = calculatePlayerAge(
    birthDateRaw,
    career.createdAt,
    season.seasonNumber,
    career.nation,
    season.matches,
  );
  const finalAge =
    calculatedAge > 0
      ? calculatedAge
      : Number(formData.get("age")) || player?.age || 0;

  return {
    name: (formData.get("playerName") as string) || "",
    overall: Number(formData.get("overall")) || 0,
    sector: (formData.get("sector") as string) || "",
    position: formData.get("position") as keyof Positions,
    age: finalAge,
    nation: (formData.get("nation") as string) || "",
    shirtNumber: (formData.get("shirtNumber") as string) || "",
    ...(parsedPlayerValue !== undefined ? { playerValue: parsedPlayerValue } : {}),
    ...(parsedDuration !== undefined ? { contractTime: parsedDuration } : {}),
    ...(finalContractUntil !== undefined ? { contractUntil: finalContractUntil } : {}),
    ...(finalSalary !== undefined ? { salary: finalSalary } : {}),
    buy: player ? player.buy : isSigning,
    captain: (formData.get("isCaptain") as string) === "true",
    ...(potentialRaw !== null && potentialRaw !== ""
      ? { potential: Number(potentialRaw) }
      : player?.potential !== undefined
      ? { potential: player.potential }
      : {}),
    ...(birthDateRaw
      ? { birthDate: birthDateRaw.trim() }
      : player?.birthDate
      ? { birthDate: player.birthDate }
      : {}),
    ...(heightRaw
      ? { height: heightRaw.trim() }
      : player?.height
      ? { height: player.height }
      : {}),
    ...(weightRaw
      ? { weight: weightRaw.trim() }
      : player?.weight
      ? { weight: player.weight }
      : {}),
    ...(captainRankRaw !== null && captainRankRaw !== ""
      ? { captainRank: Number(captainRankRaw) }
      : player?.captainRank !== undefined
      ? { captainRank: player.captainRank }
      : {}),
    sell: player ? player.sell : false,
    loan: player ? player.loan : false,
    incomingLoan: player ? player.incomingLoan : isIncomingLoan,
    ballonDor: player?.ballonDor ?? 0,
    statsLeagues: player?.statsLeagues ?? [],
    ...(player?.manualStatsLeagues
      ? { manualStatsLeagues: player.manualStatsLeagues }
      : {}),
    ...(player
      ? { playedWithUs }
      : (playedWithUs ? { playedWithUs } : {})),
    ...(squadRole ? { squadRole } : {}),
    ...(contractDetails ? { contractDetails } : {}),
    ...(!player && newContract.length > 0 && { contract: newContract }),
  };
};

