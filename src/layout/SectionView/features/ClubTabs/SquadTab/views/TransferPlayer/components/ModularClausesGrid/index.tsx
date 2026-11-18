import React from "react";
import { BooleanValues, FormValues } from "../../types";
import { TransferBonus } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import {
  formatDisplayValue,
  parseValue,
} from "../../../../../../../../../common/utils/FormatValue";
import Styles from "./ModularClausesGrid.module.css";
import {
  FaPercentage,
  FaExchangeAlt,
  FaTrophy,
  FaHandshake,
  FaChevronRight,
  FaFileContract,
  FaArrowLeft,
  FaUser,
  FaBuilding,
} from "react-icons/fa";

interface ModularClausesGridProps {
  booleanValues?: BooleanValues;
  formValues: FormValues;
  bonuses: TransferBonus[];
  currency?: string;
  mode?: "transfer" | "renewal";
  direction?: "arrivals" | "exit" | "renewals";
  isFromLoanBuyOption?: boolean;
  hidePlayerCards?: boolean;
  onlyPlayerCards?: boolean;
  onOpenContract?: () => void;
  onOpenTransferDetails?: () => void;
  onOpenInstallments?: () => void;
  onOpenPlayerSwap?: () => void;
  onOpenBonus: () => void;
  onOpenOtherClauses: () => void;
  onOpenPlayerBonus?: () => void;
  onOpenPlayerOtherClauses?: () => void;
  onBackToList?: () => void;
}

