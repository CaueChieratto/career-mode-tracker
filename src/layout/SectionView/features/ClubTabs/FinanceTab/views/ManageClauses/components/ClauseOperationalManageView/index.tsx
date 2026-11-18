import React from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { TransferItem } from "../../types";
import { TransferBonus } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { TransferProposal } from "../../../../../../../../../common/interfaces/proposals/transferProposal";
import { ClauseSectionDrawer } from "../../../../../../../../../components/ClauseSectionDrawer";
import {
  formatDisplayValue,
  parseValue,
} from "../../../../../../../../../common/utils/FormatValue";
import { formatDateInputShort } from "../../../../../../../../../common/utils/Date";
import { isValidShortDate } from "../../helpers/manageClausesFormatters";
import { resolveContractPlayerClauses } from "../../../../../../../../../common/helpers/contractPlayerClauses";
import {
  getContractBuyOptionFee,
  hasDefinedLoanBuyOption,
} from "../../../../../../../../../common/services/ServicePlayers/helpers/contractHelpers";
import Styles from "../../ManageClauses.module.css";
import {
  FaCoins,
  FaPercentage,
  FaCheck,
  FaHandshake,
  FaCalendarAlt,
  FaUndo,
  FaTrophy,
  FaFileContract,
  FaExchangeAlt,
  FaArrowLeft,
  FaUser,
  FaBuilding,
} from "react-icons/fa";

export interface ClauseOperationalManageViewProps {
  career: Career;
  activeTransferItem: TransferItem;
  isLoading: boolean;
  cancelInline: () => void;
  sellOnActiveCardKey: string | null;
  setSellOnActiveCardKey: (key: string | null) => void;
  sellOnTotalInput: string;
  setSellOnTotalInput: (val: string) => void;
  sellOnDateInput: string;
  setSellOnDateInput: (val: string) => void;
  loanBuyOptionDateInput: string;
  setLoanBuyOptionDateInput: (val: string) => void;
  handleApplyWageAdjustment: (item: TransferItem) => Promise<void>;
  handleSettleInstallment: (item: TransferItem) => Promise<void>;
  handleUnsettleInstallment: (item: TransferItem) => Promise<void>;
  handleSettleBonus: (item: TransferItem, bonusId: string) => Promise<void>;
  handleExerciseBuyback: (item: TransferItem) => Promise<void>;
  handleExerciseFirstRefusal: (item: TransferItem) => Promise<void>;
  handleTriggerReleaseClause: (item: TransferItem) => Promise<void>;
  handleConfirmSellOn: (item: TransferItem) => Promise<void>;
  handleExerciseLoanBuyOption: (item: TransferItem) => Promise<void>;
  handleExerciseArrivalLoanBuyOption?: (item: TransferItem) => void;
  proposals?: TransferProposal[];
  readOnly?: boolean;
  onOpenScreen?: (
    screen: import("../../../../../../../config/screens").SectionScreen,
  ) => void;
  activeSectionDrawer?: import("../../types").DrawerSection;
  setActiveSectionDrawer?: (
    drawer: import("../../types").DrawerSection,
  ) => void;
}

export const ClauseOperationalManageView: React.FC<
  ClauseOperationalManageViewProps
