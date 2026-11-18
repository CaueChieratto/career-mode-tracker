import React from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { TransferItem, ActiveInlineState } from "../../types";
import { SectionScreen } from "../../../../../../../config/screens";
import { PlayerInfo } from "../../../../../../../../../components/PlayerInfo";
import {
  parseValue,
  formatDisplayValue,
} from "../../../../../../../../../common/utils/FormatValue";
import { getContractFormattedDate } from "../../helpers/manageClausesFormatters";
import {
  isNextSeasonTiming,
  isNextWindowTiming,
  shouldPlayerLeaveOnNextWindow,
  hasRenewalActiveClauses,
} from "../../../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";
import { TransferBonus } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { canEditTransferContract } from "../../../../../../../../../common/helpers/transferEditability";
import { resolveContractPlayerClauses } from "../../../../../../../../../common/helpers/contractPlayerClauses";
import { hasDefinedLoanBuyOption } from "../../../../../../../../../common/services/ServicePlayers/helpers/contractHelpers";
import Styles from "../../ManageClauses.module.css";
import {
  FaEdit,
  FaPlus,
  FaCheck,
  FaArrowLeft,
  FaArrowRight,
  FaUndo,
  FaBuilding,
  FaUserCheck,
} from "react-icons/fa";

export interface TransferClauseCardProps {
  item: TransferItem;
  isDetailView: boolean;
  isChooseScopeView?: boolean;
  career: Career;
  season: ClubData;
  clubColor: string;
  readOnly: boolean;
  activeInline: ActiveInlineState | null;
  highlightedCardKey: string | null;
  getClubBadgeUrl: (name?: string) => string | undefined;
  startEditCard: (item: TransferItem) => void;
  startManageCard: (item: TransferItem) => void;
  onSelectClubClauses?: (item: TransferItem) => void;
  onSelectPlayerTerms?: (item: TransferItem) => void;
  cancelInline: () => void;
  handleDeleteRenewal: (item: TransferItem) => void;
  handleRevertRenewal?: (item: TransferItem) => void;
  handleRevertTransfer: (item: TransferItem) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
}

