import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { formatDisplayValue } from "../../../../../../../common/utils/FormatValue";

export const buildSquadCopyText = (
  players: Players[],
  currency?: string,
): string => {
  return players
    .map((p) => {
      const salary =
        p.salary !== undefined ? formatDisplayValue(p.salary, currency) : "-";
      const value =
        p.playerValue !== undefined
          ? formatDisplayValue(p.playerValue, currency)
          : "-";

      const contract =
        p.contractTime !== undefined
          ? p.contractTime <= 1
            ? `${p.contractTime} ano`
            : `${p.contractTime} anos`
          : "-";
      return `${p.name}, ${p.position}, ${p.age} anos, ${p.nation}, Camisa ${p.shirtNumber}, ${value} de valor de mercado, ${salary} de salário semanal, ${contract} de contrato`;
    })
    .join("\n");
};
