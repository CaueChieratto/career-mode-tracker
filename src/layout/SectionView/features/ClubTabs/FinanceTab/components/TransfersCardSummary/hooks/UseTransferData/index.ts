import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { getSeasonDateRange } from "../../../../../../../../../common/utils/GetSeasonDateRange";
import { isContractInSeasonRange } from "../../../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";

const isArrivalContract = (
  c: NonNullable<Players["contract"]>[number],
) =>
  !c.isRenewal &&
  !c.contractDetails?.isRenewal &&
  (Boolean(c.fromClub) ||
    Boolean(
      c.leftClub && !c.isLoan && c.transferClauses?.loanBackDuration,
    ));

const sortPlayersByDate = (
  players: Players[],
  isArrival: boolean,
  fallbackDate: Date,
) => {
  return [...players]
    .sort((a, b) => {
      const contractA = a.contract || [];
      const contractB = b.contract || [];

      const cA =
        [...contractA]
          .reverse()
          .find((c) => (isArrival ? isArrivalContract(c) : Boolean(c.leftClub))) ||
        contractA[contractA.length - 1] ||
        {};
      const cB =
        [...contractB]
          .reverse()
          .find((c) => (isArrival ? isArrivalContract(c) : Boolean(c.leftClub))) ||
        contractB[contractB.length - 1] ||
        {};

      const dateA =
        (isArrival
          ? (cA.dataArrival || (cA.transferClauses?.loanBackDuration ? cA.dataExit : null))
          : cA.dataExit) || fallbackDate;
      const dateB =
        (isArrival
          ? (cB.dataArrival || (cB.transferClauses?.loanBackDuration ? cB.dataExit : null))
          : cB.dataExit) || fallbackDate;

      const timeA = new Date(dateA).getTime();
      const timeB = new Date(dateB).getTime();

      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    })
    .slice(0, 3);
};

export const useTransferData = (career: Career, season: ClubData) => {
  const location = useLocation();
  const isGeralPage = location.pathname.includes("/Geral");

  const arrivals = useMemo(() => {
    if (!career || !season) return [];

    if (isGeralPage) {
      const allPlayers = career.clubData.flatMap((s) => s.players || []);
      const uniquePlayers = Array.from(
        new Map(allPlayers.map((p) => [p.id, p])).values(),
      );

      const geralArrivals: Players[] = [];
      uniquePlayers.forEach((p) => {
        const validContracts = (p.contract || []).filter((c) =>
          isArrivalContract(c),
        );
        validContracts.forEach((c) => {
          geralArrivals.push({
            ...p,
            fullContractHistory: p.contract,
            contract: [c],
          });
        });
      });

      return sortPlayersByDate(geralArrivals, true, career.createdAt);
    }

    const seasonRange = getSeasonDateRange(
      season.seasonNumber,
      career.createdAt,
      career.nation,
    );

    const seasonArrivals: Players[] = [];
    (season.players || []).forEach((p) => {
      const validContracts = (p.contract || []).filter(
        (c) =>
          isArrivalContract(c) &&
          isContractInSeasonRange(c, "arrivals", seasonRange),
      );
      validContracts.forEach((c) => {
        seasonArrivals.push({
          ...p,
          fullContractHistory: p.contract,
          contract: [c],
        });
      });
    });

    return sortPlayersByDate(seasonArrivals, true, career.createdAt);
  }, [career, season, isGeralPage]);

  const departures = useMemo(() => {
    if (!career || !season) return [];

    if (isGeralPage) {
      const allPlayers = career.clubData.flatMap((s) => s.players || []);
      const uniquePlayers = Array.from(
        new Map(allPlayers.map((p) => [p.id, p])).values(),
      );

      const geralDepartures: Players[] = [];
      uniquePlayers.forEach((p) => {
        const validContracts = (p.contract || []).filter((c) =>
          Boolean(c.leftClub),
        );
        validContracts.forEach((c) => {
          geralDepartures.push({
            ...p,
            fullContractHistory: p.contract,
            contract: [c],
          });
        });
      });

      return sortPlayersByDate(geralDepartures, false, career.createdAt);
    }

    const seasonRange = getSeasonDateRange(
      season.seasonNumber,
      career.createdAt,
      career.nation,
    );

    const seasonDepartures: Players[] = [];
    (season.players || []).forEach((p) => {
      const validContracts = (p.contract || []).filter(
        (c) =>
          Boolean(c.leftClub) &&
          isContractInSeasonRange(c, "exit", seasonRange),
      );
      validContracts.forEach((c) => {
        seasonDepartures.push({
          ...p,
          fullContractHistory: p.contract,
          contract: [c],
        });
      });
    });

    return sortPlayersByDate(seasonDepartures, false, career.createdAt);
  }, [career, season, isGeralPage]);

  return { arrivals, departures };
};