export const TransferClauseCard: React.FC<TransferClauseCardProps> = ({
  item,
  isDetailView,
  isChooseScopeView = false,
  career,
  season,
  clubColor,
  readOnly,
  highlightedCardKey,
  getClubBadgeUrl,
  startEditCard,
  startManageCard,
  onSelectClubClauses,
  onSelectPlayerTerms,
  cancelInline,
  handleDeleteRenewal,
  handleRevertRenewal,
  onOpenScreen,
}) => {
  const [badgeError, setBadgeError] = React.useState(false);

  const { player, contract, contractIndex, direction } = item;
  const cardKey = `${player.id}_${contractIndex}_${direction}`;
  const isLoanCard = Boolean(contract.isLoan);

  const partnerClub =
    direction === "renewals"
      ? career.clubName || "Não informado"
      : direction === "exit"
        ? contract.leftClub || "Não informado"
        : contract.fromClub || "Não informado";

  const clubBadgeUrl = getClubBadgeUrl(partnerClub);

  React.useEffect(() => {
    setBadgeError(false);
  }, [clubBadgeUrl]);

  const isEditAllowed = canEditTransferContract({
    player,
    contract,
    contractIndex,
    direction,
    career,
    season,
    readOnly,
    hasOpenScreen: Boolean(onOpenScreen),
  });

  const previousContract =
    contractIndex > 0 ? player.contract?.[contractIndex - 1] : undefined;

  const oldSalary =
    contract.previousSalary !== undefined
      ? Number(contract.previousSalary)
      : Number(previousContract?.salary ?? player.salary ?? 0);
  const newSalary = Number(contract.salary || player.salary || 0);

  const oldTime =
    contract.previousContractTime !== undefined
      ? contract.previousContractTime
      : (previousContract?.contractTime ?? player.contractTime ?? 1);
  const newTime = contract.contractTime || player.contractTime || 1;

  const oldUntil =
    contract.previousContractUntil ||
    previousContract?.contractUntil ||
    player.contractUntil;
  const newUntil = contract.contractUntil || player.contractUntil;

  const hasInstallments = Boolean(contract.installments);
  const hasSwap = Boolean(
    contract.swapPlayer && contract.swapPlayer.playerName,
  );
  const hasBonuses = Boolean(contract.bonuses && contract.bonuses.length > 0);
  const hasOther = Boolean(
    contract.transferClauses &&
    (contract.transferClauses.loanBackDuration ||
      contract.transferClauses.buybackValue ||
      contract.transferClauses.firstRefusal ||
      contract.transferClauses.sellOnPercentage),
  );
  const hasLoanBuyOption = hasDefinedLoanBuyOption(contract);

  const playerClauses = resolveContractPlayerClauses(contract);
  const resolvedReleaseClause =
    direction === "arrivals" || direction === "renewals"
      ? playerClauses.releaseClause
      : undefined;
  const hasReleaseClause = Boolean(
    resolvedReleaseClause && resolvedReleaseClause > 0,
  );
  const releaseClauseValue = resolvedReleaseClause || 0;

  const resolvedWageAdjustment =
    direction === "arrivals" || direction === "renewals"
      ? playerClauses.wageAdjustment
      : undefined;
  const hasWageAdjustment = Boolean(resolvedWageAdjustment);

  const isArrivalPurchase = direction === "arrivals" && !isLoanCard;
  const isPassesLivres =
    direction === "arrivals" &&
    (contract.fromClub?.trim().toLowerCase() === "passes livres" ||
      contract.fromClub?.trim().toLowerCase() === "passe livre");

  const hasClauses =
    direction === "renewals"
      ? hasBonuses ||
        hasWageAdjustment ||
        hasReleaseClause ||
        Boolean(contract.signingBonus)
      : hasInstallments ||
        hasSwap ||
        hasBonuses ||
        hasOther ||
        hasLoanBuyOption ||
        (isArrivalPurchase &&
          (hasReleaseClause ||
            hasWageAdjustment ||
            playerClauses.playerBonuses.length > 0 ||
            playerClauses.hasAnyPlayerClauses));

  const totalFee =
    direction === "exit"
      ? isLoanCard
        ? contract.buyOptionValue || contract.loanTerms?.buyOptionFee || 0
        : contract.sellValue || 0
      : Number(contract.buyValue || 0);

  const clubInitials = partnerClub
    ? partnerClub
        .split(" ")
        .filter(Boolean)
        .map((w: string) => w[0])
        .slice(0, 3)
        .join("")
        .toUpperCase()
    : direction === "exit"
      ? "DEST"
      : "ORIG";

  let installmentTotal = 0;
  let installmentYears = 2;
  let upfront = totalFee;

  if (hasInstallments && contract.installments) {
    installmentTotal =
      (contract.installments.annualInstallmentValue || 0) *
      (contract.installments.totalInstallments || 1);
    if (!installmentTotal && contract.installments.percentage) {
      installmentTotal = Math.round(
        totalFee * (contract.installments.percentage / 100),
      );
    }
    upfront =
      contract.installments.upfrontValue ??
      Math.max(0, totalFee - installmentTotal);
    installmentYears = contract.installments.totalInstallments || 2;
  }

  const bonusTotal = (contract.bonuses || []).reduce(
    (acc: number, b: TransferBonus) => acc + (b.value || 0),
    0,
  );

  const isArrivalLoan = direction === "arrivals" && isLoanCard;
  const annualLoanSalary = isArrivalLoan
    ? Math.round(Number(contract.salary || 0) * 52)
    : 0;
  const isBuyOptionExercised = Boolean(
    contract.loanTerms?.buyOptionExercised || contract.fromLoanBuyOption,
  );
  const loanBuyOptionFee =
    contract.loanTerms?.buyOptionFee ||
    (typeof contract.buyOptionValue === "number"
      ? contract.buyOptionValue
      : parseValue(String(contract.buyOptionValue || "0")));

  const maxTotal = isArrivalLoan
    ? annualLoanSalary +
      (isBuyOptionExercised ? loanBuyOptionFee : 0) +
      bonusTotal
    : totalFee + bonusTotal;

  const rawSigningBonus =
    contract.signingBonus || contract.contractDetails?.signingBonus || 0;
  const signingBonusValue =
    typeof rawSigningBonus === "number"
      ? rawSigningBonus
      : parseValue(String(rawSigningBonus));
  const guaranteedWages = newSalary * 52 * Math.max(1, newTime);
  const totalGuaranteed = guaranteedWages + signingBonusValue;
  const totalPotential = totalGuaranteed + bonusTotal;

  // Salário fixo anual (salário semanal × 52 semanas)
  const annualFixedSalary = newSalary * 52;

  // Bônus efetivamente liquidados na temporada atual (cada bônus computado uma única vez)
  const seenPaidBonusIds = new Set<string>();
  const currentSeasonPaidBonusesTotal = (contract.bonuses || []).reduce(
    (acc: number, b: TransferBonus) => {
      const isPaid =
        b.status === "paid" ||
        (b.status as string) === "Liquidado" ||
        (b.status as string) === "Liquidada" ||
        Boolean(b.paid);

      if (!isPaid) return acc;

      const bonusKey = b.id || `${b.name}_${b.value}`;
      if (seenPaidBonusIds.has(bonusKey)) return acc;
      seenPaidBonusIds.add(bonusKey);

      if (b.paidSeasonId && b.paidSeasonId !== season.id) {
        return acc;
      }
      if (
        b.paidSeasonNumber !== undefined &&
        season.seasonNumber !== undefined &&
        b.paidSeasonNumber !== season.seasonNumber
      ) {
        return acc;
      }

      return acc + (b.value || 0);
    },
    0,
  );

  // Média Anual na renovação: Salário anual fixo + bônus liquidados na temporada atual
  const averagePerSeason =
    direction === "renewals"
      ? Math.round(annualFixedSalary + currentSeasonPaidBonusesTotal)
      : Math.round(totalPotential / Math.max(1, newTime));

  const specialClausesList: string[] = [];
  if (isLoanCard) {
    if (hasLoanBuyOption) {
      specialClausesList.push("Opção de compra");
    }
    if (contract.loanTerms?.sellOnPercentage) {
      specialClausesList.push(
        `Revenda futura: ${contract.loanTerms.sellOnPercentage}%`,
      );
    }
  }
  if (contract.transferClauses?.buybackValue) {
    specialClausesList.push(
      `Recompra (${formatDisplayValue(
        contract.transferClauses.buybackValue,
        career.currency,
      )})`,
    );
  }
  if (!isLoanCard && contract.transferClauses?.sellOnPercentage) {
    specialClausesList.push(
      `Revenda futura: ${contract.transferClauses.sellOnPercentage}%`,
    );
  }
  if (contract.transferClauses?.loanBackDuration) {
    specialClausesList.push(
      `Empréstimo de volta: ${contract.transferClauses.loanBackDuration} ${
        contract.transferClauses.loanBackDuration === 1
          ? "temporada"
          : "temporadas"
      }`,
    );
  }
  if (contract.transferClauses?.firstRefusal) {
    specialClausesList.push("Direito de preferência");
  }
  if (isArrivalPurchase) {
    if (hasReleaseClause) {
      specialClausesList.push(
        `Multa rescisória (${formatDisplayValue(
          releaseClauseValue,
          career.currency,
        )})`,
      );
    }
    if (resolvedWageAdjustment) {
      specialClausesList.push(
        `Ajuste salarial: ${resolvedWageAdjustment.direction} ${resolvedWageAdjustment.percentage}%${
          resolvedWageAdjustment.targetLeague ? ` (${resolvedWageAdjustment.targetLeague})` : ""
        }${
          resolvedWageAdjustment.applied ? " (Aplicado)" : ""
        }`,
      );
    }
    if (playerClauses.playerBonuses.length > 0) {
      specialClausesList.push(
        `${playerClauses.playerBonuses.length} bônus do atleta`,
      );
    }
    if (playerClauses.agentFee && playerClauses.agentFee > 0) {
      specialClausesList.push(
        `Taxa de agência: ${formatDisplayValue(
          playerClauses.agentFee,
          career.currency,
        )}`,
      );
    }
  }

  const uniqueSpecialClausesList = Array.from(new Set(specialClausesList));

  const isNextSeasonAgreement = isNextSeasonTiming(contract.timing);
  const isNextWindowAgreement = isNextWindowTiming(contract.timing);
  const isTransitionedFromPreviousSeason = Boolean(
    contract.fromScheduledAgreement,
  );

  let hasOfficiallyDepartedOrArrived = false;
  if (isTransitionedFromPreviousSeason) {
    hasOfficiallyDepartedOrArrived = true;
  } else if (isNextSeasonAgreement) {
    hasOfficiallyDepartedOrArrived = Boolean(
      season?.seasonNumber &&
      contract.installments?.firstPaymentSeasonNumber &&
      season.seasonNumber >= contract.installments.firstPaymentSeasonNumber,
    );
  } else if (isNextWindowAgreement) {
    const dateToCheck =
      direction === "exit" ? contract.dataExit : contract.dataArrival;
    hasOfficiallyDepartedOrArrived = shouldPlayerLeaveOnNextWindow(
      season?.matches || [],
      dateToCheck,
    );
  } else {
    hasOfficiallyDepartedOrArrived = true;
  }

  const isHighlighted = highlightedCardKey === cardKey;
  const isExplicitlyNotLoan =
    Boolean(contract.fromLoanBuyOption) ||
    contract.isLoan === false ||
    (direction === "exit"
      ? Number(contract.sellValue) > 0
      : Number(contract.buyValue) > 0);
  const isLoanTransfer =
    direction === "exit"
      ? Boolean(contract.isLoan || (player.loan && !isExplicitlyNotLoan))
      : Boolean(
          contract.isLoan || (player.incomingLoan && !isExplicitlyNotLoan),
        );

  return (
    <div
      key={cardKey}
      id={`transfer-card-${cardKey}`}
      className={`${Styles.card} ${isHighlighted ? Styles.cardHighlight : ""}`}
      style={
        clubColor
          ? ({ "--club-color": clubColor } as React.CSSProperties)
          : undefined
      }
      data-testid={`transfer-card-${player.id}`}
    >
      {/* CABEÇALHO DO CARD COM IDENTIDADE DO JOGADOR ESTILO SQUAD */}
      <div className={Styles.cardHeader}>
        <div className={Styles.cardHeaderLeft}>
          <PlayerInfo
            name={player.name}
            position={player.position}
            shirtNumber={player.shirtNumber}
            age={player.age}
            nation={player.nation}
            captain={player.captain}
            nickname={player.name}
            overall={player.overall}
          />
        </div>
        <div className={Styles.cardHeaderRight}>
          <h3 className={Styles.headerTypeTitle}>
            {direction === "renewals"
              ? "Renovação"
              : isLoanTransfer
                ? "Empréstimo"
                : direction === "exit"
                  ? "Venda"
                  : "Chegada"}
          </h3>
          <div className={Styles.headerBadge}>
            <span style={{ color: "var(--color-tertiary)" }}>
              {direction === "renewals"
                ? "Contrato até: "
                : direction === "exit"
                  ? "Saída: "
                  : "Chegada: "}
            </span>
            {direction === "renewals" ? (
              <strong style={{ color: "#10b981" }}>
                {contract.contractUntil || "Não inf."}
              </strong>
            ) : hasOfficiallyDepartedOrArrived ? (
              <strong style={{ color: "#10b981" }}>Concluída</strong>
            ) : (
              <strong style={{ color: "#10b981" }}>
                {contract.timing || "Imediata"}
              </strong>
            )}
          </div>
        </div>
      </div>

      {/* CORPO DO CARD NO DESIGN HERO */}
      <div className={Styles.gridContent}>
        {direction === "renewals" ? (
          <div className={Styles.renewalComparisonSection}>
            <div className={Styles.renewalComparisonGrid}>
              <div className={Styles.comparisonRow}>
                <span className={Styles.comparisonLabel}>Salário Semanal:</span>
                <div className={Styles.comparisonValues}>
                  <span className={Styles.comparisonOld}>
                    {formatDisplayValue(oldSalary, career.currency)}
                  </span>
                  <FaArrowRight className={Styles.comparisonArrow} />
                  <span className={Styles.comparisonNew}>
                    {formatDisplayValue(newSalary, career.currency)}
                  </span>
                </div>
              </div>

              <div className={Styles.comparisonRow}>
                <span className={Styles.comparisonLabel}>
                  Duração do Contrato:
                </span>
                <div className={Styles.comparisonValues}>
                  <span className={Styles.comparisonOld}>
                    {`${oldTime} ${oldTime === 1 ? "ano" : "anos"}`}
                    {`${oldUntil ? ` (até ${oldUntil})` : ""}`}
                  </span>
                  <FaArrowRight className={Styles.comparisonArrow} />
                  <span className={Styles.comparisonNew}>
                    {`${newTime} ${newTime === 1 ? "ano" : "anos"}`}
                    {`${newUntil ? ` (até ${newUntil})` : ""}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
                    title="Editar transferência"
                    aria-label="Editar transferência"
                    data-testid="btn-edit-club-transfer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (direction === "arrivals") {
                        onOpenScreen?.({
                          key: "addTransferPlayer",
                          seasonId: season.id,
                          editTransfer: {
                            player,
                            contract,
                            contractIndex,
                          },
                          returnToScreen: {
                            key: "manageClauses",
                            initialTab: "arrivals",
                          },
                        });
                      } else {
                        onOpenScreen?.({
                          key: "transferPlayer",
                          playerId: player.id,
                          seasonId: season.id,
                          editTransfer: {
                            player,
                            contract,
                            contractIndex,
                            direction: "exit",
                          },
                          returnToScreen: {
                            key: "manageClauses",
                            initialTab: "exit",
                          },
                        });
                      }
                    }}
                  >
                    <FaEdit size={14} />
                  </button>
                )}
              </div>
              <div className={Styles.transferFeeText}>
                {isLoanCard ? "Duração do Empréstimo: " : "Taxa de Transferência: "}
                <strong>
                  {isLoanCard
                    ? `${contract.loanDuration || 1} ${Number(contract.loanDuration) === 1 ? "Ano" : "Anos"}`
                    : formatDisplayValue(totalFee, career.currency)}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Detalhamento Financeiro: apenas linhas com valores salvos no banco */}
        {direction === "renewals" ? (
          <div className={Styles.breakdownSection}>
            {contract.signingBonus ? (
              <div className={Styles.breakdownRow}>
                <span className={Styles.breakdownLabel}>
                  <span className={`${Styles.dot} ${Styles.dotGreen}`}></span>
                  Taxa da contratação (Luvas):
                </span>
                <span className={Styles.valueWhite}>
                  {formatDisplayValue(
                    parseValue(contract.signingBonus),
                    career.currency,
                  )}
                </span>
              </div>
            ) : null}

            {hasReleaseClause ? (
              <div className={Styles.breakdownRow}>
                <span className={Styles.breakdownLabel}>
                  <span className={`${Styles.dot} ${Styles.dotBlue}`}></span>
                  Multa rescisória:
                </span>
                <span className={Styles.valueBlue}>
                  {formatDisplayValue(releaseClauseValue, career.currency)}
                </span>
              </div>
            ) : null}

            {hasBonuses && bonusTotal > 0 ? (
              <div className={Styles.breakdownRow}>
                <span className={Styles.breakdownLabel}>
                  <span className={`${Styles.dot} ${Styles.dotAmber}`}></span>
                  Bônus: {contract.bonuses!.length} meta(s) a Pagar:
                </span>
                <span className={Styles.valueAmber}>
                  + {formatDisplayValue(bonusTotal, career.currency)}
                </span>
              </div>
            ) : null}

            {contract.contractClauses?.wageAdjustment ||
            contract.contractDetails?.wageAdjustment ? (
              <div className={Styles.breakdownRow}>
                <span className={Styles.breakdownLabel}>
                  <span className={`${Styles.dot} ${Styles.dotBlue}`}></span>
                  Ajuste salarial (
                  {
                    (
                      contract.contractClauses?.wageAdjustment ||
                      contract.contractDetails?.wageAdjustment
                    )?.direction
                  }{" "}
                  {
                    (
                      contract.contractClauses?.wageAdjustment ||
                      contract.contractDetails?.wageAdjustment
                    )?.percentage
                  }
                  %):
                </span>
                <span className={Styles.valueWhite}>
                  {(
                    contract.contractClauses?.wageAdjustment ||
                    contract.contractDetails?.wageAdjustment
                  )?.applied
                    ? "Aplicado"
                    : "Pendente"}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          (upfront > 0 ||
            (hasInstallments && installmentTotal > 0) ||
            (hasBonuses && bonusTotal > 0) ||
            (isArrivalPurchase &&
              (hasReleaseClause ||
                Boolean(resolvedWageAdjustment) ||
                Boolean(playerClauses.agentFee && playerClauses.agentFee > 0)))) && (
            <div className={Styles.breakdownSection}>
              {isArrivalPurchase &&
                playerClauses.agentFee &&
                playerClauses.agentFee > 0 && (
                  <div className={Styles.breakdownRow}>
                    <span className={Styles.breakdownLabel}>
                      <span className={`${Styles.dot} ${Styles.dotBlue}`}></span>
                      Taxa de agência:
                    </span>
                    <span className={Styles.valueWhite}>
                      {formatDisplayValue(
                        playerClauses.agentFee,
                        career.currency,
                      )}
                    </span>
                  </div>
                )}
              {isArrivalPurchase && hasReleaseClause && (
                <div className={Styles.breakdownRow}>
                  <span className={Styles.breakdownLabel}>
                    <span className={`${Styles.dot} ${Styles.dotBlue}`}></span>
                    Multa rescisória:
                  </span>
                  <span className={Styles.valueBlue}>
                    {formatDisplayValue(releaseClauseValue, career.currency)}
                  </span>
                </div>
              )}

              {isArrivalPurchase && resolvedWageAdjustment && (
                <div className={Styles.breakdownRow}>
                  <span className={Styles.breakdownLabel}>
                    <span className={`${Styles.dot} ${Styles.dotBlue}`}></span>
                    Ajuste salarial ({resolvedWageAdjustment.direction}{" "}
                    {resolvedWageAdjustment.percentage}%
                    {resolvedWageAdjustment.targetLeague
                      ? ` - ${resolvedWageAdjustment.targetLeague}`
                      : ""}
                    ):
                  </span>
                  <span className={Styles.valueWhite}>
                    {resolvedWageAdjustment.applied ? "Aplicado" : "Pendente"}
                  </span>
                </div>
              )}
              {upfront > 0 && (
                <div className={Styles.breakdownRow}>
                  <span className={Styles.breakdownLabel}>
                    <span className={`${Styles.dot} ${Styles.dotGreen}`}></span>
                    {direction === "exit"
                      ? "À vista (Imediato no Caixa):"
                      : "À vista (Pago no Caixa):"}
                  </span>
                  <span className={Styles.valueWhite}>
                    {formatDisplayValue(upfront, career.currency)}
                  </span>
                </div>
              )}

              {hasInstallments &&
                contract.installments &&
                installmentTotal > 0 && (
                  <div className={Styles.breakdownRow}>
                    <span className={Styles.breakdownLabel}>
                      <span
                        className={`${Styles.dot} ${Styles.dotBlue}`}
                      ></span>
                      Parcelamento: {contract.installments.percentage}% (
                      {installmentYears}x Temp):
                    </span>
                    <span className={Styles.valueBlue}>
                      {formatDisplayValue(installmentTotal, career.currency)}
                    </span>
                  </div>
                )}

              {hasBonuses &&
                contract.bonuses &&
                contract.bonuses.length > 0 &&
                bonusTotal > 0 && (
                  <div className={Styles.breakdownRow}>
                    <span className={Styles.breakdownLabel}>
                      <span
                        className={`${Styles.dot} ${Styles.dotAmber}`}
                      ></span>
                      Bônus: {contract.bonuses.length} meta(s){" "}
                      {direction === "exit" ? "a Receber" : "a Pagar"}:
                    </span>
                    <span className={Styles.valueAmber}>
                      + {formatDisplayValue(bonusTotal, career.currency)}
                    </span>
                  </div>
                )}
            </div>
          )
        )}

        {/* Projeção Financeira do Vínculo */}
        {direction === "renewals" ? (
          <div className={Styles.totalSection}>
            <span className={Styles.totalLabel}>Projeção Financeira</span>

            <div className={Styles.renewalHudBar}>
              {/* 1ª Opção: Média Anual */}
              <div className={Styles.renewalHudItem}>
                <span
                  className={`${Styles.renewalHudIndicator} ${Styles.indicatorBlue}`}
                />
                <div className={Styles.renewalHudTextGroup}>
                  <span className={Styles.renewalHudLabel}>Média Anual</span>
                  <span className={Styles.renewalHudValue}>
                    {formatDisplayValue(averagePerSeason, career.currency)}
                  </span>
                </div>
              </div>

              {/* 2ª Opção: Garantido */}
              <div className={Styles.renewalHudItem}>
                <span
                  className={`${Styles.renewalHudIndicator} ${Styles.indicatorGreen}`}
                />
                <div className={Styles.renewalHudTextGroup}>
                  <span className={Styles.renewalHudLabel}>Garantido</span>
                  <span className={Styles.renewalHudValue}>
                    {formatDisplayValue(totalGuaranteed, career.currency)}
                  </span>
                </div>
              </div>

              {/* 3ª Opção: Potencial */}
              <div className={Styles.renewalHudItem}>
                <span
                  className={`${Styles.renewalHudIndicator} ${Styles.indicatorAmber}`}
                />
                <div className={Styles.renewalHudTextGroup}>
                  <span className={Styles.renewalHudLabel}>Potencial</span>
                  <span className={Styles.renewalHudValue}>
                    {formatDisplayValue(totalPotential, career.currency)}
                  </span>
                </div>
              </div>
            </div>
            {contract.contractClauses?.wageAdjustment ? (
              <div className={Styles.specialClausesNotice}>
                <span className={Styles.specialClausesTitle}>
                  Cláusula de Ajuste Salarial:
                </span>
                <ul className={Styles.specialClausesList}>
                  <li className={Styles.specialClausesItem}>
                    {contract.contractClauses.wageAdjustment.direction}{" "}
                    {contract.contractClauses.wageAdjustment.percentage}% se{" "}
                    {contract.contractClauses.wageAdjustment.targetObjective}
                    {contract.contractClauses.wageAdjustment.targetLeague &&
                      ` (${contract.contractClauses.wageAdjustment.targetLeague})`}
                    {contract.contractClauses.wageAdjustment.applied
                      ? " (Já aplicado)"
                      : ""}
                  </li>
                </ul>
              </div>
            ) : null}
            {!hasRenewalActiveClauses(contract) && (
              <div className={Styles.noClausesText}>
                Nenhuma cláusula adicional ativa nesta renovação.
              </div>
            )}
          </div>
        ) : (
          <div className={Styles.totalSection}>
            <span className={Styles.totalLabel}>
              {direction === "exit"
                ? "Receita Máxima Projetada"
                : "Investimento Máximo Projetado"}
            </span>
            <div className={Styles.totalAmount}>
              {formatDisplayValue(maxTotal, career.currency)}
            </div>
            {hasSwap && contract.swapPlayer?.playerName && (
              <div className={Styles.swapNotice}>
                + {contract.swapPlayer.playerName}
              </div>
            )}
            {uniqueSpecialClausesList.length > 0 && (
              <div className={Styles.specialClausesNotice}>
                <span className={Styles.specialClausesTitle}>
                  Acordos Especiais:
                </span>
                <ul className={Styles.specialClausesList}>
                  {uniqueSpecialClausesList.map((clauseText, cIdx) => (
                    <li key={cIdx} className={Styles.specialClausesItem}>
                      {clauseText}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!hasClauses && (
              <div className={Styles.noClausesText}>
                Nenhuma cláusula adicional cadastrada nesta transferência.
              </div>
            )}
          </div>
        )}

        {/* DATA DO ACORDO CENTRALIZADA */}
        <div className={Styles.agreementDate}>
          {direction === "renewals"
            ? "Data da renovação: "
            : "Data do acordo: "}
          <span>{getContractFormattedDate(contract)}</span>
        </div>
      </div>

      {/* AÇÕES DO CARD */}
      {(!isLoanCard || (isArrivalLoan ? hasLoanBuyOption : hasClauses) || isDetailView) && (
        <div
          className={`${Styles.cardActions} ${
            isDetailView && isChooseScopeView ? Styles.cardActionsScope : ""
          }`}
        >
        {isDetailView && isChooseScopeView ? (
          <>
            <button
              type="button"
              className={`${Styles.btnSecondary} ${Styles.btnBackLeft}`}
              onClick={cancelInline}
              data-testid="btn-choose-scope-back"
            >
              <FaArrowLeft /> Voltar
            </button>
            <div className={Styles.scopeButtonsGroup}>
              {!isPassesLivres && (
                <button
                  type="button"
                  className={Styles.btnClubClauses}
                  onClick={() => onSelectClubClauses?.(item)}
                  data-testid="btn-choose-club-clauses"
                >
                  <FaBuilding /> Cláusulas do Clube
                </button>
              )}
              <button
                type="button"
                className={Styles.btnPlayerTerms}
                onClick={() => onSelectPlayerTerms?.(item)}
                data-testid="btn-choose-player-terms"
              >
                <FaUserCheck /> Termos do Atleta
              </button>
            </div>
          </>
        ) : isDetailView ? (
          <button
            type="button"
            className={Styles.btnSecondary}
            onClick={cancelInline}
          >
            <FaArrowLeft /> Voltar
          </button>
        ) : !readOnly ? (
          direction === "renewals" ? (
            <>
              <button
                type="button"
                className={Styles.btnDeleteContract}
                onClick={() => (handleRevertRenewal || handleDeleteRenewal)(item)}
                data-testid={`btn-delete-renewal-${item.player.id}`}
                title="Reverter renovação"
                aria-label="Reverter renovação"
              >
                <FaUndo /> Reverter
              </button>
              <button
                type="button"
                className={Styles.btnSecondary}
                onClick={() => startEditCard(item)}
              >
                <FaEdit /> Editar
              </button>
              {hasBonuses || hasWageAdjustment || hasReleaseClause ? (
                <button
                  type="button"
                  className={Styles.btnPrimary}
                  style={{ backgroundColor: clubColor }}
                  onClick={() => startManageCard(item)}
                  data-testid="btn-manage-clauses"
                >
                  <FaCheck /> Gerenciar
                </button>
              ) : null}
            </>
          ) : isLoanCard ? (
            (isArrivalLoan ? hasLoanBuyOption : hasClauses) ? (
              <button
                type="button"
                className={Styles.btnPrimary}
                style={{ backgroundColor: clubColor }}
                onClick={() => startManageCard(item)}
                data-testid="btn-manage-clauses"
              >
                <FaCheck /> Gerenciar
              </button>
            ) : null
          ) : !hasClauses ? (
            <button
              type="button"
              className={Styles.btnPrimary}
              style={{ backgroundColor: clubColor }}
              onClick={() => startEditCard(item)}
            >
              <FaPlus /> Adicionar Cláusulas
            </button>
          ) : (
            <>
              <button
                type="button"
                className={Styles.btnSecondary}
                onClick={() => startEditCard(item)}
              >
                <FaEdit /> Editar
              </button>
              <button
                type="button"
                className={Styles.btnPrimary}
                style={{ backgroundColor: clubColor }}
                onClick={() => startManageCard(item)}
                data-testid="btn-manage-clauses"
              >
                <FaCheck /> Gerenciar
              </button>
            </>
          )
        ) : null}
        </div>
      )}
    </div>
  );
};

export default TransferClauseCard;
