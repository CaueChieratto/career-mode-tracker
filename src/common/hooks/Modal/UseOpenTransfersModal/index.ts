import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Career } from "../../../interfaces/Career";
import { ClubData } from "../../../interfaces/club/clubData";
import { Players } from "../../../interfaces/playersInfo/players";
import { getSeasonDateRange } from "../../../utils/GetSeasonDateRange";
import { isContractInSeasonRange } from "../../../services/ServicePlayers/helpers/transferTimingHelpers";
import { TransferProposal } from "../../../interfaces/proposals/transferProposal";
import { ServiceProposals } from "../../../services/ServiceProposals";

type TransferType = "arrivals" | "exit";

export const useOpenTransfersModal = (career?: Career, season?: ClubData) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferType, setTransferType] = useState<TransferType>("arrivals");
  const [playersToShow, setPlayersToShow] = useState<Players[]>([]);
  const [proposals, setProposals] = useState<TransferProposal[]>([]);
  const location = useLocation();
  const isGeralPage = location.pathname.includes("/Geral");

  const filterTransfers = useCallback(
    (type: TransferType) => {
      if (!season || !career) return [];

      if (isGeralPage) {
        const allPlayers = career.clubData.flatMap((s) => s.players || []);

        const uniquePlayers = Array.from(
          new Map(allPlayers.map((p) => [p.id, p])).values(),
        );

        const isArrivalContract = (
          c: NonNullable<Players["contract"]>[number],
        ) =>
          Boolean(c.fromClub) ||
          Boolean(
            c.leftClub && !c.isLoan && c.transferClauses?.loanBackDuration,
          );

        if (type === "arrivals") {
          return uniquePlayers
            .filter((p) => p.contract?.some((c) => isArrivalContract(c)))
            .map((p) => ({
              ...p,
              fullContractHistory: p.contract,
              contract: p.contract.filter((c) => isArrivalContract(c)),
            }));
        } else {
          return uniquePlayers
            .filter((p) => p.contract?.some((c) => Boolean(c.leftClub)))
            .map((p) => ({
              ...p,
              fullContractHistory: p.contract,
              contract: p.contract.filter((c) => Boolean(c.leftClub)),
            }));
        }
      } else {
        const seasonRange = getSeasonDateRange(
          season.seasonNumber,
          career.createdAt,
          career.nation,
        );

        const isArrivalContract = (
          c: NonNullable<Players["contract"]>[number],
        ) =>
          Boolean(c.fromClub) ||
          Boolean(
            c.leftClub && !c.isLoan && c.transferClauses?.loanBackDuration,
          );

        if (type === "arrivals") {
          return (season.players || [])
            .filter((p) =>
              p.contract?.some(
                (c) =>
                  isArrivalContract(c) &&
                  isContractInSeasonRange(c, "arrivals", seasonRange),
              ),
            )
            .map((p) => ({
              ...p,
              fullContractHistory: p.contract,
              contract: p.contract.filter(
                (c) =>
                  isArrivalContract(c) &&
                  isContractInSeasonRange(c, "arrivals", seasonRange),
              ),
            }));
        } else {
          return (season.players || [])
            .filter((p) =>
              p.contract?.some(
                (c) =>
                  Boolean(c.leftClub) &&
                  isContractInSeasonRange(c, "exit", seasonRange),
              ),
            )
            .map((p) => ({
              ...p,
              fullContractHistory: p.contract,
              contract: p.contract.filter(
                (c) =>
                  Boolean(c.leftClub) &&
                  isContractInSeasonRange(c, "exit", seasonRange),
              ),
            }));
        }
      }
    },
    [career, season, isGeralPage],
  );

  useEffect(() => {
    if (isModalOpen && career && season) {
      setPlayersToShow(filterTransfers(transferType));
    }
  }, [career, season, isModalOpen, transferType, filterTransfers]);

  // Listener em tempo real das propostas da temporada ativa
  useEffect(() => {
    if (!isModalOpen || !career?.id || !season?.id || isGeralPage) {
      setProposals([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = ServiceProposals.listenProposals(
        career.id,
        season.id,
        (fetched) => {
          setProposals(fetched);
        },
        (error) => {
          console.warn("Não foi possível carregar propostas:", error);
        },
      );
    } catch (err) {
      console.warn("Erro ao iniciar listener de propostas:", err);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isModalOpen, career?.id, season?.id, isGeralPage]);

  const proposalsArrivals = useMemo(
    () =>
      proposals.filter(
        (p) =>
          (p.type === "compra" || p.type === "emprestimo_entrada") &&
          p.overallStatus !== "concluida",
      ),
    [proposals],
  );

  const proposalsExits = useMemo(
    () =>
      proposals.filter(
        (p) =>
          (p.type === "venda" || p.type === "emprestimo_saida") &&
          p.overallStatus !== "concluida",
      ),
    [proposals],
  );

  const proposalsRenewals = useMemo(
    () =>
      proposals.filter(
        (p) => p.type === "renovacao" && p.overallStatus !== "concluida",
      ),
    [proposals],
  );

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
    proposals,
    proposalsArrivals,
    proposalsExits,
    proposalsRenewals,
  };
};
