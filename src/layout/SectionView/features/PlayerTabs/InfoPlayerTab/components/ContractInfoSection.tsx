import React from "react";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import {
  formatDisplayValue,
  getCurrencySymbol,
} from "../../../../../../common/utils/FormatValue";
import InfoCard from "./InfoCard";
import ProfitDisplay from "./ProfitDisplay";
import InfoRow from "./InfoRow";
import InfoItem from "./InfoItem";
import {
  FaMoneyBillWave,
  FaUserTie,
  FaFileContract,
  FaChartLine,
} from "react-icons/fa";

type ContractInfoSectionProps = {
  player: Players;
  currency?: string;
};

const ContractInfoSection: React.FC<ContractInfoSectionProps> = ({
  player,
  currency,
}) => {
  const latestContract =
    player.contract?.[player.contract.length - 1] || player.contract?.[0];
  const contractDetails =
    player.contractDetails || latestContract?.contractDetails;

  const signingBonus = contractDetails?.signingBonus;
  const agentFee = contractDetails?.agentFee;
  const releaseClause = contractDetails?.releaseClause;
  const wageAdjustment = contractDetails?.wageAdjustment;
  const effectiveCurrency = getCurrencySymbol(currency);

  const hasExtraContractInfo = Boolean(
    (signingBonus !== undefined && signingBonus > 0) ||
      (agentFee !== undefined && agentFee > 0) ||
      (releaseClause !== undefined && releaseClause > 0) ||
      wageAdjustment?.enabled,
  );

  return (
    <InfoCard title="Informações do contrato">
      <ProfitDisplay
        playerValue={player.playerValue}
        salary={player.salary}
        contractTime={player.contractTime}
        currency={effectiveCurrency}
        textOne="Valor do jogador"
        textTwo="Salário semanal"
        textTree="Tempo de contrato"
      />

      {hasExtraContractInfo && (
        <InfoRow>
          {releaseClause !== undefined && releaseClause > 0 && (
            <InfoItem
              label="Multa rescisória"
              value={formatDisplayValue(releaseClause, effectiveCurrency)}
              icon={<FaFileContract />}
            />
          )}
          {signingBonus !== undefined && signingBonus > 0 && (
            <InfoItem
              label="Luvas"
              value={formatDisplayValue(signingBonus, effectiveCurrency)}
              icon={<FaMoneyBillWave />}
            />
          )}
          {agentFee !== undefined && agentFee > 0 && (
            <InfoItem
              label="Taxa de agência"
              value={formatDisplayValue(agentFee, effectiveCurrency)}
              icon={<FaUserTie />}
            />
          )}
          {wageAdjustment?.enabled && (
            <InfoItem
              label="Ajuste salarial"
              value={`±${wageAdjustment.percentage}% (${
                wageAdjustment.targetObjective ||
                wageAdjustment.competitionBasis
              })`}
              icon={<FaChartLine />}
            />
          )}
        </InfoRow>
      )}
    </InfoCard>
  );
};

export default ContractInfoSection;
