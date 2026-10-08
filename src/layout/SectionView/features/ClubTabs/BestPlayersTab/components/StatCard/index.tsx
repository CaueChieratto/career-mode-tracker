import { useState, useMemo } from "react";
import Card from "../../../../../../../ui/Card";
import { PlayerStatRow } from "../PlayerStatRow";
import Styles from "./StatCard.module.css";
import { CgCopy } from "react-icons/cg";
import { Copy } from "../../../../../../../common/utils/Copy";
import { AggregatedPlayerStats } from "../../../../../../../common/interfaces/AggregatedPlayerStats/AggregatedPlayerStats";
import { formatPlayerName } from "../../../../../../../common/utils/formatPlayerName";
import { UnifiedTabConfig } from "../../constants/statConfigs";

type StatCardProps = {
  id: string;
  title: string;
  tabs: UnifiedTabConfig[];
  data: AggregatedPlayerStats[];
  clubColor?: string;
  filter?: (stat: AggregatedPlayerStats) => boolean;
};

export const StatCard = ({
  title,
  tabs,
  data,
  clubColor,
  filter,
}: StatCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const defaultTab = tabs.find((t) => t.id === "totals");
    return defaultTab ? defaultTab.id : tabs[0].id;
  });

  const activeTab = useMemo(() => {
    const match = tabs.find((t) => t.id === activeTabId);
    return match || tabs[0];
  }, [tabs, activeTabId]);

  const sortedAndFilteredData = useMemo(() => {
    return data
      .filter((d) => {
        if (filter && !filter(d)) return false;
        if (activeTab.filter && !activeTab.filter(d)) return false;
        const val = d[activeTab.key] as number;
        return typeof val === "number" && !isNaN(val) && val > 0;
      })
      .sort((a, b) => {
        const valA = (a[activeTab.key] as number) || 0;
        const valB = (b[activeTab.key] as number) || 0;
        return activeTab.isAscending ? valA - valB : valB - valA;
      });
  }, [data, activeTab, filter]);

  const copyStats = async () => {
    if (sortedAndFilteredData.length === 0) return;

    const headerLabel =
      tabs.length > 1 ? `${title} (${activeTab.label})` : title;
    const textLines = [`*${headerLabel}*`, ""];

    sortedAndFilteredData.forEach((statItem, index) => {
      const rawValue = statItem[activeTab.key] as number;
      const displayValue = activeTab.format
        ? activeTab.format(rawValue)
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

  const displayData = expanded
    ? sortedAndFilteredData
    : sortedAndFilteredData.slice(0, 3);

  return (
    <Card className={Styles.card}>
      <header className={Styles.header}>
        <div className={Styles.titleRow}>
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
        </div>

        {tabs.length > 1 && (
          <div className={Styles.tabContainer}>
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`${Styles.tabBtn} ${isActive ? Styles.tabBtnActive : ""}`}
                  style={
                    isActive
                      ? {
                          backgroundColor: clubColor || "#3b82f6",
                          color: "#ffffff",
                        }
                      : undefined
                  }
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {sortedAndFilteredData.length === 0 ? (
        <p className={Styles.emptyMessage}>
          Nenhum jogador pontuou nesta métrica.
        </p>
      ) : (
        <div className={Styles.list}>
          {displayData.map((statItem, index) => {
            const rawValue = statItem[activeTab.key] as number;
            const parts = activeTab.formatParts
              ? activeTab.formatParts(rawValue)
              : undefined;
            const displayValue = parts
              ? parts.value
              : activeTab.format
                ? activeTab.format(rawValue)
                : Number.isInteger(rawValue)
                  ? rawValue
                  : rawValue.toFixed(1);

            return (
              <PlayerStatRow
                key={`${statItem.player.id}-${index}`}
                player={statItem.player}
                value={displayValue}
                description={parts?.description}
                isRating={activeTab.isRating}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
};
