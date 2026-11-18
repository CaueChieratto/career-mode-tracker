import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MdArrowBack } from "react-icons/md";
import { FaCalendarAlt, FaCheck } from "react-icons/fa";
import { TransferProposal } from "../../../common/interfaces/proposals/transferProposal";
import { Career } from "../../../common/interfaces/Career";
import { ClubData } from "../../../common/interfaces/club/clubData";
import { PlayerCircle } from "../../../components/PlayerCircle";
import {
  formatCompactNumber,
  getCurrencySymbol,
  parseValue,
} from "../../../common/utils/FormatValue";
import {
  formatDateInputShort,
  parseFullBrasilDate,
} from "../../../common/utils/Date";
import { getSeasonDateRange } from "../../../common/utils/GetSeasonDateRange";
import { resolveSeasonDate } from "../../../common/services/ServicePlayers/helpers/resolveSeasonDate";
import { leaguesByContinent } from "../../../common/utils/league";
import { lockBodyScroll } from "../../../common/utils/bodyScrollLock";
import { toast } from "../../../common/services/ToastService";
import {
  getPlayerOriginalContractYears,
  calculateContractUntilFromYears,
} from "../../../common/utils/calculateContractYears";
import Styles from "./ProposalConfirmationModal.module.css";

export interface ProposalConfirmationModalProps {
  isOpen: boolean;
  proposal: TransferProposal;
  career?: Career;
  season?: ClubData;
  onClose: () => void;
  onConfirm: (proposal: TransferProposal) => Promise<void> | void;
  isSubmitting?: boolean;
  currency?: string;
}

const getOperationTitle = (type: TransferProposal["type"]): string => {
  switch (type) {
    case "compra":
      return "Confirmação de Contratação Definitiva";
    case "emprestimo_entrada":
      return "Confirmação de Empréstimo de Entrada";
    case "venda":
      return "Confirmação de Venda de Atleta";
    case "emprestimo_saida":
      return "Confirmação de Empréstimo de Saída";
    case "renovacao":
      return "Confirmação de Renovação Contratual";
    default:
      return "Confirmação de Proposta";
  }
};

export const ProposalConfirmationModal: React.FC<
  ProposalConfirmationModalProps