> = ({
  career,
  activeTransferItem,
  isLoading,
  cancelInline,
  sellOnActiveCardKey,
  setSellOnActiveCardKey,
  sellOnTotalInput,
  setSellOnTotalInput,
  sellOnDateInput,
  setSellOnDateInput,
  loanBuyOptionDateInput,
  setLoanBuyOptionDateInput,
  handleApplyWageAdjustment,
  handleSettleInstallment,
  handleUnsettleInstallment,
  handleSettleBonus,
  handleExerciseBuyback,
  handleExerciseFirstRefusal,
  handleTriggerReleaseClause,
  handleConfirmSellOn,
  handleExerciseLoanBuyOption,
  handleExerciseArrivalLoanBuyOption,
  proposals = [],
  readOnly = false,
  onOpenScreen,
  activeSectionDrawer = null,
  setActiveSectionDrawer = () => {},
}) => {
  const itemCardKey =
    activeTransferItem.cardKey ||
    `${activeTransferItem.player.id}_${activeTransferItem.contractIndex}_${activeTransferItem.direction}`;

  const resolvedPlayerClauses = resolveContractPlayerClauses(
    activeTransferItem.contract,
  );

  const isArrivalLoan =
    Boolean(activeTransferItem.contract.isLoan) &&
    (activeTransferItem.direction === "arrivals" ||
      Boolean(
        activeTransferItem.contract.fromClub &&
        !activeTransferItem.contract.leftClub,
      ));

  const hasBuyOption = hasDefinedLoanBuyOption(activeTransferItem.contract);
  const resolvedBuyOptionFee = getContractBuyOptionFee(
    activeTransferItem.contract,
  );

  return (
    <div className={Styles.managePanelBox}>
      <div className={Styles.manageHeader}>
        <div className={Styles.manageHeaderLeft}>
          <div className={Styles.manageHeaderIcon}>
            <FaCoins />
          </div>
          <div>
            <h4 className={Styles.manageHeaderTitle}>
              Gerenciamento Operacional de Cláusulas
            </h4>
            <p className={Styles.manageHeaderSubtitle}>
              {activeTransferItem.direction === "renewals"
                ? "Liquidação de bônus e aplicação de ajuste salarial"
                : isArrivalLoan
                  ? hasBuyOption
                    ? "Ativação de opção de compra definitiva do atleta"
                    : "Empréstimo sem opção de compra definida"
                  : "Liquidação de parcelas e bônus contratuais ativos"}
            </p>
          </div>
        </div>
      </div>

      {/* GESTÃO DE AJUSTE SALARIAL (RENOVAÇÕES OU CHEGADAS) */}
      {(activeTransferItem.direction === "renewals" ||
        (activeTransferItem.direction === "arrivals" &&
          !activeTransferItem.contract.isLoan)) &&
        resolvedPlayerClauses.wageAdjustment &&
        (() => {
          const wageAdj = resolvedPlayerClauses.wageAdjustment!;
          const isApplied = wageAdj.applied || wageAdj.status === "applied";
          const currentSalary = Number(
            activeTransferItem.player.salary ||
              activeTransferItem.contract.salary ||
              0,
          );
          const factor =
            wageAdj.direction === "Diminuir"
              ? (100 - wageAdj.percentage) / 100
              : (100 + wageAdj.percentage) / 100;
          const projectedSalary = Math.round(currentSalary * factor);

          return (
            <div
              className={Styles.operationalCard}
              data-testid="manage-wage-adjustment-card"
            >
              <div className={Styles.operationalCardTop}>
                <div className={Styles.operationalTitleGroup}>
                  <div
                    className={`${Styles.operationalIconBox} ${Styles.iconBlue}`}
                  >
                    <FaPercentage />
                  </div>
                  <div>
                    <div className={Styles.operationalTitleRow}>
                      <h5 className={Styles.operationalTitle}>
                        Ajuste Salarial Automático
                      </h5>
                      <span className={Styles.operationalTargetPillPlayer}>
                        <FaUser size={9} /> A Pagar ao Jogador
                      </span>
                    </div>
                    <span className={Styles.operationalMetaText}>
                      Critério: {wageAdj.targetObjective}
                      {wageAdj.targetLeague && ` • Liga: ${wageAdj.targetLeague}`}
                    </span>
                  </div>
                </div>
                <span
                  className={`${Styles.statusPill} ${
                    isApplied ? Styles.statusPillPaid : Styles.statusPillPending
                  }`}
                >
                  {isApplied ? (
                    <>
                      <FaCheck size={11} /> Aplicado
                    </>
                  ) : (
                    "Pendente"
                  )}
                </span>
              </div>

              <div className={Styles.financialMetricsGrid}>
                <div className={Styles.metricBoxHighlight}>
                  <span className={Styles.metricLabel}>Ajuste Acordado</span>
                  <div className={Styles.metricValuePrimary}>
                    {wageAdj.direction} {wageAdj.percentage}%
                  </div>
                </div>
                <div className={Styles.metricBoxSecondary}>
                  <span className={Styles.metricLabel}>
                    {isApplied ? "Salário Atual" : "Salário Projetado"}
                  </span>
                  <div className={Styles.metricValueSecondary}>
                    {formatDisplayValue(
                      isApplied ? currentSalary : projectedSalary,
                      career.currency,
                    )}
                  </div>
                  <span className={Styles.metricSubText}>por semana</span>
                </div>
              </div>

              {!readOnly && !isApplied && (
                <div className={Styles.actionButtonWrapper}>
                  <button
                    type="button"
                    className={Styles.btnSettlePrimary}
                    onClick={() =>
                      handleApplyWageAdjustment(activeTransferItem)
                    }
                    disabled={isLoading}
                    data-testid="btn-apply-wage-adjustment"
                  >
                    <FaCheck /> Aplicar Ajuste (
                    {wageAdj.direction === "Diminuir" ? "-" : "+"}
                    {wageAdj.percentage}%)
                  </button>
                </div>
              )}
            </div>
          );
        })()}

      {/* GESTÃO DE OPÇÃO DE COMPRA DE EMPRÉSTIMO DE CHEGADA */}
      {isArrivalLoan && hasBuyOption && (
        <div
          className={Styles.operationalCard}
          data-testid="manage-arrival-loan-buy-option-card"
        >
          <div className={Styles.operationalCardTop}>
            <div className={Styles.operationalTitleGroup}>
              <div
                className={`${Styles.operationalIconBox} ${Styles.iconEmerald}`}
              >
                <FaHandshake />
              </div>
              <div>
                <div className={Styles.operationalTitleRow}>
                  <h5 className={Styles.operationalTitle}>
                    Opção de Compra Fixada
                  </h5>
                  <span className={Styles.operationalTargetPillClub}>
                    <FaBuilding size={9} /> Acordo com Clube Cedente
                  </span>
                </div>
                <span className={Styles.operationalMetaText}>
                  Clube de origem:{" "}
                  {activeTransferItem.contract.fromClub ||
                    activeTransferItem.contract.loanTerms?.partnerClub ||
                    "Não informado"}
                </span>
              </div>
            </div>
            <span
              className={`${Styles.statusPill} ${Styles.statusPillPending}`}
            >
              Disponível
            </span>
          </div>

          <div className={Styles.financialMetricsGrid}>
            <div className={Styles.metricBoxHighlight}>
              <span className={Styles.metricLabel}>
                Taxa Fixada para Compra
              </span>
              <div className={Styles.metricValuePrimary}>
                {formatDisplayValue(
                  activeTransferItem.contract.loanTerms?.buyOptionFee ??
                    activeTransferItem.contract.buyOptionValue ??
                    0,
                  career.currency,
                )}
              </div>
            </div>
            {activeTransferItem.contract.loanTerms?.sellOnPercentage ||
            activeTransferItem.contract.transferClauses?.sellOnPercentage ? (
              <div className={Styles.metricBoxSecondary}>
                <span className={Styles.metricLabel}>
                  Cláusula de Futura Venda
                </span>
                <div className={Styles.metricValueSecondary}>
                  {activeTransferItem.contract.loanTerms?.sellOnPercentage ||
                    activeTransferItem.contract.transferClauses
                      ?.sellOnPercentage}
                  %
                </div>
                <span className={Styles.metricSubText}>
                  a repassar ao clube cedente em futura venda
                </span>
              </div>
            ) : null}
          </div>

          {(() => {
            const isBuyOptionFinalized = Boolean(
              activeTransferItem.contract.buyOptionFinalized ||
                activeTransferItem.contract.loanTerms?.buyOptionFinalized ||
                (activeTransferItem.contract.fromLoanBuyOption &&
                  !activeTransferItem.contract.isLoan) ||
                activeTransferItem.player.contract?.some(
                  (c) =>
                    c.buyOptionFinalized ||
                    c.loanTerms?.buyOptionFinalized ||
                    (c.fromLoanBuyOption && !c.isLoan),
                ),
            );

            const hasPendingBuyOptionProposal = Boolean(
              proposals?.some(
                (p) =>
                  p.playerId === activeTransferItem.player.id &&
                  p.originLoanBuyOption &&
                  p.overallStatus !== "cancelada" &&
                  p.overallStatus !== "rejeitada" &&
                  p.overallStatus !== "concluida",
              ),
            );

            if (isBuyOptionFinalized) {
              return (
                <div className={Styles.actionButtonWrapper}>
                  <div
                    className={Styles.manageTag}
                    style={{ padding: "8px 14px", fontSize: "14px" }}
                    data-testid="arrival-loan-buy-option-exercised-badge"
                  >
                    <span className={Styles.tagDot} />
                    Opção de Compra Já Exercida
                  </div>
                </div>
              );
            }

            if (hasPendingBuyOptionProposal) {
              return (
                <div className={Styles.actionButtonWrapper}>
                  <div
                    className={Styles.manageTag}
                    style={{
                      padding: "8px 14px",
                      fontSize: "14px",
                      background: "rgba(234, 179, 8, 0.12)",
                      borderColor: "rgba(234, 179, 8, 0.35)",
                      color: "#eab308",
                    }}
                    data-testid="arrival-loan-buy-option-pending-badge"
                  >
                    <span
                      className={Styles.tagDot}
                      style={{ background: "#eab308" }}
                    />
                    Opção de Compra Pendente
                  </div>
                </div>
              );
            }

            if (!readOnly && onOpenScreen) {
              return (
                <div className={Styles.actionButtonWrapper}>
                  <button
                    type="button"
                    className={Styles.btnExerciseAgreement}
                    onClick={() =>
                      handleExerciseArrivalLoanBuyOption?.(activeTransferItem)
                    }
                    data-testid="btn-exercise-arrival-loan-buy-option"
                  >
                    <FaCheck /> Exercer Opção de Compra
                  </button>
                </div>
              );
            }

            return null;
          })()}
        </div>
      )}

      {isArrivalLoan && !hasBuyOption && (
        <div
          className={Styles.emptyState}
          data-testid="manage-arrival-loan-no-buy-option"
        >
          Este empréstimo não possui opção de compra definida.
        </div>
      )}

      {!isArrivalLoan && (
        <>
          {/* GESTÃO DE OPÇÃO DE COMPRA DE EMPRÉSTIMO */}
          {activeTransferItem.contract.isLoan && hasBuyOption && (
              <div
                className={Styles.operationalCard}
                data-testid="manage-loan-buy-option-card"
              >
                <div className={Styles.operationalCardTop}>
                  <div className={Styles.operationalTitleGroup}>
                    <div
                      className={`${Styles.operationalIconBox} ${Styles.iconEmerald}`}
                    >
                      <FaHandshake />
                    </div>
                    <div>
                      <div className={Styles.operationalTitleRow}>
                        <h5 className={Styles.operationalTitle}>
                          Opção de Compra
                        </h5>
                        <span className={Styles.operationalTargetPillClub}>
                          <FaBuilding size={9} /> A Pagar ao Clube
                        </span>
                      </div>
                      <span className={Styles.operationalMetaText}>
                        Clube parceiro:{" "}
                        {activeTransferItem.contract.leftClub ||
                          "Não informado"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${Styles.statusPill} ${
                      activeTransferItem.contract.loanTerms?.buyOptionExercised
                        ? Styles.statusPillPaid
                        : Styles.statusPillPending
                    }`}
                  >
                    {activeTransferItem.contract.loanTerms
                      ?.buyOptionExercised ? (
                      <>
                        <FaCheck size={11} /> Exercida
                        {activeTransferItem.contract.loanTerms.exercisedDate
                          ? ` em ${activeTransferItem.contract.loanTerms.exercisedDate}`
                          : ""}
                      </>
                    ) : (
                      "Pendente"
                    )}
                  </span>
                </div>

                <div className={Styles.financialMetricsGrid}>
                  <div className={Styles.metricBoxHighlight}>
                    <span className={Styles.metricLabel}>
                      Taxa Fixada para Compra
                    </span>
                    <div className={Styles.metricValuePrimary}>
                      {formatDisplayValue(
                        activeTransferItem.contract.buyOptionValue ||
                          activeTransferItem.contract.loanTerms?.buyOptionFee ||
                          0,
                        career.currency,
                      )}
                    </div>
                  </div>
                  {activeTransferItem.contract.loanTerms?.sellOnPercentage ? (
                    <div className={Styles.metricBoxSecondary}>
                      <span className={Styles.metricLabel}>
                        Cláusula de Futura Venda
                      </span>
                      <div className={Styles.metricValueSecondary}>
                        {activeTransferItem.contract.loanTerms.sellOnPercentage}
                        %
                      </div>
                      <span className={Styles.metricSubText}>
                        a receber em futura transferência
                      </span>
                    </div>
                  ) : null}
                </div>

                {!readOnly && (
                  <div className={Styles.actionButtonWrapper}>
                    {activeTransferItem.contract.loanTerms
                      ?.buyOptionExercised ? (
                      <button
                        type="button"
                        className={Styles.btnEditSecondary}
                        onClick={() => {
                          setLoanBuyOptionDateInput(
                            activeTransferItem.contract.loanTerms
                              ?.exercisedDate || "",
                          );
                          setActiveSectionDrawer("loanBuyOption");
                        }}
                        data-testid="btn-edit-exercise-buy-option"
                      >
                        <FaCalendarAlt /> Alterar Data do Exercício
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={Styles.btnSettlePrimary}
                        onClick={() => {
                          setLoanBuyOptionDateInput("");
                          setActiveSectionDrawer("loanBuyOption");
                        }}
                        data-testid="btn-open-exercise-buy-option"
                      >
                        <FaCheck /> Exercer Opção de Compra
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* GESTÃO DE PARCELAS */}
          {activeTransferItem.contract.installments &&
            (() => {
              const installments = activeTransferItem.contract.installments;
              const total = installments.totalInstallments || 1;
              const remaining = installments.remainingInstallments ?? total;
              const isPaid = remaining === 0;
              const paid = Math.max(0, total - remaining);
              const progressPct = Math.min(
                100,
                Math.round((paid / total) * 100),
              );
              const annualVal = installments.annualInstallmentValue || 0;
              const totalInstallmentVal = annualVal * total;

              return (
                <div
                  className={Styles.operationalCard}
                  data-testid="manage-installment-card"
                >
                  <div className={Styles.operationalCardTop}>
                    <div className={Styles.operationalTitleGroup}>
                      <div
                        className={`${Styles.operationalIconBox} ${Styles.iconBlue}`}
                      >
                        <FaPercentage />
                      </div>
                      <div>
                        <div className={Styles.operationalTitleRow}>
                          <h5 className={Styles.operationalTitle}>
                            Parcelamento Financeiro
                          </h5>
                          <span
                            className={
                              installments.direction === "receivable"
                                ? Styles.operationalTargetPillClubReceivable
                                : Styles.operationalTargetPillClub
                            }
                          >
                            <FaBuilding size={9} />{" "}
                            {installments.direction === "receivable"
                              ? "A Receber do Clube"
                              : "A Pagar ao Clube Vendedor"}
                          </span>
                        </div>
                        <span className={Styles.operationalMetaText}>
                          {installments.direction === "receivable"
                            ? "Recebimento anual"
                            : "Pagamento anual"}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`${Styles.statusPill} ${
                        isPaid
                          ? Styles.statusPillPaid
                          : Styles.statusPillPending
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <FaCheck size={11} /> Quitado
                        </>
                      ) : (
                        `${remaining} ${
                          remaining === 1
                            ? "parcela restante"
                            : "parcelas restantes"
                        }`
                      )}
                    </span>
                  </div>

                  <div className={Styles.operationalProgressSection}>
                    <div className={Styles.operationalProgressHeader}>
                      <span>Progresso de Quitação</span>
                      <strong>
                        {paid} de {total} temporadas ({progressPct}%)
                      </strong>
                    </div>
                    <div className={Styles.progressBarContainer}>
                      <div
                        className={Styles.progressBarFill}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className={Styles.financialMetricsGrid}>
                    <div className={Styles.metricBoxHighlight}>
                      <span className={Styles.metricLabel}>
                        {isPaid
                          ? "Parcela Anual (Quitada)"
                          : "Próxima Parcela a Liquidar"}
                      </span>
                      <div className={Styles.metricValuePrimary}>
                        {formatDisplayValue(annualVal, career.currency)}
                      </div>
                    </div>
                    <div className={Styles.metricBoxSecondary}>
                      <span className={Styles.metricLabel}>
                        Total Parcelado
                      </span>
                      <div className={Styles.metricValueSecondary}>
                        {formatDisplayValue(
                          totalInstallmentVal,
                          career.currency,
                        )}
                      </div>
                      <span className={Styles.metricSubText}>
                        em {total} temporadas
                      </span>
                    </div>
                  </div>

                  {!readOnly && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      {!isPaid && (
                        <div className={Styles.actionButtonWrapper}>
                          <button
                            type="button"
                            className={Styles.btnSettlePrimary}
                            onClick={() =>
                              handleSettleInstallment(activeTransferItem)
                            }
                            disabled={isLoading}
                          >
                            <FaCheck /> Liquidar Próxima Parcela (
                            {formatDisplayValue(annualVal, career.currency)})
                          </button>
                        </div>
                      )}
                      {paid > 0 && (
                        <div className={Styles.actionButtonWrapper}>
                          <button
                            type="button"
                            className={Styles.btnRevertSecondary}
                            onClick={() =>
                              handleUnsettleInstallment(activeTransferItem)
                            }
                            disabled={isLoading}
                            data-testid="btn-unsettle-installment"
                          >
                            <FaUndo /> Desfazer Pagamento da Parcela
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* GESTÃO DE BÔNUS */}
          {(resolvedPlayerClauses.allBonuses.length > 0
            ? resolvedPlayerClauses.allBonuses
            : activeTransferItem.contract.bonuses || []
          ).map((bonus: TransferBonus) => {
            const isBonusPaid = bonus.status === "paid" || bonus.paid;
            const bonusCountVal =
              bonus.targetCount !== undefined
                ? bonus.targetCount
                : bonus.metricTarget !== undefined
                  ? bonus.metricTarget
                  : undefined;
            const bonusBaseTitle =
              bonus.name || bonus.bonusTarget || "Meta de Bônus";
            const bonusDisplayTitle =
              bonusCountVal !== undefined
                ? `${bonusCountVal} ${bonusBaseTitle}`
                : bonusBaseTitle;

            const isPlayerBonus =
              activeTransferItem.direction === "renewals" ||
              (!bonus.partnerClub && bonus.direction !== "receivable");
            const isReceivableClub = bonus.direction === "receivable";

            return (
              <div
                key={bonus.id}
                className={Styles.operationalCard}
                data-testid={`manage-bonus-card-${bonus.id}`}
              >
                <div className={Styles.operationalCardTop}>
                  <div className={Styles.operationalTitleGroup}>
                    <div
                      className={`${Styles.operationalIconBox} ${Styles.iconEmerald}`}
                    >
                      <FaTrophy />
                    </div>
                    <div>
                      <div className={Styles.operationalTitleRow}>
                        <h5 className={Styles.operationalTitle}>
                          {bonusDisplayTitle}
                        </h5>
                        <span
                          className={
                            isPlayerBonus
                              ? Styles.operationalTargetPillPlayer
                              : isReceivableClub
                                ? Styles.operationalTargetPillClubReceivable
                                : Styles.operationalTargetPillClub
                          }
                        >
                          {isPlayerBonus ? (
                            <>
                              <FaUser size={9} /> A Pagar ao Jogador
                            </>
                          ) : (
                            <>
                              <FaBuilding size={9} />{" "}
                              {isReceivableClub
                                ? "A Receber do Clube"
                                : "A Pagar ao Clube Vendedor"}
                            </>
                          )}
                        </span>
                      </div>
                      <span className={Styles.operationalMetaText}>
                        Categoria: {bonus.bonusCategory || "Meta"} &bull;{" "}
                        {bonus.targetLeague
                          ? `Liga: ${bonus.targetLeague} \u2022 `
                          : ""}
                        {bonusCountVal !== undefined
                          ? `Meta: ${bonusCountVal} \u2022 `
                          : ""}
                        {bonus.direction === "receivable"
                          ? "A Receber"
                          : "A Pagar"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${Styles.statusPill} ${
                      isBonusPaid
                        ? Styles.statusPillPaid
                        : Styles.statusPillPending
                    }`}
                  >
                    {isBonusPaid ? (
                      <>
                        <FaCheck size={11} /> Liquidado
                      </>
                    ) : (
                      "Pendente"
                    )}
                  </span>
                </div>

                <div className={Styles.financialMetricsGrid}>
                  <div className={Styles.metricBoxHighlight}>
                    <span className={Styles.metricLabel}>
                      Valor da Premiação / Meta
                    </span>
                    <div className={Styles.metricValuePrimary}>
                      {formatDisplayValue(bonus.value, career.currency)}
                    </div>
                  </div>
                </div>

                {!readOnly && !isBonusPaid && (
                  <div className={Styles.actionButtonWrapper}>
                    <button
                      type="button"
                      className={Styles.btnSettlePrimary}
                      onClick={() =>
                        handleSettleBonus(activeTransferItem, bonus.id)
                      }
                      disabled={isLoading}
                    >
                      <FaCheck /> Liquidar Bônus (
                      {formatDisplayValue(bonus.value, career.currency)})
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* ACORDOS ESPECIAIS ATIVOS */}
          {activeTransferItem.contract.transferClauses && (
            <div
              className={Styles.operationalCard}
              data-testid="manage-special-agreements-card"
            >
              <div className={Styles.operationalCardTop}>
                <div className={Styles.operationalTitleGroup}>
                  <div
                    className={`${Styles.operationalIconBox} ${Styles.iconPurple}`}
                  >
                    <FaHandshake />
                  </div>
                  <div>
                    <div className={Styles.operationalTitleRow}>
                      <h5 className={Styles.operationalTitle}>
                        Acordos Especiais Ativos
                      </h5>
                      <span
                        className={
                          activeTransferItem.direction === "exit"
                            ? Styles.operationalTargetPillClubReceivable
                            : Styles.operationalTargetPillClub
                        }
                      >
                        <FaBuilding size={9} />{" "}
                        {activeTransferItem.direction === "exit"
                          ? "Acordos com o Clube"
                          : "Acordos com Clube Vendedor"}
                      </span>
                    </div>
                    <span className={Styles.operationalMetaText}>
                      Cláusulas contratuais acordadas
                    </span>
                  </div>
                </div>
              </div>
              <div className={Styles.specialAgreementsList}>
                {activeTransferItem.contract.transferClauses.buybackValue && (
                  <div className={Styles.specialAgreementRow}>
                    <div className={Styles.manageTag}>
                      <span className={Styles.tagDot} />
                      Recompra:{" "}
                      <strong>
                        {formatDisplayValue(
                          activeTransferItem.contract.transferClauses
                            .buybackValue,
                          career.currency,
                        )}
                      </strong>
                    </div>
                    {!readOnly && onOpenScreen && (
                      <button
                        type="button"
                        className={Styles.btnExerciseAgreement}
                        onClick={() =>
                          handleExerciseBuyback(activeTransferItem)
                        }
                        data-testid="btn-exercise-buyback"
                      >
                        Exercer Recompra
                      </button>
                    )}
                  </div>
                )}

                {activeTransferItem.contract.transferClauses.firstRefusal && (
                  <div className={Styles.specialAgreementRow}>
                    <div className={Styles.manageTag}>
                      <span className={Styles.tagDot} />
                      Direito de Preferência Ativo
                    </div>
                    {!readOnly && onOpenScreen && (
                      <button
                        type="button"
                        className={Styles.btnExerciseAgreement}
                        onClick={() =>
                          handleExerciseFirstRefusal(activeTransferItem)
                        }
                        data-testid="btn-exercise-first-refusal"
                      >
                        Exercer Preferência
                      </button>
                    )}
                  </div>
                )}

                {activeTransferItem.contract.transferClauses
                  .sellOnPercentage && (
                  <div className={Styles.specialAgreementBlock}>
                    <div className={Styles.specialAgreementRow}>
                      <div className={Styles.manageTag}>
                        <span className={Styles.tagDot} />
                        Revenda Futura:{" "}
                        <strong>
                          {
                            activeTransferItem.contract.transferClauses
                              .sellOnPercentage
                          }
                          %
                        </strong>
                        {activeTransferItem.direction !== "exit" && (
                          <span> (Automática na venda)</span>
                        )}
                      </div>
                      {!readOnly && activeTransferItem.direction === "exit" && (
                        <button
                          type="button"
                          className={Styles.btnExerciseAgreement}
                          onClick={() => {
                            setSellOnActiveCardKey(itemCardKey);
                            setSellOnTotalInput("");
                          }}
                          data-testid="btn-toggle-sellon"
                        >
                          Ativar Venda Futura
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTransferItem.contract.transferClauses
                  .loanBackDuration && (
                  <div className={Styles.specialAgreementRow}>
                    <div className={Styles.manageTag}>
                      <span className={Styles.tagDot} />
                      Empréstimo de Volta:{" "}
                      <strong>
                        {
                          activeTransferItem.contract.transferClauses
                            .loanBackDuration
                        }{" "}
                        {activeTransferItem.contract.transferClauses
                          .loanBackDuration === 1
                          ? "temporada"
                          : "temporadas"}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GESTÃO DA MULTA RESCISÓRIA */}
          {(() => {
            const numericVal = resolvedPlayerClauses.releaseClause;
            if (!numericVal || numericVal <= 0) return null;

            return (
              <div
                className={Styles.operationalCard}
                data-testid="manage-release-clause-card"
              >
                <div className={Styles.operationalCardTop}>
                  <div className={Styles.operationalTitleGroup}>
                    <div
                      className={`${Styles.operationalIconBox} ${Styles.iconPurple}`}
                    >
                      <FaFileContract />
                    </div>
                    <div>
                      <div className={Styles.operationalTitleRow}>
                        <h5 className={Styles.operationalTitle}>
                          Multa Rescisória
                        </h5>
                        <span className={Styles.operationalTargetPillPlayer}>
                          <FaUser size={9} /> Contrato do Jogador
                        </span>
                      </div>
                      <span className={Styles.operationalMetaText}>
                        Rescisão unilateral de contrato
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${Styles.statusPill} ${Styles.statusPillPending}`}
                  >
                    Ativa
                  </span>
                </div>

                <div className={Styles.financialMetricsGrid}>
                  <div className={Styles.metricBoxHighlight}>
                    <span className={Styles.metricLabel}>Valor da Multa</span>
                    <div className={Styles.metricValuePrimary}>
                      {formatDisplayValue(numericVal, career.currency)}
                    </div>
                  </div>
                </div>

                {!readOnly && onOpenScreen && (
                  <div className={Styles.actionButtonWrapper}>
                    <button
                      type="button"
                      className={Styles.btnExerciseAgreement}
                      onClick={() =>
                        handleTriggerReleaseClause(activeTransferItem)
                      }
                      data-testid="btn-trigger-release-clause"
                    >
                      Exercer Multa Rescisória
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* GAVETA LATERAL: ATIVAÇÃO DE VENDA FUTURA */}
          {activeTransferItem.direction === "exit" &&
            activeTransferItem.contract.transferClauses?.sellOnPercentage && (
              <ClauseSectionDrawer
                isOpen={sellOnActiveCardKey === itemCardKey}
                onClose={() => setSellOnActiveCardKey(null)}
                onCancel={() => setSellOnActiveCardKey(null)}
                onSave={() => handleConfirmSellOn(activeTransferItem)}
                isSaving={isLoading}
                isConfirmDisabled={
                  parseValue(sellOnTotalInput || "0") <= 0 ||
                  !isValidShortDate(sellOnDateInput)
                }
                title="Ativar Venda Futura"
                saveLabel="Confirmar Recebimento"
                cancelLabel="Cancelar"
                hubContainerId="mainClauseHubContainer"
                confirmTestId="btn-confirm-sellon"
              >
                <div
                  className={Styles.sellOnDrawerContent}
                  data-testid="sellon-activation-box"
                >
                  <div className={Styles.sellOnDrawerInfo}>
                    <p className={Styles.sellOnDrawerDesc}>
                      Informe o valor total pelo qual o atleta foi vendido e a
                      data da transferência. O sistema calculará a fatia
                      acordada de{" "}
                      <strong>
                        {
                          activeTransferItem.contract.transferClauses
                            .sellOnPercentage
                        }
                        %
                      </strong>{" "}
                      e gerará um lançamento de receita automaticamente no
                      financeiro.
                    </p>
                  </div>

                  <div className={Styles.sellOnInputsColumn}>
                    <div className={Styles.sellOnFieldGroup}>
                      <label className={Styles.sellOnLabel}>
                        Valor Total da Venda Futura
                      </label>
                      <input
                        type="text"
                        className={Styles.sellOnInput}
                        placeholder="Ex: 0.5k, 5k, 5m, 5b"
                        value={sellOnTotalInput}
                        onChange={(e) => setSellOnTotalInput(e.target.value)}
                        data-testid="sellon-total-input"
                      />
                    </div>

                    <div className={Styles.sellOnFieldGroup}>
                      <label className={Styles.sellOnLabel}>
                        Data da Venda (DD/MM)
                      </label>
                      <input
                        type="text"
                        className={Styles.sellOnInput}
                        placeholder="01/07"
                        maxLength={5}
                        value={sellOnDateInput}
                        onChange={(e) =>
                          setSellOnDateInput(
                            formatDateInputShort(e.target.value),
                          )
                        }
                        data-testid="sellon-date-input"
                      />
                    </div>
                  </div>

                  {(() => {
                    const pct =
                      activeTransferItem.contract.transferClauses
                        ?.sellOnPercentage || 0;
                    const parsedTot = parseValue(sellOnTotalInput || "0");
                    const previewShare = Math.round((parsedTot * pct) / 100);
                    if (parsedTot <= 0) return null;
                    return (
                      <div className={Styles.sellOnPreview}>
                        <span>
                          Valor a receber ({pct}% de{" "}
                          {formatDisplayValue(parsedTot, career.currency)}
                          ):
                        </span>
                        <strong className={Styles.sellOnPreviewValue}>
                          {formatDisplayValue(previewShare, career.currency)}
                        </strong>
                      </div>
                    );
                  })()}
                </div>
              </ClauseSectionDrawer>
            )}

          {/* GAVETA LATERAL: EXERCER OPÇÃO DE COMPRA DE EMPRÉSTIMO */}
          {activeTransferItem.contract.isLoan && hasBuyOption && (
            <ClauseSectionDrawer
              isOpen={activeSectionDrawer === "loanBuyOption"}
              onClose={() => {
                setActiveSectionDrawer(null);
                setLoanBuyOptionDateInput("");
              }}
              onCancel={() => {
                setActiveSectionDrawer(null);
                setLoanBuyOptionDateInput("");
              }}
              onSave={() => handleExerciseLoanBuyOption(activeTransferItem)}
              isSaving={isLoading}
              isConfirmDisabled={!isValidShortDate(loanBuyOptionDateInput)}
              title={
                activeTransferItem.contract.loanTerms?.buyOptionExercised
                  ? "Alterar Data do Exercício"
                  : "Exercer Opção de Compra"
              }
              saveLabel={
                activeTransferItem.contract.loanTerms?.buyOptionExercised
                  ? "Salvar Nova Data"
                  : "Confirmar Exercício"
              }
              cancelLabel="Cancelar"
              hubContainerId="mainClauseHubContainer"
              confirmTestId="btn-confirm-exercise-buy-option"
            >
              <div
                className={Styles.sellOnDrawerContent}
                data-testid="loan-buy-option-activation-box"
              >
                <div className={Styles.sellOnDrawerInfo}>
                  <p className={Styles.sellOnDrawerDesc}>
                    Informe a data (DD/MM) em que o clube exerceu a opção de
                    compra de{" "}
                    <strong>
                      {formatDisplayValue(
                        resolvedBuyOptionFee,
                        career.currency,
                      )}
                    </strong>
                    . A negociação passará a constar como venda concluída.
                  </p>
                </div>

                <div className={Styles.sellOnInputsColumn}>
                  <div className={Styles.sellOnFieldGroup}>
                    <label className={Styles.sellOnLabel}>
                      Data em que exerceu a opção (DD/MM)
                    </label>
                    <input
                      type="text"
                      className={Styles.sellOnInput}
                      placeholder="Ex: 15/01"
                      maxLength={5}
                      value={loanBuyOptionDateInput}
                      onChange={(e) =>
                        setLoanBuyOptionDateInput(
                          formatDateInputShort(e.target.value),
                        )
                      }
                      data-testid="loan-buy-option-date-input"
                    />
                  </div>
                </div>
              </div>
            </ClauseSectionDrawer>
          )}

          {/* ATLETA DE TROCA */}
          {activeTransferItem.contract.swapPlayer?.playerName && (
            <div className={Styles.operationalCard}>
              <div className={Styles.operationalCardTop}>
                <div className={Styles.operationalTitleGroup}>
                  <div
                    className={`${Styles.operationalIconBox} ${Styles.iconAmber}`}
                  >
                    <FaExchangeAlt />
                  </div>
                  <div>
                    <div className={Styles.operationalTitleRow}>
                      <h5 className={Styles.operationalTitle}>
                        Atleta Envolvido na Troca
                      </h5>
                      <span
                        className={
                          activeTransferItem.direction === "exit"
                            ? Styles.operationalTargetPillClubReceivable
                            : Styles.operationalTargetPillClub
                        }
                      >
                        <FaBuilding size={9} />{" "}
                        {activeTransferItem.direction === "exit"
                          ? "Acordo com o Clube"
                          : "A Entregar ao Clube Vendedor"}
                      </span>
                    </div>
                    <span className={Styles.operationalMetaText}>
                      Parte da composição do negócio
                    </span>
                  </div>
                </div>
              </div>
              <div className={Styles.swapPlayerDetailRow}>
                <span className={Styles.swapPlayerNameText}>
                  {activeTransferItem.contract.swapPlayer.playerName}
                </span>
                {activeTransferItem.contract.swapPlayer.playerValue ? (
                  <span className={Styles.swapPlayerValueBadge}>
                    Avaliado em:{" "}
                    {formatDisplayValue(
                      activeTransferItem.contract.swapPlayer.playerValue,
                      career.currency,
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {/* FECHAR PAINEL DE GERENCIAMENTO */}
      <div className={Styles.manageFooterActions}>
        <button
          type="button"
          className={Styles.btnBackToList}
          onClick={cancelInline}
        >
          <FaArrowLeft /> Voltar para a lista
        </button>
      </div>
    </div>
  );
};

export default ClauseOperationalManageView;
