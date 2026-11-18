import React, { useState, useEffect } from "react";
import {
  FaBuilding,
  FaUserCheck,
  FaTrash,
  FaCheck,
  FaArrowLeft,
  FaPercentage,
  FaExchangeAlt,
  FaTrophy,
  FaHandshake,
  FaEdit,
  FaCoins,
  FaBriefcase,
  FaShieldAlt,
  FaChartLine,
  FaClock,
} from "react-icons/fa";
import { SectionScreen } from "../../../../../../../config/screens";
import { TransferProposal } from "../../../../../../../../../common/interfaces/proposals/transferProposal";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import ProposalBadge from "../../../../../../../../../components/ProposalBadge";
import { PlayerInfo } from "../../../../../../../../../components/PlayerInfo";
import {
  formatCompactNumber,
  formatDisplayValue,
  getCurrencySymbol,
} from "../../../../../../../../../common/utils/FormatValue";
import { getPlayerOriginalContractYears } from "../../../../../../../../../common/utils/calculateContractYears";
import { canEditTransferProposal } from "../../../../../../../../../common/helpers/transferEditability";
import Styles from "./ProposalClauseCard.module.css";

export interface ProposalClauseCardProps {
  proposal: TransferProposal;
  career: Career;
  season?: ClubData;
  clubColor?: string;
  isHighlighted?: boolean;
  isDetailView?: boolean;
  onBack?: () => void;
  onEditClub?: (proposal: TransferProposal) => void;
  onEditPlayer?: (proposal: TransferProposal) => void;
  onFinalize?: (proposal: TransferProposal) => void;
  onDelete?: (proposal: TransferProposal) => void;
  onManageLoan?: (proposal: TransferProposal) => void;
  getClubBadgeUrl?: (name?: string) => string | undefined;
  onOpenScreen?: (screen: SectionScreen) => void;
}

