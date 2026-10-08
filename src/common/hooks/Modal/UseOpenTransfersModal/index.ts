import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Career } from "../../../interfaces/Career";
import { ClubData } from "../../../interfaces/club/clubData";
import { Players } from "../../../interfaces/playersInfo/players";
import { getSeasonDateRange } from "../../../utils/GetSeasonDateRange";

type TransferType = "arrivals" | "exit";

export const useOpenTransfersModal = (career?: Career, season?: ClubData) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferType, setTransferType] = useState<TransferType>("arrivals");
  const [playersToShow, setPlayersToShow] = useState<Players[]>([]);
  const location = useLocation();

  useEffect(() => {
    if (isModalOpen && career && season) {
      setPlayersToShow(filterTransfers(transferType));
    }
  }, [career, season, isModalOpen, transferType]);

  const filterTransfers = (type: TransferType) => {
    if (!season || !career) return [];

    const isGeralPage = location.pathname.includes("/Geral");

    if (isGeralPage) {
      const allPlayers = career.clubData.flatMap((s) => s.players || []);

      const uniquePlayers = Array.from(
        new Map(allPlayers.map((p) => [p.id, p])).values(),
      );

      if (type === "arrivals") {
        return uniquePlayers
          .filter((p) => p.contract?.some((c) => c.fromClub))
          .map((p) => ({
            ...p,
            fullContractHistory: p.contract,
            contract: p.contract.filter((c) => c.fromClub),
          }));
      } else {
        return uniquePlayers
          .filter((p) => p.contract?.some((c) => c.leftClub))
          .map((p) => ({
            ...p,
            fullContractHistory: p.contract,
            contract: p.contract.filter((c) => c.leftClub),
          }));
      }
    } else {
      const { startDate, endDate } = getSeasonDateRange(
        season.seasonNumber,
        career.createdAt,
        career.nation,
      );

      if (type === "arrivals") {
        return (season.players || [])
          .filter((p) => {
            return p.contract?.some((c) => {
              if (!c.fromClub) return false;
              const arrivalDate = c.dataArrival || career.createdAt;
              return (
                new Date(arrivalDate) >= startDate &&
                new Date(arrivalDate) <= endDate
              );
            });
          })
          .map((p) => ({
            ...p,
            fullContractHistory: p.contract,
            contract: p.contract.filter((c) => {
              if (!c.fromClub) return false;
              const arrivalDate = c.dataArrival || career.createdAt;
              return (
                new Date(arrivalDate) >= startDate &&
                new Date(arrivalDate) <= endDate
              );
            }),
          }));
      } else {
        return (season.players || [])
          .filter((p) => {
            return p.contract?.some((c) => {
              if (!c.leftClub) return false;
              const exitDate = c.dataExit || career.createdAt;
              return (
                new Date(exitDate) >= startDate && new Date(exitDate) <= endDate
              );
            });
          })
          .map((p) => ({
            ...p,
            fullContractHistory: p.contract,
            contract: p.contract.filter((c) => {
              if (!c.leftClub) return false;
              const exitDate = c.dataExit || career.createdAt;
              return (
                new Date(exitDate) >= startDate && new Date(exitDate) <= endDate
              );
            }),
          }));
      }
    }
  };

  const handleOpenTransfers = (type: TransferType) => {
    if (!season || !career) return;
    setPlayersToShow(filterTransfers(type));
    setTransferType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return {
    isModalOpen,
    transferType,
    playersToShow,
    handleOpenTransfers,
    handleCloseModal,
  };
};
