import { useMemo, useState } from "react";
import { FaRegCopy } from "react-icons/fa";
import { Career } from "../../../../common/interfaces/Career";
import { ClubData } from "../../../../common/interfaces/club/clubData";
import { Players } from "../../../../common/interfaces/playersInfo/players";
import {
  sortTransfersByValue,
  TransferEvent,
} from "./utils/sortTransfersByValue";
import { formatDateToLongBrazilian } from "./utils/formatDateToLongBrazilian";
import { buildTransferCopyText } from "./utils/buildTransferCopyText";
import { resolveTransferDisplayValue } from "./helpers/resolveTransferDisplayValue";
import { formatPlayerName } from "../../../../common/utils/formatPlayerName";
import { getSeasonDateRange } from "../../../../common/utils/GetSeasonDateRange";
import { isContractInSeasonRange } from "../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";
import { TransferProposal } from "../../../../common/interfaces/proposals/transferProposal";
import { SectionScreen } from "../../../../layout/SectionView/config/screens";
import { OverflowText } from "../../../OverflowText";
import { Copy } from "../../../../common/utils/Copy";
import {
  canEditTransferContract,
  canEditTransferProposal,
} from "../../../../common/helpers/transferEditability";

import Styles from "./TransfersPanel.module.css";

type TransfersPanelProps = {
  title?: string;
  transferType?: "arrivals" | "exit" | "in" | "out";
  players: Players[];
  currency?: string;
  career?: Career;
  season?: ClubData;
  onTransferClick?: (
    event: TransferEvent,
    direction: "arrivals" | "exit",
  ) => void;
  proposals?: TransferProposal[];
  onOpenScreen?: (screen: SectionScreen) => void;
};

