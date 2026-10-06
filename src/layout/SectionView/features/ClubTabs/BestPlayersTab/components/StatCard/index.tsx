import { useState, useMemo } from "react";
import Card from "../../../../../../../ui/Card";
import { PlayerStatRow } from "../PlayerStatRow";
import Styles from "./StatCard.module.css";
import { CgCopy } from "react-icons/cg";
import { Copy } from "../../../../../../../common/utils/Copy";
import { AggregatedPlayerStats } from "../../../../../../../common/interfaces/AggregatedPlayerStats/AggregatedPlayerStats";
import { formatPlayerName } from "../../../../../../../common/utils/formatPlayerName";

type StatCardProps = {
  title: string;
  data: AggregatedPlayerStats[];
  accessor: keyof AggregatedPlayerStats;
  isRating?: boolean;
  isAscending?: boolean;
  formatValue?: (val: number) => string | number;
};

export const StatCard = ({
  title,
  data,
  accessor,
  isRating,
  isAscending,
  formatValue,
}: StatCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const sortedAndFilteredData = useMemo(() => {
    return data
      .filter((d) => {
        const val = d[accessor] as number;
        if (title.includes("Frequência") && d.goals === 0) return false;
        return val > 0;
      })
      .sort((a, b) => {
        const valA = a[accessor] as number;
        const valB = b[accessor] as number;
        return isAscending ? valA - valB : valB - valA;
      });
  }, [data, accessor, title, isAscending]);

  const copyStats = async () => {
    if (sortedAndFilteredData.length === 0) return;

    const textLines = [`*${title}*`, ""];

    sortedAndFilteredData.forEach((statItem, index) => {
      const rawValue = statItem[accessor] as number;
      const displayValue = formatValue
        ? formatValue(rawValue)
        : Number.isInteger(rawValue)
          ? rawValue
          : rawValue.toFixed(1);

      textLines.push(
        `${index + 1}º ${formatPlayerName(statItem.player.name)} - ${displayValue}`,
      );
    });

    const textToCopy = textLines.join("\n");
    await Copy(textToCopy, "Estatísticas copiadas com sucesso!");
  };

  if (sortedAndFilteredData.length === 0) return null;

  const displayData = expanded
    ? sortedAndFilteredData
    : sortedAndFilteredData.slice(0, 3);

  return (
    <Card className={Styles.card}>
      <header className={Styles.header}>
        <div className={Styles.wrapper}>
          <h3 className={Styles.title}>{title}</h3>
          <span
            className={Styles.copy}
            onClick={copyStats}
            style={{ cursor: "pointer" }}
            title="Copiar estatísticas"
          >
            <CgCopy />
          </span>
        </div>
        {sortedAndFilteredData.length > 3 && (
          <button
            className={Styles.verTudo}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Ver menos" : "Ver tudo"}
          </button>
        )}
      </header>
      <div className={Styles.list}>
        {displayData.map((statItem, index) => {
          const rawValue = statItem[accessor] as number;
          const displayValue = formatValue
            ? formatValue(rawValue)
            : Number.isInteger(rawValue)
              ? rawValue
              : rawValue.toFixed(1);

          return (
            <PlayerStatRow
              key={`${statItem.player.id}-${index}`}
              player={statItem.player}
              value={displayValue}
              isRating={isRating}
            />
          );
        })}
      </div>
    </Card>
  );
};