export const ProposalClauseCard: React.FC<ProposalClauseCardProps> = ({
  proposal,
  career,
  season,
  clubColor,
  isHighlighted = false,
  isDetailView = false,
  onBack,
  onEditClub,
  onEditPlayer,
  onFinalize,
  onDelete,
  onManageLoan,
  getClubBadgeUrl,
  onOpenScreen,
}) => {
  const [badgeError, setBadgeError] = useState(false);
  const currency = getCurrencySymbol(career.currency || "€");
  const isRenewal = proposal.type === "renovacao";
  const isSale = proposal.type === "venda";
  const partnerClub = isRenewal
    ? career.clubName
    : proposal.clubNegotiation?.partnerClub ||
      proposal.formState?.formValues?.partnerClub ||
      proposal.formState?.formValues?.fromClub ||
      proposal.formState?.formValues?.toClub ||
      "-";
  const isPassesLivres =
    partnerClub?.trim().toLowerCase() === "passes livres" ||
    partnerClub?.trim().toLowerCase() === "passe livre";
  const clubBadgeUrl = isRenewal
    ? career.teamBadge || (getClubBadgeUrl ? getClubBadgeUrl(career.clubName) : undefined)
    : getClubBadgeUrl
      ? getClubBadgeUrl(partnerClub)
      : undefined;

  useEffect(() => {
    setBadgeError(false);
  }, [clubBadgeUrl]);

  const isLoan =
    proposal.type === "emprestimo_entrada" ||
    proposal.type === "emprestimo_saida";
  const isLoanFinalized = isLoan && proposal.overallStatus === "concluida";
  const feeValue =
    proposal.clubNegotiation?.transferFee ??
    proposal.clubNegotiation?.loanTerms?.buyOptionFee ??
    proposal.playerValue ??
    0;

  const clubInitials =
    partnerClub && partnerClub !== "-" && partnerClub !== "Não informado"
      ? partnerClub
          .split(" ")
          .filter(Boolean)
          .map((w) => w[0])
          .slice(0, 3)
          .join("")
          .toUpperCase()
      : isLoan
        ? "ORIG"
        : "DEST";

  const isClubAccepted = proposal.clubNegotiation?.status === "aceita";
  const isPlayerAccepted = proposal.playerNegotiation?.status === "aceita";

  const hasInstallments = Boolean(proposal.clubNegotiation?.installments);
  const hasSwap = Boolean(
    proposal.clubNegotiation?.swapPlayer &&
    proposal.clubNegotiation.swapPlayer.playerName,
  );
  const hasBonuses = Boolean(
    proposal.clubNegotiation?.bonuses &&
    proposal.clubNegotiation.bonuses.length > 0,
  );
  const hasOtherClauses = Boolean(
    proposal.clubNegotiation?.loanBackDuration ||
    proposal.clubNegotiation?.buybackValue ||
    proposal.clubNegotiation?.firstRefusal ||
    proposal.clubNegotiation?.sellOnPercentage,
  );

  // Cláusulas dos Termos do Atleta
  const playerNeg = proposal.playerNegotiation;
  const hasSigningBonus = Boolean(
    playerNeg?.signingBonus && playerNeg.signingBonus > 0,
  );
  const hasAgentFee = Boolean(playerNeg?.agentFee && playerNeg.agentFee > 0);
  const hasReleaseClause = Boolean(
    playerNeg?.releaseClause && playerNeg.releaseClause > 0,
  );
  const hasWageAdjustment = Boolean(
    playerNeg?.wageAdjustment?.enabled ||
    (playerNeg?.wageAdjustment?.direction &&
      (playerNeg.wageAdjustment.direction as string) !== "N/D"),
  );
  const hasPlayerBonuses = Boolean(
    playerNeg?.performanceBonuses && playerNeg.performanceBonuses.length > 0,
  );
  const hasPlayerDuration = Boolean(playerNeg?.durationYears);
  const hasPlayerClauses =
    hasSigningBonus ||
    hasAgentFee ||
    hasReleaseClause ||
    hasWageAdjustment ||
    hasPlayerBonuses ||
    hasPlayerDuration ||
    isRenewal;

  const rawDuration =
    proposal.formState?.formValues?.loanDuration ||
    (proposal.clubNegotiation?.loanTerms?.durationYears
      ? String(proposal.clubNegotiation.loanTerms.durationYears)
      : "1");

  const parsedDurationYears = parseInt(rawDuration, 10);
  const loanDurationStr = !isNaN(parsedDurationYears)
    ? `${parsedDurationYears} ${parsedDurationYears === 1 ? "Ano" : "Anos"}`
    : rawDuration.toLowerCase().includes("ano")
      ? rawDuration
      : `${rawDuration} Ano(s)`;

  const buyOptionFee = proposal.clubNegotiation?.loanTerms?.buyOptionFee || 0;
  const sellOnPct = proposal.clubNegotiation?.loanTerms?.sellOnPercentage || 0;
  const hasBuyOption = Boolean(
    proposal.clubNegotiation?.loanTerms?.hasBuyOption && buyOptionFee > 0,
  );

  const isEditAllowed = canEditTransferProposal({
    proposal,
    season,
    readOnly: season?.id === "geral",
    hasOpenScreen: Boolean(onOpenScreen),
  });

  const playerInSeason = season?.players?.find(
    (p) =>
      (proposal.playerId && p.id === proposal.playerId) ||
      (proposal.playerName &&
        p.name.trim().toLowerCase() ===
          proposal.playerName.trim().toLowerCase()),
  );

  const parsedFormOverall = proposal.formState?.formValues?.overall
    ? Number(proposal.formState.formValues.overall)
    : undefined;

  const resolvedOverall =
    (proposal.playerOverall && proposal.playerOverall > 0
      ? proposal.playerOverall
      : undefined) ??
    (parsedFormOverall && parsedFormOverall > 0
      ? parsedFormOverall
      : undefined) ??
    (playerInSeason?.overall && playerInSeason.overall > 0
      ? playerInSeason.overall
      : undefined);

  const originalContractYears = playerInSeason
    ? getPlayerOriginalContractYears(
        playerInSeason,
        career.createdAt,
        season?.seasonNumber,
        career.nation,
      )
    : 0;

  const rawExtensionVal = proposal.formState?.formValues?.contractTime;
  const renewalExtensionYears =
    rawExtensionVal !== undefined && rawExtensionVal !== ""
      ? parseInt(rawExtensionVal, 10)
      : playerNeg?.durationYears !== undefined
        ? Math.max(0, playerNeg.durationYears - originalContractYears)
        : 0;

  return (
    <div
      id={`proposal-card-${proposal.id}`}
      className={`${Styles.card} ${isHighlighted ? Styles.cardHighlight : ""}`}
      style={
        clubColor
          ? ({ "--club-color": clubColor } as React.CSSProperties)
          : undefined
      }
      data-testid={`proposal-clause-card-${proposal.id}`}
    >
      {/* BARRA SUPERIOR DE STATUS / BADGES DO CARD */}
      <div className={Styles.cardTopBar}>
        {isLoan ? (
          isLoanFinalized ? (
            <ProposalBadge
              status="concluida"
              label="Finalizada"
              variant="overall"
            />
          ) : (
            <ProposalBadge
              status="em_negociacao"
              label="Pendente"
              variant="overall"
            />
          )
        ) : (
          <>
            <ProposalBadge status={proposal.overallStatus} variant="overall" />
            {proposal.clubNegotiation && (
              <ProposalBadge
                status={proposal.clubNegotiation.status}
                label={`Clube: ${isClubAccepted ? "Aceito" : "Em Negociação"}`}
                variant="stage"
              />
            )}
            {proposal.playerNegotiation && (
              <ProposalBadge
                status={proposal.playerNegotiation.status}
                label={`Atleta: ${isPlayerAccepted ? "Aceito" : "Em Negociação"}`}
                variant="stage"
              />
            )}
          </>
        )}
      </div>

      {/* CABEÇALHO DO CARD COM PLAYERINFO E ÍCONE NEUTRO */}
      <div className={Styles.cardHeader}>
        <div className={Styles.cardHeaderLeft}>
          <PlayerInfo
            name={proposal.playerName}
            position={proposal.playerPosition}
            nation={proposal.playerNation}
            nickname={proposal.playerName}
            overall={resolvedOverall}
            shirtNumber={proposal.shirtNumber || playerInSeason?.shirtNumber || ""}
            age={proposal.playerAge || playerInSeason?.age || ""}
          />
        </div>
        <div className={Styles.cardHeaderRight}>
          <h3 className={Styles.headerTypeTitle}>
            {isLoan
              ? "Empréstimo"
              : proposal.type === "venda"
                ? "Venda"
                : isRenewal
                  ? "Renovação"
                  : "Compra"}
          </h3>
        </div>
      </div>

      {/* CORPO DO CARD HERO (GRID CONTENT) */}
      <div className={Styles.gridContent}>
        <div className={Styles.clubSection}>
          <div
            className={Styles.clubBadge}
            style={
              clubBadgeUrl && !badgeError
                ? { backgroundColor: "#ffffff" }
                : undefined
            }
          >
            {clubBadgeUrl && !badgeError ? (
              <img
                src={clubBadgeUrl}
                alt={partnerClub}
                className={Styles.clubBadgeImg}
                onError={() => setBadgeError(true)}
              />
            ) : (
              clubInitials
            )}
          </div>
          <div>
            <div className={Styles.clubName}>
              <span>{partnerClub}</span>
              {isEditAllowed && (
                <button
                  type="button"
                  className={Styles.btnEditClubTransfer}
                  title="Editar proposta de transferência"
                  aria-label="Editar proposta de transferência"
                  data-testid="btn-edit-proposal-transfer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isRenewal) {
                      onOpenScreen?.({
                        key: "renewPlayer",
                        playerId: proposal.playerId,
                        proposalId: proposal.id,
                        initialProposal: proposal,
                        seasonId: season?.id,
                        returnToScreen: {
                          key: "manageClauses",
                          initialTab: "renewals",
                        },
                      });
                      return;
                    }
                    const isArrival =
                      proposal.type === "compra" ||
                      proposal.type === "emprestimo_entrada";
                    if (isArrival) {
                      onOpenScreen?.({
                        key: "addTransferPlayer",
                        proposalId: proposal.id,
                        initialProposal: proposal,
                        seasonId: season?.id,
                        returnToScreen: {
                          key: "manageClauses",
                          initialTab: "arrivals",
                        },
                      });
                    } else {
                      onOpenScreen?.({
                        key: "transferPlayer",
                        playerId: proposal.playerId,
                        proposalId: proposal.id,
                        initialProposal: proposal,
                        seasonId: season?.id,
                        mode:
                          proposal.type === "emprestimo_saida"
                            ? "loan"
                            : "transfer",
                        returnToScreen: {
                          key: "manageClauses",
                          initialTab: "exit",
                        },
                      });
                    }
                  }}
                >
                  <FaEdit />
                </button>
              )}
            </div>
            <div className={Styles.transferFeeText}>
              {isRenewal
                ? "Salário Proposto: "
                : isLoan
                  ? "Duração do Empréstimo: "
                  : "Taxa de Transferência: "}
              <strong>
                {isRenewal
                  ? formatDisplayValue(
                      proposal.playerNegotiation?.weeklyWage || 0,
                      career.currency,
                    )
                  : isLoan
                    ? loanDurationStr
                    : formatDisplayValue(feeValue, career.currency)}
              </strong>
            </div>
          </div>
        </div>

        {isLoan ? (
          <div className={Styles.breakdownSection}>
            {proposal.playerNegotiation?.weeklyWage ? (
              <div className={Styles.breakdownRow}>
                <span className={Styles.breakdownLabel}>
                  <span className={`${Styles.dot} ${Styles.dotBlue}`}></span>
                  Salário semanal:
                </span>
                <span className={Styles.valueBlue}>
                  {formatDisplayValue(
                    proposal.playerNegotiation.weeklyWage,
                    career.currency,
                  )}
                </span>
              </div>
            ) : null}

            {proposal.clubNegotiation?.loanTerms?.ourWagePercentage !==
            undefined ? (
              <div className={Styles.breakdownRow}>
                <span className={Styles.breakdownLabel}>
                  <span className={`${Styles.dot} ${Styles.dotAmber}`}></span>%
                  Salário pago por nós:
                </span>
                <span className={Styles.valueAmber}>
                  {proposal.clubNegotiation.loanTerms.ourWagePercentage}%
                </span>
              </div>
            ) : null}

            {hasBuyOption && buyOptionFee > 0 ? (
              <div className={Styles.breakdownRow}>
                <span className={Styles.breakdownLabel}>
                  <span className={`${Styles.dot} ${Styles.dotGreen}`}></span>
                  Opção de compra:
                </span>
                <span className={Styles.valueWhite}>
                  {formatDisplayValue(buyOptionFee, career.currency)}
                </span>
              </div>
            ) : null}

            {hasBuyOption && sellOnPct > 0 ? (
              <div className={Styles.breakdownRow}>
                <span className={Styles.breakdownLabel}>
                  <span className={`${Styles.dot} ${Styles.dotPurple}`}></span>
                  Mais-valia futura:
                </span>
                <span className={Styles.valueWhite}>{sellOnPct}%</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className={Styles.breakdownSection}>
            <div className={Styles.stagesGrid}>
              {!isRenewal && (
                <div className={Styles.stageBox}>
                  <span className={Styles.stageLabel}>Termos do Clube</span>
                  <span className={Styles.stageValue}>
                    {proposal.clubNegotiation
                      ? `${isClubAccepted ? "Acordado" : "Em negociação"} (${currency}${formatCompactNumber(feeValue)})`
                      : "Pendente"}
                  </span>
                </div>
              )}
              {(!isSale || hasSwap) && (
                <div className={Styles.stageBox}>
                  <span className={Styles.stageLabel}>Termos do Atleta</span>
                  <span className={Styles.stageValue}>
                    {proposal.playerNegotiation?.weeklyWage
                      ? `${currency}${formatCompactNumber(proposal.playerNegotiation.weeklyWage)}/sem`
                      : "Não definido"}
                  </span>
                </div>
              )}
            </div>

            {(hasInstallments ||
              hasSwap ||
              hasBonuses ||
              hasOtherClauses ||
              hasPlayerClauses) && (
              <div className={Styles.clausesSummary}>
                {/* Termos do Clube */}
                {hasInstallments && (
                  <span className={Styles.clausePill}>
                    <FaPercentage size={10} /> Parcelado (
                    {proposal.clubNegotiation?.installments?.totalInstallments}
                    x)
                  </span>
                )}
                {hasSwap && (
                  <span className={Styles.clausePill}>
                    <FaExchangeAlt size={10} /> Troca:{" "}
                    {proposal.clubNegotiation?.swapPlayer?.playerName}
                  </span>
                )}
                {hasBonuses && (
                  <span className={Styles.clausePill}>
                    <FaTrophy size={10} />{" "}
                    {proposal.clubNegotiation?.bonuses?.length} bônus (clube)
                  </span>
                )}
                {hasOtherClauses && (
                  <span className={Styles.clausePill}>
                    <FaHandshake size={10} /> Outros Acordos
                  </span>
                )}

                {/* Termos do Atleta */}
                {isRenewal ? (
                  <span className={Styles.clausePill}>
                    <FaClock size={10} />{" "}
                    {renewalExtensionYears <= 0
                      ? "Sem extensão"
                      : `Extensão de ${renewalExtensionYears} ${
                          renewalExtensionYears === 1 ? "ano" : "anos"
                        }`}
                  </span>
                ) : (
                  hasPlayerDuration && (
                    <span className={Styles.clausePill}>
                      <FaClock size={10} /> Contrato: {playerNeg?.durationYears}{" "}
                      {playerNeg?.durationYears === 1 ? "ano" : "anos"}
                    </span>
                  )
                )}
                {hasSigningBonus && (
                  <span className={Styles.clausePill}>
                    <FaCoins size={10} /> Luvas:{" "}
                    {formatDisplayValue(
                      playerNeg!.signingBonus!,
                      career.currency,
                    )}
                  </span>
                )}
                {hasAgentFee && (
                  <span className={Styles.clausePill}>
                    <FaBriefcase size={10} /> Agência:{" "}
                    {formatDisplayValue(playerNeg!.agentFee!, career.currency)}
                  </span>
                )}
                {hasReleaseClause && (
                  <span className={Styles.clausePill}>
                    <FaShieldAlt size={10} /> Multa:{" "}
                    {formatDisplayValue(
                      playerNeg!.releaseClause!,
                      career.currency,
                    )}
                  </span>
                )}
                {hasWageAdjustment && (
                  <span className={Styles.clausePill}>
                    <FaChartLine size={10} /> Reajuste:{" "}
                    {playerNeg?.wageAdjustment?.percentage}%
                  </span>
                )}
                {hasPlayerBonuses && (
                  <span className={Styles.clausePill}>
                    <FaTrophy size={10} />{" "}
                    {playerNeg?.performanceBonuses?.length} bônus (atleta)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AÇÕES DO CARD */}
      <div className={Styles.footerActions}>
        {isDetailView ? (
          <button
            type="button"
            className={`${Styles.actionBtn} ${Styles.btnBack}`}
            onClick={onBack}
            data-testid={`btn-back-proposal-${proposal.id}`}
          >
            <FaArrowLeft /> Voltar
          </button>
        ) : isLoan ? (
          isLoanFinalized ? (
            hasBuyOption ? (
              <button
                type="button"
                className={Styles.btnManageOnly}
                style={
                  clubColor
                    ? { backgroundColor: clubColor }
                    : { backgroundColor: "#10b981" }
                }
                onClick={() => onManageLoan?.(proposal)}
                data-testid={`btn-manage-loan-${proposal.id}`}
              >
                <FaCheck /> Gerenciar Cláusulas
              </button>
            ) : null
          ) : (
            <>
              <button
                type="button"
                className={`${Styles.actionBtn} ${Styles.btnFinalize}`}
                onClick={() => onFinalize?.(proposal)}
                data-testid={`btn-finalize-proposal-${proposal.id}`}
              >
                <FaCheck /> Finalizar
              </button>

              <button
                type="button"
                className={`${Styles.actionBtn} ${Styles.btnDelete}`}
                onClick={() => onDelete?.(proposal)}
                data-testid={`btn-delete-proposal-${proposal.id}`}
              >
                <FaTrash /> Cancelar Proposta
              </button>
            </>
          )
        ) : (
          <>
            {!proposal.originLoanBuyOption && !isRenewal && !isPassesLivres && (
              <button
                type="button"
                className={`${Styles.actionBtn} ${Styles.btnClub}`}
                onClick={() => {
                  if (onEditClub) {
                    onEditClub(proposal);
                  } else {
                    onOpenScreen?.({
                      key: "proposalClubClauses",
                      proposalId: proposal.id,
                      seasonId: season?.id,
                    });
                  }
                }}
                data-testid={`btn-edit-club-proposal-${proposal.id}`}
              >
                <FaBuilding /> Cláusulas do Clube
              </button>
            )}

            {(!isSale || hasSwap) && (
              <button
                type="button"
                className={`${Styles.actionBtn} ${Styles.btnPlayer}`}
                onClick={() => onEditPlayer?.(proposal)}
                data-testid={`btn-edit-player-proposal-${proposal.id}`}
              >
                <FaUserCheck /> Termos do Atleta
              </button>
            )}

            <button
              type="button"
              className={`${Styles.actionBtn} ${Styles.btnFinalize}`}
              onClick={() => onFinalize?.(proposal)}
              data-testid={`btn-finalize-proposal-${proposal.id}`}
            >
              <FaCheck /> Finalizar Transferência
            </button>

            <button
              type="button"
              className={`${Styles.actionBtn} ${Styles.btnDelete}`}
              onClick={() => onDelete?.(proposal)}
              data-testid={`btn-delete-proposal-${proposal.id}`}
            >
              <FaTrash /> Excluir Proposta
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProposalClauseCard;