const TransfersPanel = ({
  title = "Chegadas",
  transferType: propTransferType,
  players,
  currency,
  career,
  season,
  onTransferClick,
  proposals,
  onOpenScreen,
}: TransfersPanelProps) => {
  const direction: "arrivals" | "exit" =
    propTransferType === "in" || propTransferType === "arrivals"
      ? "arrivals"
      : propTransferType === "out" || propTransferType === "exit"
      ? "exit"
      : title === "Chegadas"
      ? "arrivals"
      : "exit";
  const isArrival = direction === "arrivals";
  const transferType = direction;
  const effectiveCurrency = currency || career?.currency || "€";
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    const copied = await Copy(text, "Transferência copiada com sucesso!");
    if (copied) {
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex((prev) => (prev === index ? null : prev));
      }, 1500);
    }
  };

  const seasonRange = useMemo(() => {
    if (!career?.createdAt || !career?.nation || !season?.seasonNumber) {
      return null;
    }
    return getSeasonDateRange(
      season.seasonNumber,
      career.createdAt,
      career.nation,
    );
  }, [career?.createdAt, career?.nation, season?.seasonNumber]);

  // Transferências Concluídas (do histórico de contratos dos atletas)
  const transferEvents = useMemo(() => {
    const events: TransferEvent[] = [];
    (players || []).forEach((player) => {
      if (!player.contract) {
        return;
      }

      player.contract.forEach((contract, contractIdx) => {
        const isLoanBackArrival =
          isArrival &&
          Boolean(
            contract.leftClub &&
            !contract.isLoan &&
            contract.transferClauses?.loanBackDuration,
          );

        const isValidForTab = isArrival
          ? Boolean(contract.dataArrival || contract.fromClub || isLoanBackArrival)
          : Boolean(contract.dataExit || contract.leftClub);

        const inSeasonCheck =
          !player.fullContractHistory && seasonRange
            ? isContractInSeasonRange(contract, transferType, seasonRange)
            : true;

        if (isValidForTab && inSeasonCheck) {
          const realIndex = player.fullContractHistory
            ? player.fullContractHistory.indexOf(contract)
            : contractIdx;
          events.push({
            player,
            contract,
            contractIndex: realIndex >= 0 ? realIndex : contractIdx,
          });
        }
      });
    });

    return events;
  }, [players, isArrival, seasonRange, transferType]);

  const relevantProposals = useMemo(() => {
    if (!proposals || proposals.length === 0) return [];
    return proposals.filter((p) => {
      if (
        p.overallStatus === "concluida" ||
        p.overallStatus === "cancelada" ||
        p.overallStatus === "rejeitada"
      ) {
        return false;
      }
      if (isArrival) {
        return p.type === "compra" || p.type === "emprestimo_entrada";
      } else {
        return p.type === "venda" || p.type === "emprestimo_saida";
      }
    });
  }, [proposals, isArrival]);

  const handleProposalClick = (proposal: TransferProposal) => {
    if (!onOpenScreen) return;
    if (isArrival) {
      onOpenScreen({
        key: "addTransferPlayer",
        proposalId: proposal.id,
        initialProposal: proposal,
        seasonId: season?.id,
      });
    } else {
      onOpenScreen({
        key: "transferPlayer",
        playerId: proposal.playerId,
        proposalId: proposal.id,
        initialProposal: proposal,
        mode: proposal.type === "emprestimo_saida" ? "loan" : "transfer",
        seasonId: season?.id,
      });
    }
  };

  const sortedEvents = sortTransfersByValue(transferEvents, transferType);

  return (
    <div className={Styles.container}>
      {sortedEvents.length === 0 && relevantProposals.length === 0 ? (
        <p className={Styles.noTransfers}>
          Nenhuma transferência nesta temporada.
        </p>
      ) : (
        <ul className={Styles.list}>
          {relevantProposals.map((proposal) => {
            const partnerClub = proposal.clubNegotiation?.partnerClub || "-";
            const isProposalClickable = canEditTransferProposal({
              proposal,
              season,
              readOnly: !onOpenScreen,
              hasOpenScreen: Boolean(onOpenScreen),
            });
            return (
              <li
                key={`proposal-${proposal.id}`}
                className={Styles.item}
                style={{ cursor: isProposalClickable ? "pointer" : "default" }}
                onClick={() => {
                  if (isProposalClickable) handleProposalClick(proposal);
                }}
                data-testid={`transfers-panel-proposal-${proposal.id}`}
              >
                <div className={Styles.playerInfo}>
                  <OverflowText
                    text={formatPlayerName(proposal.playerName)}
                    className={Styles.playerName}
                  />

                  <OverflowText
                    text={`${isArrival ? "De:" : "Para:"} ${partnerClub}`}
                    className={Styles.club}
                  />
                </div>

                <div className={Styles.transferInfo}>
                  <span
                    className={Styles.value}
                    style={{
                      color: "#f59e0b",
                      fontWeight: 600,
                    }}
                    data-testid={`transfers-panel-proposal-status-${proposal.id}`}
                  >
                    Pendente
                  </span>
                </div>
              </li>
            );
          })}
          {sortedEvents.map(
            ({ player, contract, contractIndex }, index) => {
              const isLoanBackArrival =
                isArrival &&
                Boolean(
                  contract.leftClub &&
                  !contract.isLoan &&
                  contract.transferClauses?.loanBackDuration,
                );

              const club = isArrival
                ? (contract.fromClub ||
                    (isLoanBackArrival ? contract.leftClub : ""))
                : contract.leftClub;
              const value = isArrival
                ? (isLoanBackArrival ? 0 : contract.buyValue)
                : contract.sellValue;
              const date = isArrival
                ? (contract.dataArrival ||
                    (isLoanBackArrival ? contract.dataExit : null))
                : contract.dataExit;

              const displayValue = resolveTransferDisplayValue({
                player,
                contract,
                contractIndex,
                direction,
                currency: effectiveCurrency,
                career,
                season,
                value: value as number,
                isLoanBackArrival,
              });

              const copyText = buildTransferCopyText({
                player,
                contract,
                direction,
                currency: effectiveCurrency,
                career,
                season,
              });

              const isClickable = canEditTransferContract({
                player,
                contract,
                contractIndex,
                direction,
                career,
                season,
                readOnly: !onTransferClick && !onOpenScreen,
                hasOpenScreen: Boolean(onTransferClick || onOpenScreen),
              });

              return (
                <li
                  key={`${player.id}-${date}-${index}`}
                  className={Styles.item}
                  style={{ cursor: isClickable ? "pointer" : "default" }}
                  onClick={() => {
                    if (!isClickable) return;
                    if (isArrival && onOpenScreen) {
                      onOpenScreen({
                        key: "addTransferPlayer",
                        editTransfer: {
                          player,
                          contract,
                          contractIndex: contractIndex ?? 0,
                        },
                      });
                      return;
                    }
                    if (onTransferClick) {
                      onTransferClick(
                        { player, contract, contractIndex },
                        transferType,
                      );
                      return;
                    }
                    if (onOpenScreen) {
                      onOpenScreen({
                        key: "transferPlayer",
                        playerId: player.id,
                        editTransfer: {
                          player,
                          contract,
                          contractIndex: contractIndex ?? 0,
                          direction: "exit",
                        },
                      });
                    }
                  }}
                >
                  <div className={Styles.playerInfo}>
                    <OverflowText
                      text={formatPlayerName(player.name)}
                      className={Styles.playerName}
                    />

                    <OverflowText
                      text={`${isArrival ? "De:" : "Para:"} ${
                        club || "-"
                      }`}
                      className={Styles.club}
                    />
                  </div>

                  <button
                    type="button"
                    className={Styles.copyBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(copyText, index);
                    }}
                    title="Copiar texto da transferência"
                    aria-label="Copiar transferência"
                  >
                    <FaRegCopy className={Styles.copyIcon} />
                    {copiedIndex === index && (
                      <span className={Styles.copiedFeedback}>
                        Copiado!
                      </span>
                    )}
                  </button>

                  <div className={Styles.transferInfo}>
                    {displayValue === "Saída: Proxima Temporada" ||
                    displayValue === "Saída: Proxima Janela" ||
                    displayValue === "Chegada: Proxima Temporada" ||
                    displayValue === "Chegada: Proxima Janela" ? (
                      <OverflowText
                        text={displayValue}
                        className={Styles.value}
                        widthReference={170}
                      >
                        <span
                          style={{
                            color: "var(--color-add-player)",
                            fontSize: "16px",
                          }}
                        >
                          {isArrival ? "Chegada: " : "Saída: "}
                        </span>
                        <span
                          style={{
                            color: isArrival ? "#c81419" : "#0bb32a",
                          }}
                        >
                          {displayValue.includes("Temporada")
                            ? "Proxima Temporada"
                            : "Proxima Janela"}
                        </span>
                      </OverflowText>
                    ) : (
                      <OverflowText
                        text={displayValue}
                        className={Styles.value}
                        widthReference={170}
                        style={{
                          color: isArrival ? "#c81419" : "#0bb32a",
                        }}
                      >
                        {displayValue}
                      </OverflowText>
                    )}
                    {date && (
                      <span className={Styles.date}>
                        {formatDateToLongBrazilian(date)}
                      </span>
                    )}
                  </div>
                </li>
              );
            },
          )}
        </ul>
      )}
    </div>
  );
};

export default TransfersPanel;
