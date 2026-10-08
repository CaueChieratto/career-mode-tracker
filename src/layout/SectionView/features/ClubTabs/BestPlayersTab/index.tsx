import { useMemo, useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { ContainerClubContent } from "../../../../../components/ContainerClubContent";
import NoStatsMessage from "../../../../../components/NoStatsMessage";
import { useBestPlayersStats } from "./hooks/useBestPlayersStats";
import { StatCard } from "./components/StatCard";
import { UNIFIED_CARDS_CONFIG } from "./constants/statConfigs";
import { Copy } from "../../../../../common/utils/Copy";
import { ButtonsSwitch } from "../../../../../components/ButtonsSwitch";
import { formatPlayerName } from "../../../../../common/utils/formatPlayerName";
import { SeasonThemeContext } from "../../../../../contexts/SeasonThemeContext";

type BestPlayersTabProps = {
  season: ClubData;
  career: Career;
};

export const BestPlayersTab = ({ season, career }: BestPlayersTabProps) => {
  const location = useLocation();
  const isGeralPage = location.pathname.includes("/Geral");
  const themeContext = useContext(SeasonThemeContext);
  const clubColor = themeContext?.clubColor || "#3b82f6";

  const statsData = useBestPlayersStats(season, career, isGeralPage);

  const visibleCards = useMemo(() => {
    return UNIFIED_CARDS_CONFIG.filter((card) => {
      return card.tabs.some((tab) => {
        return statsData.some((d) => {
          if (card.filter && !card.filter(d)) return false;
          if (tab.filter && !tab.filter(d)) return false;
          const val = d[tab.key] as number;
          return typeof val === "number" && !isNaN(val) && val > 0;
        });
      });
    });
  }, [statsData]);

  const [selectedStat, setSelectedStat] = useState<string>("");

  useEffect(() => {
    if (visibleCards.length > 0) {
      const exists = visibleCards.some((c) => c.title === selectedStat);
      if (!exists) {
        setSelectedStat(visibleCards[0].title);
      }
    } else {
      setSelectedStat("");
    }
  }, [visibleCards, selectedStat]);

  const hasAnyMatches = isGeralPage
    ? statsData.length > 0
    : season.matches?.some((m) => m.status === "FINISHED");

  if (!hasAnyMatches || statsData.length === 0) {
    return (
      <ContainerClubContent>
        <NoStatsMessage
          textOne="Sem estatísticas"
          textTwo={
            hasAnyMatches
              ? "Nenhum jogador atingiu a porcentagem mínima de partidas."
              : isGeralPage
                ? "Jogue partidas para gerar o ranking global dos seus jogadores."
                : "Adicione partidas nesta temporada para gerar o ranking de jogadores."
          }
        />
      </ContainerClubContent>
    );
  }

  const handleSelectChange = (title: string) => {
    setSelectedStat(title);
    const card = visibleCards.find((c) => c.title === title);
    if (card) {
      const element = document.getElementById(card.id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const copyAllStats = async () => {
    let finalString = "";

    visibleCards.forEach((card) => {
      card.tabs.forEach((tab) => {
        const sortedAndFilteredData = statsData
          .filter((d) => {
            if (card.filter && !card.filter(d)) return false;
            if (tab.filter && !tab.filter(d)) return false;
            const val = d[tab.key] as number;
            return typeof val === "number" && !isNaN(val) && val > 0;
          })
          .sort((a, b) => {
            const valA = (a[tab.key] as number) || 0;
            const valB = (b[tab.key] as number) || 0;
            return tab.isAscending ? valA - valB : valB - valA;
          });

        if (sortedAndFilteredData.length > 0) {
          const headerLabel =
            card.tabs.length > 1
              ? `${card.title} (${tab.label})`
              : card.title;
          finalString += `*${headerLabel}*\n\n`;

          sortedAndFilteredData.forEach((statItem, index) => {
            const rawValue = statItem[tab.key] as number;
            const displayValue = tab.format
              ? tab.format(rawValue)
              : Number.isInteger(rawValue)
                ? rawValue
                : rawValue.toFixed(1);

            finalString += `${index + 1}º ${formatPlayerName(statItem.player.name)} - ${displayValue}\n`;
          });

          finalString += "\n";
        }
      });
    });

    if (finalString) {
      await Copy(
        finalString.trim(),
        "Todas as estatísticas foram copiadas com sucesso!",
      );
    }
  };

  return (
    <ContainerClubContent>
      {visibleCards.length > 0 && (
        <ButtonsSwitch
          selectOptions={visibleCards.map((c) => c.title)}
          selectValue={selectedStat}
          onSelectChange={handleSelectChange}
          onClickCopy={copyAllStats}
        />
      )}

      {visibleCards.map((card) => (
        <div
          id={card.id}
          key={card.id}
          style={{ scrollMarginTop: "120px" }}
        >
          <StatCard
            id={card.id}
            title={card.title}
            tabs={card.tabs}
            data={statsData}
            clubColor={clubColor}
            filter={card.filter}
          />
        </div>
      ))}
    </ContainerClubContent>
  );
};
