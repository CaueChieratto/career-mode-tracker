import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { ContainerClubContent } from "../../../../../components/ContainerClubContent";
import NoStatsMessage from "../../../../../components/NoStatsMessage";
import { useBestPlayersStats } from "./hooks/useBestPlayersStats";
import { StatCard } from "./components/StatCard";
import { statConfigs } from "./constants/statConfigs";
import { Copy } from "../../../../../common/utils/Copy";
import { ButtonsSwitch } from "../../../../../components/ButtonsSwitch";
import { formatPlayerName } from "../../../../../common/utils/formatPlayerName";

type BestPlayersTabProps = {
  season: ClubData;
  career: Career;
};

export const BestPlayersTab = ({ season, career }: BestPlayersTabProps) => {
  const location = useLocation();
  const isGeralPage = location.pathname.includes("/Geral");

  const statsData = useBestPlayersStats(season, career, isGeralPage);

  const availableConfigs = useMemo(() => {
    return statConfigs.filter((config) => {
      return statsData.some((d) => {
        const val = d[config.key] as number;
        if (config.title.includes("Frequência") && d.goals === 0) return false;
        return val > 0;
      });
    });
  }, [statsData]);

  const [selectedStat, setSelectedStat] = useState<string>("");

  useEffect(() => {
    if (availableConfigs.length > 0 && !selectedStat) {
      setSelectedStat(availableConfigs[0].title);
    }
  }, [availableConfigs, selectedStat]);

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

  const handleSelectChange = (value: string) => {
    setSelectedStat(value);
    const element = document.getElementById(value);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const copyAllStats = async () => {
    let finalString = "";

    availableConfigs.forEach((config) => {
      const sortedAndFilteredData = statsData
        .filter((d) => {
          const val = d[config.key] as number;
          if (config.title.includes("Frequência") && d.goals === 0)
            return false;
          return val > 0;
        })
        .sort((a, b) => {
          const valA = a[config.key] as number;
          const valB = b[config.key] as number;
          return config.isAscending ? valA - valB : valB - valA;
        });

      if (sortedAndFilteredData.length > 0) {
        finalString += `*${config.title}*\n\n`;

        sortedAndFilteredData.forEach((statItem, index) => {
          const rawValue = statItem[config.key] as number;
          const displayValue = config.format
            ? config.format(rawValue)
            : Number.isInteger(rawValue)
              ? rawValue
              : rawValue.toFixed(1);

          finalString += `${index + 1}º ${formatPlayerName(statItem.player.name)} - ${displayValue}\n`;
        });

        finalString += "\n";
      }
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
      {availableConfigs.length > 0 && (
        <ButtonsSwitch
          selectOptions={availableConfigs.map((c) => c.title)}
          selectValue={selectedStat}
          onSelectChange={handleSelectChange}
          onClickCopy={copyAllStats}
        />
      )}
      {statConfigs.map((config) => (
        <div
          id={config.title}
          key={config.key}
          style={{ scrollMarginTop: "120px" }}
        >
          <StatCard
            title={config.title}
            data={statsData}
            accessor={config.key}
            isRating={config.isRating}
            isAscending={config.isAscending}
            formatValue={config.format}
          />
        </div>
      ))}
    </ContainerClubContent>
  );
};
