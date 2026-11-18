import { getSeasonDateRange } from "./GetSeasonDateRange";
import { leaguesByContinent } from "./league";

export const calculateContractYears = (
  contractUntil?: string | null,
  careerCreatedAt?: Date | string | null,
  seasonNumber: number = 1,
  careerNation: string = "",
): number => {
  if (!contractUntil || typeof contractUntil !== "string" || !contractUntil.includes("/")) {
    return 0;
  }

  const parts = contractUntil.trim().split("/");
  if (parts.length !== 3) return 0;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  let year = Number(parts[2]);

  if (
    isNaN(day) ||
    isNaN(month) ||
    isNaN(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return 0;
  }

  if (parts[2].trim().length === 2) {
    year += 2000;
  }

  if (year < 1900 || year > 2100) return 0;

  const createdAtDate = careerCreatedAt ? new Date(careerCreatedAt) : new Date();
  if (isNaN(createdAtDate.getTime())) return 0;

  const { startDate } = getSeasonDateRange(
    Math.max(1, seasonNumber),
    createdAtDate,
    careerNation,
  );

  const seasonStartYear = startDate.getFullYear();
  return Math.max(0, year - seasonStartYear);
};

export const calculateContractUntilFromYears = (
  years: number,
  careerCreatedAt?: Date | string | null,
  seasonNumber: number = 1,
  careerNation: string = "",
): string => {
  if (!years || years <= 0) return "";

  const createdAtDate = careerCreatedAt ? new Date(careerCreatedAt) : new Date();
  if (isNaN(createdAtDate.getTime())) return "";

  const { startDate } = getSeasonDateRange(
    Math.max(1, seasonNumber),
    createdAtDate,
    careerNation,
  );

  const startYear = startDate.getFullYear();
  const endYear = startYear + years;
  const isEuropean = Object.keys(leaguesByContinent.Europa).includes(careerNation);
  return isEuropean ? `31/07/${endYear}` : `31/12/${endYear}`;
};

export const getPlayerOriginalContractYears = (
  player?: {
    contractTime?: number;
    contractUntil?: string | null;
    contractDetails?: {
      durationYears?: number;
    };
    contract?: Array<{
      previousContractTime?: number;
      previousContractUntil?: string | null;
      contractTime?: number;
      contractUntil?: string | null;
    }>;
  } | null,
  careerCreatedAt?: Date | string | null,
  seasonNumber: number = 1,
  careerNation: string = "",
  contractIndex?: number,
): number => {
  if (!player) return 0;
  if (typeof contractIndex === "number" && player.contract && player.contract[contractIndex]) {
    const currentContract = player.contract[contractIndex];
    if (typeof currentContract.previousContractTime === "number") {
      return currentContract.previousContractTime;
    }
    if (
      contractIndex > 0 &&
      typeof player.contract[contractIndex - 1]?.contractTime === "number"
    ) {
      return player.contract[contractIndex - 1].contractTime!;
    }
    if (currentContract.previousContractUntil) {
      return calculateContractYears(
        currentContract.previousContractUntil,
        careerCreatedAt,
        seasonNumber,
        careerNation,
      );
    }
    if (contractIndex > 0 && player.contract[contractIndex - 1]?.contractUntil) {
      return calculateContractYears(
        player.contract[contractIndex - 1].contractUntil,
        careerCreatedAt,
        seasonNumber,
        careerNation,
      );
    }
    return 0;
  }
  if (typeof player.contractTime === "number" && player.contractTime > 0) {
    return player.contractTime;
  }
  const latestContract =
    player.contract && player.contract.length > 0
      ? player.contract[player.contract.length - 1]
      : undefined;
  if (
    typeof latestContract?.contractTime === "number" &&
    latestContract.contractTime > 0
  ) {
    return latestContract.contractTime;
  }
  if (
    typeof player.contractDetails?.durationYears === "number" &&
    player.contractDetails.durationYears > 0
  ) {
    return player.contractDetails.durationYears;
  }
  if (player.contractUntil) {
    return calculateContractYears(
      player.contractUntil,
      careerCreatedAt,
      seasonNumber,
      careerNation,
    );
  }
  if (latestContract?.contractUntil) {
    return calculateContractYears(
      latestContract.contractUntil,
      careerCreatedAt,
      seasonNumber,
      careerNation,
    );
  }
  return 0;
};