> = ({
  isOpen,
  proposal,
  career,
  season,
  onClose,
  onConfirm,
  isSubmitting = false,
  currency = "€",
}) => {
  const {
    type,
    playerName,
    playerPosition,
    playerSector,
    playerAge,
    playerNation,
    playerValue,
    clubNegotiation,
    playerNegotiation,
    timing,
  } = proposal;

  const isRenewal = type === "renovacao";
  const isLoan = type === "emprestimo_entrada" || type === "emprestimo_saida";
  const hasClubStage = !isRenewal && clubNegotiation !== undefined;
  const hasPlayerStage = playerNegotiation !== undefined;

  const careerNation = career?.nation || "ESP";
  const seasonNumber = season?.seasonNumber || 1;
  const careerCreatedAt = useMemo(() => {
    return career?.createdAt ? new Date(career.createdAt) : new Date();
  }, [career?.createdAt]);

  const { startDate, endDate } = useMemo(() => {
    return getSeasonDateRange(seasonNumber, careerCreatedAt, careerNation);
  }, [seasonNumber, careerCreatedAt, careerNation]);

  const isEuropean = useMemo(() => {
    const europeanNations = Object.keys(leaguesByContinent.Europa);
    return europeanNations.includes(careerNation);
  }, [careerNation]);

  const [agreementDateInput, setAgreementDateInput] = useState<string>(() => {
    if (proposal.agreementDate) {
      const parts = proposal.agreementDate.split("/");
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    }
    return "";
  });

  // Travar o scroll do body enquanto o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;
    const unlock = lockBodyScroll();
    return () => {
      unlock();
    };
  }, [isOpen]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatDateInputShort(e.target.value);
    setAgreementDateInput(val);
  };

  const resolvedPreviewDate = useMemo(() => {
    if (agreementDateInput.length === 5) {
      try {
        return resolveSeasonDate(agreementDateInput, startDate, endDate);
      } catch {
        return "";
      }
    }
    return "";
  }, [agreementDateInput, startDate, endDate]);

  const currencySymbol = getCurrencySymbol(currency || career?.currency || "€");

  const formatMoney = useCallback(
    (val?: number): string => {
      if (val === undefined || val === null) return "-";
      return `${currencySymbol} ${formatCompactNumber(val)}`;
    },
    [currencySymbol],
  );

  const handleConfirm = () => {
    if (!agreementDateInput || agreementDateInput.trim().length !== 5) {
      toast.warning(
        "Por favor, informe a data do acordo no formato DD/MM (ex: 15/08).",
      );
      return;
    }

    const [dayStr, monthStr] = agreementDateInput.split("/");
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);

    if (
      isNaN(day) ||
      day < 1 ||
      day > 31 ||
      isNaN(month) ||
      month < 1 ||
      month > 12
    ) {
      toast.warning(
        "Data inválida. Informe um dia entre 01-31 e mês entre 01-12.",
      );
      return;
    }

    const fullDate = resolveSeasonDate(agreementDateInput, startDate, endDate);
    const parsed = parseFullBrasilDate(fullDate);

    if (!parsed || isNaN(parsed.getTime())) {
      toast.warning("Data do acordo inválida.");
      return;
    }

    if (parsed < startDate || parsed > endDate) {
      const startFmt = `${String(startDate.getDate()).padStart(2, "0")}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${startDate.getFullYear()}`;
      const endFmt = `${String(endDate.getDate()).padStart(2, "0")}/${String(endDate.getMonth() + 1).padStart(2, "0")}/${endDate.getFullYear()}`;
      toast.warning(
        `A data do acordo (${fullDate}) deve estar dentro do período da temporada ${isEuropean ? "europeia" : "corrente"} (${startFmt} a ${endFmt}).`,
      );
      return;
    }

    onConfirm({
      ...proposal,
      agreementDate: fullDate,
      playerNegotiation: proposal.playerNegotiation
        ? {
            ...proposal.playerNegotiation,
            durationYears: isRenewal
              ? totalContractYears
              : proposal.playerNegotiation.durationYears,
            contractUntil:
              isRenewal && calculatedContractUntil
                ? calculatedContractUntil
                : proposal.playerNegotiation.contractUntil,
          }
        : undefined,
    });
  };

  // Informações para o grid tático
  const playerInSeason = useMemo(() => {
    return season?.players?.find((p) => p.id === proposal.playerId);
  }, [season?.players, proposal.playerId]);

  const oldSalary = Number(playerInSeason?.salary || 0);

  const originalYears = useMemo(() => {
    if (!playerInSeason) return 0;
    return getPlayerOriginalContractYears(
      playerInSeason,
      career?.createdAt,
      seasonNumber,
      careerNation,
    );
  }, [playerInSeason, career?.createdAt, seasonNumber, careerNation]);

  const rawExtension = proposal.formState?.formValues?.contractTime;
  const extensionYears = useMemo(() => {
    if (rawExtension !== undefined && rawExtension !== "") {
      const parsed = parseInt(rawExtension, 10);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    if (playerNegotiation?.durationYears !== undefined && originalYears > 0) {
      return Math.max(0, playerNegotiation.durationYears - originalYears);
    }
    return 0;
  }, [rawExtension, playerNegotiation?.durationYears, originalYears]);

  const totalContractYears = useMemo(() => {
    if (isRenewal) {
      const calculated = originalYears + extensionYears;
      return calculated > 0
        ? calculated
        : Math.max(1, playerNegotiation?.durationYears || 1);
    }
    if (
      playerNegotiation?.durationYears !== undefined &&
      playerNegotiation.durationYears > 0
    ) {
      return playerNegotiation.durationYears;
    }
    return Math.max(1, originalYears + extensionYears);
  }, [
    isRenewal,
    originalYears,
    extensionYears,
    playerNegotiation?.durationYears,
  ]);

  const calculatedContractUntil = useMemo(() => {
    if (isRenewal) {
      const date = calculateContractUntilFromYears(
        totalContractYears,
        career?.createdAt,
        seasonNumber,
        careerNation,
      );
      if (date) return date;
    }
    return playerNegotiation?.contractUntil || "";
  }, [
    isRenewal,
    totalContractYears,
    career?.createdAt,
    seasonNumber,
    careerNation,
    playerNegotiation?.contractUntil,
  ]);

  const renewalSalary = playerNegotiation?.weeklyWage || 0;
  const annualSalary = renewalSalary * 52;
  const signingBonus = playerNegotiation?.signingBonus || 0;
  const performanceBonuses = playerNegotiation?.performanceBonuses || [];
  const bonusesTotal = performanceBonuses.reduce(
    (acc, b) => acc + (b.value || 0),
    0,
  );
  const totalGuaranteed =
    annualSalary * Math.max(1, totalContractYears) + signingBonus;

  const hasBuyOption = Boolean(
    clubNegotiation?.loanTerms?.hasBuyOption ||
    (clubNegotiation?.loanTerms?.buyOptionFee &&
      clubNegotiation.loanTerms.buyOptionFee > 0) ||
    (proposal.formState?.formValues?.buyOption &&
      parseValue(proposal.formState.formValues.buyOption) > 0),
  );
  const buyOptionFee =
    clubNegotiation?.loanTerms?.buyOptionFee ||
    parseValue(proposal.formState?.formValues?.buyOption || "0");
  const sellOnPct =
    clubNegotiation?.loanTerms?.sellOnPercentage ||
    Number(proposal.formState?.formValues?.sellOnPercentage || 0);

  const calculatedWeeklyWageInfo = useMemo(() => {
    if (!isLoan) return null;
    const isExitLoan =
      proposal.type === "emprestimo_saida" || type === "emprestimo_saida";
    if (isExitLoan) {
      const baseSalary =
        playerInSeason?.salary ||
        parseValue(proposal.formState?.formValues?.salary || "0");
      const theirPct =
        clubNegotiation?.loanTerms?.theirWagePercentage ??
        Number(proposal.formState?.formValues?.wagePercentage || 100);
      const ourPct = Math.max(0, 100 - theirPct);
      const weeklyCost = Math.round((baseSalary * ourPct) / 100);
      return {
        value: `${formatMoney(weeklyCost)} /sem`,
        subtext:
          ourPct > 0
            ? `${ourPct}% pago por nós (${formatMoney(baseSalary)} total)`
            : `100% pago pelo parceiro (${formatMoney(baseSalary)} total)`,
      };
    } else {
      const baseSalary =
        playerNegotiation?.weeklyWage ||
        parseValue(proposal.formState?.formValues?.salary || "0");
      const ourPct =
        clubNegotiation?.loanTerms?.ourWagePercentage ??
        Number(proposal.formState?.formValues?.wagePercentage || 100);
      const weeklyCost = Math.round((baseSalary * ourPct) / 100);
      return {
        value: `${formatMoney(weeklyCost)} /sem`,
        subtext: `${ourPct}% pago por nós (${formatMoney(baseSalary)} total)`,
      };
    }
  }, [
    isLoan,
    proposal.type,
    proposal.formState?.formValues,
    type,
    playerInSeason?.salary,
    clubNegotiation?.loanTerms,
    playerNegotiation?.weeklyWage,
    formatMoney,
  ]);

  const operationValue =
    clubNegotiation?.transferFee !== undefined
      ? formatMoney(clubNegotiation.transferFee)
      : isRenewal
        ? "Renovação"
        : formatMoney(playerValue);

  const operationPartner =
    clubNegotiation?.partnerClub || (isRenewal ? "Atleta do Elenco" : "-");

  const weeklyWageText = playerNegotiation?.weeklyWage
    ? `${formatMoney(playerNegotiation.weeklyWage)} /sem`
    : "Não especificado";

  const contractDurationText = playerNegotiation?.durationYears
    ? `${playerNegotiation.durationYears} ${playerNegotiation.durationYears === 1 ? "Ano" : "Anos"}`
    : "1 Temporada";

  const contractUntilSubtext = playerNegotiation?.contractUntil
    ? `Até ${playerNegotiation.contractUntil}`
    : "Vínculo Padrão";

  if (!isOpen) return null;

  return (
    <div
      className={Styles.container}
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposalModalTitle"
    >
      {/* Top Header com navegação limpa */}
      <header className={Styles.topHeader}>
        <div className={Styles.headerMeta}>
          <span className={Styles.headerTag}>Modo Carreira • Gestão</span>
          <h2 id="proposalModalTitle" className={Styles.headerTitle}>
            {getOperationTitle(type)}
          </h2>
        </div>
        <button
          type="button"
          className={Styles.backButton}
          onClick={onClose}
          disabled={isSubmitting}
          data-testid="proposal-modal-close"
          aria-label="Voltar"
        >
          <MdArrowBack /> Voltar
        </button>
      </header>

      {/* Conteúdo Central Scrollável */}
      <main className={Styles.content}>
        {/* Card do Atleta com Ícone Neutro */}
        <div className={Styles.playerHeroCard}>
          <PlayerCircle isSquad={false} />
          <div className={Styles.playerHeroInfo}>
            <div className={Styles.playerNameRow}>
              <h3 className={Styles.playerName}>{playerName}</h3>
            </div>
            <p className={Styles.playerDetails}>
              {playerPosition} • {playerSector}
              {playerAge ? ` • ${playerAge} anos` : ""}
              {playerNation ? ` • ${playerNation}` : ""}
            </p>
            {hasClubStage && (
              <p className={Styles.partnerClubDetail}>
                Origem/Destino: <strong>{operationPartner}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Grid Tático 2x2 de Métricas Rápidas */}
        {isRenewal ? (
          <div className={Styles.tacticalGrid}>
            {/* Card 1: Investimento Garantido */}
            <div className={Styles.tacticalCard}>
              <span className={Styles.tacticalLabel}>
                Investimento Garantido
              </span>
              <span className={`${Styles.tacticalValue} ${Styles.accentValue}`}>
                {formatMoney(totalGuaranteed)}
              </span>
              <span className={Styles.tacticalSubtext}>
                {`${formatMoney(annualSalary)}/ano em salários${
                  signingBonus > 0
                    ? ` + ${formatMoney(signingBonus)} em luvas`
                    : ""
                }`}
              </span>
            </div>

            {/* Card 2: Salário Semanal */}
            <div className={Styles.tacticalCard}>
              <span className={Styles.tacticalLabel}>Salário Semanal</span>
              <span className={`${Styles.tacticalValue} ${Styles.wageValue}`}>
                {`${formatMoney(renewalSalary)} /sem`}
              </span>
              <span className={Styles.tacticalSubtext}>
                {oldSalary > 0
                  ? `Anterior: ${formatMoney(oldSalary)}/sem`
                  : "Folha Salarial"}
              </span>
            </div>

            {/* Card 3: Extensão de Vínculo */}
            <div className={Styles.tacticalCard}>
              <span className={Styles.tacticalLabel}>Extensão de Vínculo</span>
              <span className={Styles.tacticalValue}>
                {extensionYears === 0
                  ? "Sem extensão (+0)"
                  : `+${extensionYears} ${
                      extensionYears === 1 ? "ano" : "anos"
                    } de extensão`}
              </span>
              <span className={Styles.tacticalSubtext}>
                {`${originalYears} + ${extensionYears} = ${totalContractYears} ${
                  totalContractYears === 1 ? "ano" : "anos"
                }${
                  calculatedContractUntil
                    ? ` (até ${calculatedContractUntil})`
                    : ""
                }`}
              </span>
            </div>

            {/* Card 4: Custos Adicionais */}
            <div className={Styles.tacticalCard}>
              <span className={Styles.tacticalLabel}>Custos Adicionais</span>
              <span className={`${Styles.tacticalValue} ${Styles.timingValue}`}>
                {signingBonus > 0 || bonusesTotal > 0
                  ? formatMoney(signingBonus + bonusesTotal)
                  : "Sem custos extras"}
              </span>
              <span className={Styles.tacticalSubtext}>
                {signingBonus > 0 && bonusesTotal > 0
                  ? `${formatMoney(signingBonus)} luvas + ${formatMoney(
                      bonusesTotal,
                    )} metas`
                  : signingBonus > 0
                    ? `${formatMoney(signingBonus)} em luvas de assinatura`
                    : bonusesTotal > 0
                      ? `${performanceBonuses.length} ${
                          performanceBonuses.length === 1
                            ? "meta acordada"
                            : "metas acordadas"
                        }`
                      : "Nenhum bônus extra acordado"}
              </span>
            </div>
          </div>
        ) : (
          <div className={Styles.tacticalGrid}>
            {/* Card 1: Valor da Operação ou Modelo de Operação */}
            <div className={Styles.tacticalCard}>
              <span className={Styles.tacticalLabel}>
                {isLoan ? "Modelo de Operação" : "Valor da Operação"}
              </span>
              <span className={`${Styles.tacticalValue} ${Styles.accentValue}`}>
                {isLoan ? "Empréstimo" : operationValue}
              </span>
              <span className={Styles.tacticalSubtext}>
                {isLoan
                  ? `Origem: ${operationPartner}`
                  : isRenewal
                    ? "Manutenção"
                    : operationPartner}
              </span>
            </div>

            {/* Card 2: Custo Semanal */}
            <div className={Styles.tacticalCard}>
              <span className={Styles.tacticalLabel}>Custo Semanal</span>
              <span className={`${Styles.tacticalValue} ${Styles.wageValue}`}>
                {calculatedWeeklyWageInfo
                  ? calculatedWeeklyWageInfo.value
                  : weeklyWageText}
              </span>
              <span className={Styles.tacticalSubtext}>
                {calculatedWeeklyWageInfo
                  ? calculatedWeeklyWageInfo.subtext
                  : "Folha Salarial"}
              </span>
            </div>

            {/* Card 3: Duração do Contrato / Empréstimo */}
            <div className={Styles.tacticalCard}>
              <span className={Styles.tacticalLabel}>
                {isLoan ? "Duração" : "Vínculo"}
              </span>
              <span className={Styles.tacticalValue}>
                {isLoan
                  ? (() => {
                      const raw =
                        proposal.formState?.formValues?.loanDuration ||
                        (clubNegotiation?.loanTerms?.durationYears
                          ? String(clubNegotiation.loanTerms.durationYears)
                          : "1");
                      const parsed = parseInt(raw, 10);
                      return !isNaN(parsed)
                        ? `${parsed} ${parsed === 1 ? "Ano" : "Anos"}`
                        : raw.toLowerCase().includes("ano")
                          ? raw
                          : `${raw} Ano(s)`;
                    })()
                  : contractDurationText}
              </span>
              <span className={Styles.tacticalSubtext}>
                {isLoan ? "Período de Empréstimo" : contractUntilSubtext}
              </span>
            </div>

            {/* Cards de Opção de Compra em Empréstimos */}
            {isLoan && (
              <div
                className={Styles.tacticalCard}
                data-testid="tactical-card-loan-buy-option"
              >
                <span className={Styles.tacticalLabel}>Opção de Compra</span>
                <span className={Styles.tacticalValue}>
                  {hasBuyOption ? "Fixada" : "Sem opção"}
                </span>
                <span className={Styles.tacticalSubtext}>
                  {hasBuyOption ? "Cláusula acordada" : "Empréstimo simples"}
                </span>
              </div>
            )}

            {isLoan && hasBuyOption && (
              <div
                className={Styles.tacticalCard}
                data-testid="tactical-card-loan-buy-option-value"
              >
                <span className={Styles.tacticalLabel}>Valor da Opção</span>
                <span
                  className={`${Styles.tacticalValue} ${Styles.accentValue}`}
                >
                  {formatMoney(buyOptionFee)}
                </span>
                <span className={Styles.tacticalSubtext}>
                  {sellOnPct > 0
                    ? `${sellOnPct}% de mais-valia em revenda`
                    : "Sem cláusula de revenda"}
                </span>
              </div>
            )}

            {/* Card Janela de Efetivação: Oculto para Empréstimos */}
            {!isLoan && (
              <div className={Styles.tacticalCard}>
                <span className={Styles.tacticalLabel}>
                  Janela de Efetivação
                </span>
                <span
                  className={`${Styles.tacticalValue} ${Styles.timingValue}`}
                >
                  {timing || "Imediata"}
                </span>
                <span className={Styles.tacticalSubtext}>
                  Entrada no Elenco
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bloco de Data do Acordo (DD/MM) Obrigatório */}
        <div className={Styles.dateSectionCard}>
          <div className={Styles.dateHeader}>
            <div className={Styles.dateIconBox}>
              <FaCalendarAlt />
            </div>
            <div className={Styles.dateHeaderText}>
              <label htmlFor="agreementDateInput" className={Styles.dateLabel}>
                {isRenewal
                  ? "Data da Renovação (DD/MM) *"
                  : "Data do Acordo (DD/MM) *"}
              </label>
              <span className={Styles.dateSublabel}>
                Calendário {isEuropean ? "Europeu" : "Nacional"} (Temporada{" "}
                {seasonNumber})
              </span>
            </div>
          </div>

          <div className={Styles.dateInputWrapper}>
            <input
              id="agreementDateInput"
              type="text"
              placeholder="DD/MM (Ex: 15/08)"
              maxLength={5}
              value={agreementDateInput}
              onChange={handleDateChange}
              className={Styles.dateInput}
              autoComplete="off"
            />
          </div>

          {resolvedPreviewDate && (
            <p className={Styles.dateResolvedInfo}>
              ✓ Data oficial registrada: <strong>{resolvedPreviewDate}</strong>
            </p>
          )}
        </div>

        {/* Resumo de Cláusulas Contratuais Adicionais */}
        {(hasClubStage || hasPlayerStage) && (
          <div className={Styles.clausesBlock}>
            <h4 className={Styles.clausesTitle}>
              Condições & Cláusulas Acordadas
            </h4>
            <div className={Styles.pillsContainer}>
              {playerNegotiation?.signingBonus !== undefined &&
                playerNegotiation.signingBonus > 0 && (
                  <span className={`${Styles.clausePill} ${Styles.pillGreen}`}>
                    Luvas: {formatMoney(playerNegotiation.signingBonus)}
                  </span>
                )}

              {!isRenewal &&
                playerNegotiation?.agentFee !== undefined &&
                playerNegotiation.agentFee > 0 && (
                  <span className={`${Styles.clausePill} ${Styles.pillPurple}`}>
                    Agência: {formatMoney(playerNegotiation.agentFee)}
                  </span>
                )}

              {playerNegotiation?.releaseClause !== undefined &&
                playerNegotiation.releaseClause > 0 && (
                  <span className={`${Styles.clausePill} ${Styles.pillBlue}`}>
                    Multa: {formatMoney(playerNegotiation.releaseClause)}
                  </span>
                )}

              {playerNegotiation?.wageAdjustment?.percentage !== undefined &&
                playerNegotiation.wageAdjustment.percentage > 0 && (
                  <span className={`${Styles.clausePill} ${Styles.pillAmber}`}>
                    Reajuste {playerNegotiation.wageAdjustment.percentage}% (
                    {playerNegotiation.wageAdjustment.targetObjective})
                  </span>
                )}

              {clubNegotiation?.installments && (
                <span className={`${Styles.clausePill} ${Styles.pillBlue}`}>
                  Parcelado:{" "}
                  {formatMoney(clubNegotiation.installments.upfrontValue)} à
                  vista + {clubNegotiation.installments.totalInstallments}x
                </span>
              )}

              {clubNegotiation?.sellOnPercentage !== undefined && (
                <span className={`${Styles.clausePill} ${Styles.pillPurple}`}>
                  Mais-Valia: {clubNegotiation.sellOnPercentage}%
                </span>
              )}

              {clubNegotiation?.buybackValue !== undefined && (
                <span className={`${Styles.clausePill} ${Styles.pillGreen}`}>
                  Recompra: {formatMoney(clubNegotiation.buybackValue)}
                </span>
              )}

              {clubNegotiation?.firstRefusal && (
                <span className={`${Styles.clausePill} ${Styles.pillBlue}`}>
                  Preferência de Compra
                </span>
              )}

              {clubNegotiation?.loanTerms?.hasBuyOption &&
                (clubNegotiation.loanTerms.buyOptionFee || 0) > 0 && (
                  <span className={`${Styles.clausePill} ${Styles.pillGreen}`}>
                    Opção de Compra:{" "}
                    {formatMoney(clubNegotiation.loanTerms.buyOptionFee)}
                  </span>
                )}

              {clubNegotiation?.loanTerms?.sellOnPercentage !== undefined &&
                clubNegotiation.loanTerms.sellOnPercentage > 0 && (
                  <span className={`${Styles.clausePill} ${Styles.pillPurple}`}>
                    Mais-Valia Futura:{" "}
                    {clubNegotiation.loanTerms.sellOnPercentage}%
                  </span>
                )}

              {clubNegotiation?.loanTerms?.ourWagePercentage !== undefined && (
                <span className={`${Styles.clausePill} ${Styles.pillAmber}`}>
                  Divisão Salarial:{" "}
                  {clubNegotiation.loanTerms.ourWagePercentage}% pago pelo clube
                </span>
              )}

              {clubNegotiation?.loanBackDuration && (
                <span className={`${Styles.clausePill} ${Styles.pillAmber}`}>
                  Empréstimo Reverso: {clubNegotiation.loanBackDuration}{" "}
                  {clubNegotiation.loanBackDuration === 1
                    ? "temporada"
                    : "temporadas"}
                </span>
              )}

              {clubNegotiation?.bonuses &&
                clubNegotiation.bonuses.map((b, idx) => {
                  const countVal = b.targetCount ?? b.metricTarget;
                  const title = countVal
                    ? `${countVal} ${b.name || b.targetObjective}`
                    : b.name || b.targetObjective;
                  return (
                    <span
                      key={`club_b_${idx}`}
                      className={`${Styles.clausePill} ${Styles.pillGreen}`}
                    >
                      Meta Clube: {title} ({formatMoney(b.value)})
                    </span>
                  );
                })}

              {playerNegotiation?.performanceBonuses &&
                playerNegotiation.performanceBonuses.map((b, idx) => (
                  <span
                    key={`player_b_${idx}`}
                    className={`${Styles.clausePill} ${Styles.pillGreen}`}
                  >
                    Meta Atleta: {b.name || b.targetObjective} (
                    {formatMoney(b.value)})
                  </span>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer Fixo com Botão "Finalizar Transferência" */}
      <footer className={Styles.bottomBar}>
        <button
          type="button"
          className={Styles.finalizeButton}
          onClick={handleConfirm}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          <FaCheck />
          <span>
            {isSubmitting
              ? "Finalizando..."
              : isRenewal
                ? "Finalizar Renovação"
                : isLoan
                  ? "Finalizar Empréstimo"
                  : "Finalizar Transferência"}
          </span>
        </button>
      </footer>
    </div>
  );
};

export default ProposalConfirmationModal;