export const ModularClausesGrid: React.FC<ModularClausesGridProps> = ({
  booleanValues = {
    isRetirement: false,
    isEndContract: false,
    isReturnLoan: false,
    hasInstallments: false,
    hasPlayerSwap: false,
    hasBonus: false,
    hasOtherClauses: false,
    firstRefusal: false,
  },
  formValues,
  bonuses,
  currency = "EUR",
  mode = "transfer",
  direction,
  isFromLoanBuyOption = false,
  hidePlayerCards = false,
  onlyPlayerCards = false,
  onOpenContract,
  onOpenTransferDetails,
  onOpenInstallments,
  onOpenPlayerSwap,
  onOpenBonus,
  onOpenOtherClauses,
  onOpenPlayerBonus,
  onOpenPlayerOtherClauses,
  onBackToList,
}) => {
  const isArrivals = direction === "arrivals";
  const isRenewal = mode === "renewal";
  const isExit = direction === "exit";
  const isOnlyPlayerCards = Boolean(onlyPlayerCards);

  // Se for chegadas e não for apenas renovação isolada nem compra por opção de empréstimo nem modo restrito ao jogador, exibimos os 6 cards (4 clube + 2 jogador)
  const isArrivalsSixCards =
    isArrivals &&
    !isRenewal &&
    !isFromLoanBuyOption &&
    !hidePlayerCards &&
    !isOnlyPlayerCards;

  const totalFee = parseValue(
    isArrivals
      ? formValues.buyValue || formValues.transferFee || "0"
      : formValues.sellValue || formValues.transferFee || "0",
  );
  const isInstallmentsActive = Boolean(
    booleanValues.hasInstallments &&
      formValues.installmentsPercentage &&
      formValues.installmentsPercentage !== "Nenhum" &&
      formValues.installmentsPercentage !== "Sem parcelas",
  );
  const pct = parseInt(formValues.installmentsPercentage || "20", 10) || 20;
  const installmentTotal = Math.round(totalFee * (pct / 100));
  const installmentYears =
    parseInt(formValues.installmentsYears || "2", 10) || 2;
  const perSeason = Math.round(installmentTotal / installmentYears);

  // Cláusulas especiais do jogador (Multa rescisória e Reajuste salarial)
  const hasRenewalRelease = Boolean(
    formValues.releaseClause &&
    formValues.releaseClause.trim() !== "" &&
    formValues.releaseClause !== "0",
  );
  const hasRenewalWageAdj = Boolean(
    formValues.wageAdjustmentType && formValues.wageAdjustmentType !== "N/D",
  );
  const playerSpecialCount =
    (hasRenewalRelease ? 1 : 0) + (hasRenewalWageAdj ? 1 : 0);

  // Cláusulas especiais com o clube (Recompra, Venda futura %, Preferência, Emprestar de volta)
  const clubSpecialCount = [
    Boolean(
      formValues.loanBackDuration && formValues.loanBackDuration !== "Nenhum",
    ),
    Boolean(formValues.buybackValue),
    Boolean(booleanValues.firstRefusal),
    Boolean(
      formValues.sellOnPercentage && formValues.sellOnPercentage !== "Nenhum",
    ),
  ].filter(Boolean).length;

  // Bônus do clube vs bônus do jogador
  const clubBonuses =
    hidePlayerCards || isExit
      ? bonuses.filter((b) => (b as { bonusOrigin?: string }).bonusOrigin !== "player")
      : isArrivalsSixCards
        ? bonuses.filter((b) => Boolean(b.partnerClub))
        : [];

  const playerBonuses =
    isArrivalsSixCards || isFromLoanBuyOption || isOnlyPlayerCards
      ? bonuses.filter((b) => !b.partnerClub)
      : isRenewal
        ? bonuses
        : [];

  const subtitleBadgeText = isOnlyPlayerCards
    ? onOpenContract
      ? "3 Módulos Operacionais (Termos do Atleta)"
      : "2 Módulos Operacionais"
    : isFromLoanBuyOption
      ? "3 Módulos Operacionais (Termos do Atleta)"
      : isArrivalsSixCards
        ? onOpenTransferDetails
          ? "7 Módulos Operacionais (5 Clube Vendedor • 2 Jogador)"
          : "6 Módulos Operacionais (4 Clube Vendedor • 2 Jogador)"
        : isRenewal
          ? onOpenContract
            ? "3 Módulos Operacionais"
            : "2 Módulos Operacionais"
          : onOpenTransferDetails
            ? "5 Módulos Operacionais (Clube)"
            : "4 Módulos Operacionais";

  return (
    <div className={Styles.gridContainer}>
      <div className={Styles.titleHeader}>
        <div className={Styles.titleWrapper}>
          <div className={Styles.titleIcon}>
            <FaFileContract />
          </div>
          <h3 className={Styles.title}>
            {isRenewal
              ? "Cláusulas de Renovação"
              : "Painel Modular de Cláusulas Contratuais"}
          </h3>
        </div>
        <span className={Styles.subtitleBadge}>{subtitleBadgeText}</span>
      </div>

      <div
        className={`${Styles.grid} ${
          isRenewal || isFromLoanBuyOption || isOnlyPlayerCards ? Styles.gridSingleColumn : ""
        }`}
      >
        {/* CARD 0: INFORMAÇÕES DO CONTRATO (renovações, compras por opção de empréstimo e termos do atleta quando onOpenContract é fornecido) */}
        {(isRenewal || isFromLoanBuyOption || isOnlyPlayerCards) && onOpenContract && (
          <div
            className={Styles.card}
            onClick={onOpenContract}
            data-testid="modular-card-contract-info"
          >
            <div>
              <div className={Styles.cardTop}>
                <div className={Styles.cardTitleWrapper}>
                  <div className={`${Styles.iconBox} ${Styles.iconBlue}`}>
                    <FaFileContract />
                  </div>
                  <div className={Styles.cardTitleColumn}>
                    <h4 className={Styles.cardTitle}>
                      1. Informações do Contrato
                    </h4>
                    <span className={Styles.targetBadgePlayer}>
                      <FaUser size={9} /> A Pagar ao Jogador
                    </span>
                  </div>
                </div>
                <span
                  className={`${Styles.badge} ${
                    parseValue(formValues.salary || "0") > 0
                      ? Styles.badgeActive
                      : Styles.badgeInactive
                  }`}
                >
                  {parseValue(formValues.salary || "0") > 0
                    ? `${formatDisplayValue(parseValue(formValues.salary || "0"), currency)} /sem`
                    : "Pendente"}
                </span>
              </div>
              <p className={Styles.cardDescription}>
                Salário:{" "}
                <strong>
                  {formValues.salary
                    ? `${formatDisplayValue(parseValue(formValues.salary), currency)} /sem`
                    : "Não informado"}
                </strong>
                {" • "}
                {isRenewal ? "Extensão: " : "Duração: "}
                <strong>
                  {formValues.contractTime || 1}{" "}
                  {formValues.contractTime === "1" ? "ano" : "anos"}
                  {formValues.contractUntil
                    ? ` (até ${formValues.contractUntil})`
                    : ""}
                </strong>
                {" • "}
                Luvas:{" "}
                <strong>
                  {formValues.signingBonus &&
                  parseValue(formValues.signingBonus) > 0
                    ? formatDisplayValue(
                        parseValue(formValues.signingBonus),
                        currency,
                      )
                    : "Sem luvas"}
                </strong>
                {formValues.agentFee && parseValue(formValues.agentFee) > 0 && (
                  <>
                    {" • "}
                    Agência:{" "}
                    <strong>
                      {formatDisplayValue(
                        parseValue(formValues.agentFee),
                        currency,
                      )}
                    </strong>
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenContract();
              }}
              className={`${Styles.actionButton} ${Styles.actionButtonBlue}`}
            >
              <span>Ajustar Informações do Contrato</span>
              <FaChevronRight size={10} />
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* BLOCO 1: CARDS DO CLUBE (4 CARDS: PARCELAS, TROCA, BÔNUS, OUTROS + CARD 0 DETALHES BÁSICOS) */}
        {/* ============================================================== */}
        {!isRenewal && !isFromLoanBuyOption && !isOnlyPlayerCards && (
          <>
            {/* CARD 0: DATA DE SAÍDA / MOMENTO & TAXA DE TRANSFERÊNCIA */}
            {onOpenTransferDetails && (
              <div
                className={Styles.card}
                onClick={onOpenTransferDetails}
                data-testid="modular-card-transfer-details"
              >
                <div>
                  <div className={Styles.cardTop}>
                    <div className={Styles.cardTitleWrapper}>
                      <div className={`${Styles.iconBox} ${Styles.iconBlue}`}>
                        <FaFileContract />
                      </div>
                      <div className={Styles.cardTitleColumn}>
                        <h4 className={Styles.cardTitle}>
                          {isExit
                            ? "0. Data de Saída & Taxa de Transferência"
                            : "0. Momento & Taxa de Transferência"}
                        </h4>
                        <span
                          className={
                            direction === "exit"
                              ? Styles.targetBadgeClubReceivable
                              : Styles.targetBadgeClub
                          }
                        >
                          <FaBuilding size={9} />{" "}
                          {direction === "exit"
                            ? "A Receber do Clube"
                            : "A Pagar ao Clube Vendedor"}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`${Styles.badge} ${
                        totalFee > 0 ? Styles.badgeActive : Styles.badgeInactive
                      }`}
                    >
                      {totalFee > 0
                        ? formatDisplayValue(totalFee, currency)
                        : "Pendente"}
                    </span>
                  </div>
                  <p className={Styles.cardDescription}>
                    {isExit ? "Data de Saída: " : "Momento: "}
                    <strong>{formValues.timing || "Imediata"}</strong>
                    {" • "}
                    Taxa:{" "}
                    <strong>
                      {totalFee > 0
                        ? formatDisplayValue(totalFee, currency)
                        : "Não informada"}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTransferDetails();
                  }}
                  className={`${Styles.actionButton} ${Styles.actionButtonBlue}`}
                >
                  <span>Ajustar Data & Taxa</span>
                  <FaChevronRight size={10} />
                </button>
              </div>
            )}

            {/* CARD 1: PARCELAMENTO */}
            <div className={Styles.card}>
              <div>
                <div className={Styles.cardTop}>
                  <div className={Styles.cardTitleWrapper}>
                    <div className={`${Styles.iconBox} ${Styles.iconBlue}`}>
                      <FaPercentage />
                    </div>
                    <div className={Styles.cardTitleColumn}>
                      <h4 className={Styles.cardTitle}>1. Parcelamento</h4>
                      <span
                        className={
                          direction === "exit"
                            ? Styles.targetBadgeClubReceivable
                            : Styles.targetBadgeClub
                        }
                      >
                        <FaBuilding size={9} />{" "}
                        {direction === "exit"
                          ? "A Receber do Clube"
                          : "A Pagar ao Clube Vendedor"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${Styles.badge} ${
                      isInstallmentsActive
                        ? Styles.badgeActive
                        : Styles.badgeInactive
                    }`}
                  >
                    {isInstallmentsActive
                      ? `${pct}% Ativo`
                      : "Inativo"}
                  </span>
                </div>
                <p className={Styles.cardDescription}>
                  {isInstallmentsActive ? (
                    <>
                      <strong>
                        {formatDisplayValue(installmentTotal, currency)}
                      </strong>{" "}
                      parcelados em{" "}
                      <strong>{installmentYears} temporadas</strong> (
                      {formatDisplayValue(perSeason, currency)} / temp).
                    </>
                  ) : direction === "exit" ? (
                    "Nenhum parcelamento configurado. O valor será recebido integralmente à vista."
                  ) : (
                    "Nenhum parcelamento configurado. O valor será pago integralmente à vista."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInstallments?.();
                }}
                className={`${Styles.actionButton} ${Styles.actionButtonBlue}`}
              >
                <span>Configurar Parcelamento</span>
                <FaChevronRight size={10} />
              </button>
            </div>

            {/* CARD 2: ATLETA DE TROCA */}
            <div className={Styles.card}>
              <div>
                <div className={Styles.cardTop}>
                  <div className={Styles.cardTitleWrapper}>
                    <div className={`${Styles.iconBox} ${Styles.iconAmber}`}>
                      <FaExchangeAlt />
                    </div>
                    <div className={Styles.cardTitleColumn}>
                      <h4 className={Styles.cardTitle}>2. Atleta de Troca</h4>
                      <span
                        className={
                          direction === "exit"
                            ? Styles.targetBadgeClubReceivable
                            : Styles.targetBadgeClub
                        }
                      >
                        <FaBuilding size={9} />{" "}
                        {direction === "exit"
                          ? "Acordo com o Clube"
                          : "A Entregar ao Clube Vendedor"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${Styles.badge} ${
                      booleanValues.hasPlayerSwap && formValues.swapPlayerName
                        ? Styles.badgeActive
                        : Styles.badgeInactive
                    }`}
                  >
                    {booleanValues.hasPlayerSwap && formValues.swapPlayerName
                      ? "1 Atleta"
                      : "Nenhum"}
                  </span>
                </div>
                <p className={Styles.cardDescription}>
                  {booleanValues.hasPlayerSwap && formValues.swapPlayerName ? (
                    <>
                      <strong>{formValues.swapPlayerName}</strong> (
                      {formValues.swapPlayerPosition || "Posição N/D"}
                      {formValues.swapPlayerSector
                        ? ` • ${formValues.swapPlayerSector}`
                        : ""}
                      {formValues.swapPlayerValue
                        ? ` • Avaliado em ${formValues.swapPlayerValue}`
                        : ""}
                      ).
                    </>
                  ) : direction === "arrivals" ? (
                    "Nenhum atleta do clube incluído na negociação desta contratação."
                  ) : (
                    "Nenhum jogador incluído como parte do pagamento desta transferência."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPlayerSwap?.();
                }}
                className={`${Styles.actionButton} ${Styles.actionButtonAmber}`}
              >
                <span>Gerenciar Jogador</span>
                <FaChevronRight size={10} />
              </button>
            </div>

            {/* CARD 3: BÔNUS & METAS (CLUBE) */}
            <div className={Styles.card} onClick={onOpenBonus}>
              <div>
                <div className={Styles.cardTop}>
                  <div className={Styles.cardTitleWrapper}>
                    <div className={`${Styles.iconBox} ${Styles.iconEmerald}`}>
                      <FaTrophy />
                    </div>
                    <div className={Styles.cardTitleColumn}>
                      <h4 className={Styles.cardTitle}>
                        {isArrivalsSixCards
                          ? "3. Bônus & Metas (Clube)"
                          : "3. Bônus & Metas"}
                      </h4>
                      <span
                        className={
                          direction === "exit"
                            ? Styles.targetBadgeClubReceivable
                            : Styles.targetBadgeClub
                        }
                      >
                        <FaBuilding size={9} />{" "}
                        {direction === "exit"
                          ? "A Receber do Clube"
                          : "A Pagar ao Clube Vendedor"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${Styles.badge} ${
                      clubBonuses.length > 0
                        ? Styles.badgeActive
                        : Styles.badgeInactive
                    }`}
                  >
                    {clubBonuses.length > 0
                      ? `${clubBonuses.length} ${clubBonuses.length === 1 ? "Meta Ativa" : "Metas Ativas"}`
                      : "Nenhum"}
                  </span>
                </div>
                <p className={Styles.cardDescription}>
                  {clubBonuses.length > 0 ? (
                    <>
                      {clubBonuses
                        .map((b) => {
                          const count = b.targetCount ?? b.metricTarget;
                          const isPerf =
                            b.bonusCategory === "Desempenho" ||
                            b.category === "performance";
                          const label =
                            isPerf && count
                              ? `${count} ${b.bonusTarget || b.name}`
                              : b.bonusTarget || b.name;
                          return `${label} (${formatDisplayValue(b.value, currency)})`;
                        })
                        .join(", ")}
                    </>
                  ) : direction === "exit" ? (
                    "Nenhum bônus por conquista acordado para receber do clube comprador."
                  ) : (
                    "Nenhum bônus por meta ou conquista configurado para o clube vendedor."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBonus?.();
                }}
                className={`${Styles.actionButton} ${Styles.actionButtonEmerald}`}
              >
                <span>
                  {isArrivalsSixCards
                    ? "Configurar Bônus do Clube"
                    : "Adicionar / Editar Bônus"}
                </span>
                <FaChevronRight size={10} />
              </button>
            </div>

            {/* CARD 4: CLÁUSULAS ESPECIAIS (CLUBE) */}
            <div className={Styles.card} onClick={onOpenOtherClauses}>
              <div>
                <div className={Styles.cardTop}>
                  <div className={Styles.cardTitleWrapper}>
                    <div className={`${Styles.iconBox} ${Styles.iconPurple}`}>
                      <FaHandshake />
                    </div>
                    <div className={Styles.cardTitleColumn}>
                      <h4 className={Styles.cardTitle}>
                        {isArrivalsSixCards
                          ? "4. Cláusulas Especiais (Clube)"
                          : "4. Cláusulas Especiais"}
                      </h4>
                      <span
                        className={
                          direction === "exit"
                            ? Styles.targetBadgeClubReceivable
                            : Styles.targetBadgeClub
                        }
                      >
                        <FaBuilding size={9} />{" "}
                        {direction === "exit"
                          ? "Acordo com o Clube"
                          : "Acordo com Clube Vendedor"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${Styles.badge} ${
                      clubSpecialCount > 0
                        ? Styles.badgeActive
                        : Styles.badgeInactive
                    }`}
                  >
                    {clubSpecialCount > 0
                      ? `${clubSpecialCount} ${clubSpecialCount === 1 ? "Cláusula" : "Cláusulas"}`
                      : "Nenhuma"}
                  </span>
                </div>
                <p className={Styles.cardDescription}>
                  {clubSpecialCount > 0 ? (
                    <>
                      {[
                        formValues.buybackValue
                          ? `Recompra ${formatDisplayValue(
                              parseValue(formValues.buybackValue || "0"),
                              currency,
                            )}`
                          : null,
                        formValues.sellOnPercentage &&
                        formValues.sellOnPercentage !== "Nenhum"
                          ? `Revenda ${formValues.sellOnPercentage}`
                          : null,
                        booleanValues.firstRefusal ? "Preferência" : null,
                        formValues.loanBackDuration &&
                        formValues.loanBackDuration !== "Nenhum"
                          ? `Empréstimo ${formValues.loanBackDuration}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </>
                  ) : (
                    "Sem cláusulas de recompra, taxa de revenda futura ou acordos especiais com o clube."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOtherClauses?.();
                }}
                className={`${Styles.actionButton} ${Styles.actionButtonPurple}`}
              >
                <span>Configurar Acordos do Clube</span>
                <FaChevronRight size={10} />
              </button>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* BLOCO 2: CARDS DO JOGADOR (BÔNUS DO ATLETA & CLÁUSULAS ESPECIAIS) */}
        {/* Renderizado em chegadas (cards 5 e 6) OU em renovações */}
        {/* ============================================================== */}
        {(isArrivalsSixCards || isRenewal || isFromLoanBuyOption || isOnlyPlayerCards) && (
          <>
            {/* CARD 5: BÔNUS & METAS (JOGADOR) */}
            <div
              className={Styles.card}
              onClick={onOpenPlayerBonus || onOpenBonus}
            >
              <div>
                <div className={Styles.cardTop}>
                  <div className={Styles.cardTitleWrapper}>
                    <div className={`${Styles.iconBox} ${Styles.iconEmerald}`}>
                      <FaTrophy />
                    </div>
                    <div className={Styles.cardTitleColumn}>
                      <h4 className={Styles.cardTitle}>
                        {isOnlyPlayerCards
                          ? onOpenContract
                            ? "2. Bônus & Metas"
                            : "1. Bônus & Metas (Jogador)"
                          : isArrivalsSixCards
                            ? "5. Bônus & Metas (Jogador)"
                            : onOpenContract
                              ? "2. Bônus & Metas"
                              : "1. Bônus & Metas"}
                      </h4>
                      <span className={Styles.targetBadgePlayer}>
                        <FaUser size={9} /> A Pagar ao Jogador
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${Styles.badge} ${
                      playerBonuses.length > 0
                        ? Styles.badgeActive
                        : Styles.badgeInactive
                    }`}
                  >
                    {playerBonuses.length > 0
                      ? `${playerBonuses.length} ${playerBonuses.length === 1 ? "Meta Ativa" : "Metas Ativas"}`
                      : "Nenhum"}
                  </span>
                </div>
                <p className={Styles.cardDescription}>
                  {playerBonuses.length > 0 ? (
                    <>
                      {playerBonuses
                        .map((b) => {
                          const count = b.targetCount ?? b.metricTarget;
                          const isPerf =
                            b.bonusCategory === "Desempenho" ||
                            b.category === "performance";
                          const label =
                            isPerf && count
                              ? `${count} ${b.bonusTarget || b.name}`
                              : b.bonusTarget || b.name;
                          return `${label} (${formatDisplayValue(b.value, currency)})`;
                        })
                        .join(", ")}
                    </>
                  ) : (
                    "Nenhum bônus por desempenho ou conquista configurado para o atleta."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenPlayerBonus) {
                    onOpenPlayerBonus();
                  } else {
                    onOpenBonus?.();
                  }
                }}
                className={`${Styles.actionButton} ${Styles.actionButtonEmerald}`}
              >
                <span>Adicionar / Editar Bônus</span>
                <FaChevronRight size={10} />
              </button>
            </div>

            {/* CARD 6: CLÁUSULAS ESPECIAIS (JOGADOR) */}
            <div
              className={Styles.card}
              onClick={onOpenPlayerOtherClauses || onOpenOtherClauses}
            >
              <div>
                <div className={Styles.cardTop}>
                  <div className={Styles.cardTitleWrapper}>
                    <div className={`${Styles.iconBox} ${Styles.iconPurple}`}>
                      <FaFileContract />
                    </div>
                    <div className={Styles.cardTitleColumn}>
                      <h4 className={Styles.cardTitle}>
                        {isOnlyPlayerCards
                          ? onOpenContract
                            ? "3. Cláusulas Especiais"
                            : "2. Cláusulas Especiais (Jogador)"
                          : isArrivalsSixCards
                            ? "6. Cláusulas Especiais (Jogador)"
                            : onOpenContract
                              ? "3. Cláusulas Especiais"
                              : "2. Cláusulas Especiais"}
                      </h4>
                      <span className={Styles.targetBadgePlayer}>
                        <FaUser size={9} /> Contrato do Jogador
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${Styles.badge} ${
                      playerSpecialCount > 0
                        ? Styles.badgeActive
                        : Styles.badgeInactive
                    }`}
                  >
                    {playerSpecialCount > 0
                      ? `${playerSpecialCount} ${playerSpecialCount === 1 ? "Cláusula" : "Cláusulas"}`
                      : "Nenhuma"}
                  </span>
                </div>
                <p className={Styles.cardDescription}>
                  {playerSpecialCount > 0 ? (
                    <>
                      {[
                        hasRenewalRelease
                          ? `Multa ${formatDisplayValue(
                              parseValue(formValues.releaseClause || "0"),
                              currency,
                            )}`
                          : null,
                        hasRenewalWageAdj
                          ? `Salário: ${formValues.wageAdjustmentType} ${
                              formValues.wageAdjustmentPercentage || "5%"
                            }${
                              formValues.wageAdjustmentObjective
                                ? ` (${formValues.wageAdjustmentObjective}${
                                    formValues.wageAdjustmentLeague
                                      ? ` - ${formValues.wageAdjustmentLeague}`
                                      : ""
                                  })`
                                : ""
                            }`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </>
                  ) : (
                    "Sem multa rescisória ou ajuste automático de salário configurado para o jogador."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenPlayerOtherClauses) {
                    onOpenPlayerOtherClauses();
                  } else {
                    onOpenOtherClauses?.();
                  }
                }}
                className={`${Styles.actionButton} ${Styles.actionButtonPurple}`}
              >
                <span>Ajustar Acordos Especiais</span>
                <FaChevronRight size={10} />
              </button>
            </div>
          </>
        )}
      </div>

      {onBackToList && (
        <div className={Styles.gridFooter}>
          <button
            type="button"
            className={Styles.btnBackToList}
            onClick={onBackToList}
          >
            <FaArrowLeft /> Voltar para a lista
          </button>
        </div>
      )}
    </div>
  );
};

export default ModularClausesGrid;
