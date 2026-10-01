import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { ContainerClubContent } from "../../../../../components/ContainerClubContent";
import Card from "../../../../../ui/Card";
import { ButtonsSwitch } from "../../../../../components/ButtonsSwitch";
import { useTableData } from "./hooks/useTableData";
import { useTableMode } from "./hooks/useTableMode";
import { buildTableColumns } from "./helpers/buildTableColumns";
import Styles from "./TableTab.module.css";
import { LegendTable } from "./ui/LegendTable";
import { TableHeader } from "./components/TableHeader";
import { TableBody } from "./components/TableBody";
import { TableRowData } from "../../../../../common/interfaces/Table";
import { Copy } from "../../../../../common/utils/Copy";
import { buildTableCopyText } from "./helpers/buildTableCopyText";
import NoStatsMessage from "../../../../../components/NoStatsMessage";
import CustomSelect from "../../../../../components/CustomSelect";
import { leaguesByContinent } from "../../../../../common/utils/league";
import { SectionScreen } from "../../../config/screens";

type TableTabProps = {
  season: ClubData;
  career: Career & { clubData?: ClubData[] };
  onOpenScreen?: (screen: SectionScreen) => void;
  isActive?: boolean;
};

export const TableTab = ({
  season,
  career,
  onOpenScreen,
  isActive = true,
}: TableTabProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isGeralPage = location.pathname.includes("/Geral");

  const availableSeasons = useMemo(() => {
    if (!career.clubData) return [];
    return [...career.clubData]
      .sort((a, b) => b.seasonNumber - a.seasonNumber)
      .map((s) => ({
        id: String(s.id),
        label: `Temporada ${s.seasonNumber}`,
        seasonData: s,
      }));
  }, [career.clubData]);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(() => {
    if (isGeralPage && availableSeasons.length > 0) {
      return availableSeasons[0].id;
    }
    return String(season.id);
  });

  const selectedSeasonData = useMemo(() => {
    const found = availableSeasons.find((s) => s.id === selectedSeasonId);
    return found ? found.seasonData : season;
  }, [availableSeasons, selectedSeasonId, season]);

  const storageKey = `tableActiveTab_${isGeralPage ? "geral" : selectedSeasonData.id}`;
  const { activeMode, setActiveMode } = useTableMode(storageKey);

  const { tableData, isFirstDivision } = useTableData(
    career,
    selectedSeasonData,
    isActive,
  );

  const columns = buildTableColumns(activeMode);

  const mainLeague = useMemo(() => {
    if (
      !selectedSeasonData.leagues ||
      selectedSeasonData.leagues.length === 0
    ) {
      return undefined;
    }
    const allKnownCompetitions = Object.values(leaguesByContinent).flatMap(
      (continent) => Object.values(continent).flat(),
    );

    const trueLeague = selectedSeasonData.leagues.find((seasonComp) => {
      if (seasonComp.league) return true;
      const knownComp = allKnownCompetitions.find(
        (c) => c.name === seasonComp.name,
      );
      return knownComp?.league === true;
    });
    return trueLeague || selectedSeasonData.leagues[0];
  }, [selectedSeasonData.leagues]);

  const rowClick = (row: TableRowData) => {
    if (isGeralPage) return;

    if (onOpenScreen) {
      onOpenScreen({
        key: "addTeamsToTable",
        teamId: row.id,
        seasonId: selectedSeasonData.id,
        teamToEdit: row,
      });
    } else {
      navigate(
        `/Career/${career.id}/Season/${selectedSeasonData.id}/AddTeamsToTable/${row.id}`,
        {
          state: { teamToEdit: row },
        },
      );
    }
  };

  const copyClick = async () => {
    if (!tableData.length) return;

    let text = buildTableCopyText(tableData, activeMode);
    let headerText = "";
    if (mainLeague?.name) {
      headerText += `${mainLeague.name}\n`;
    }
    if (isGeralPage && selectedSeasonLabel) {
      headerText += `${selectedSeasonLabel}\n`;
    }
    if (headerText) {
      text = `${headerText}\n${text}`;
    }

    await Copy(text, "Tabela copiada com sucesso!");
  };

  const handleSeasonChange = (e: {
    target: { name: string; value: string };
  }) => {
    const found = availableSeasons.find((s) => s.label === e.target.value);
    if (found) {
      setSelectedSeasonId(found.id);
    }
  };

  const selectedSeasonLabel =
    availableSeasons.find((s) => s.id === selectedSeasonId)?.label || "";

  return (
    <ContainerClubContent>
      {isGeralPage && availableSeasons.length > 0 && (
        <div className="swiper-no-swiping">
          <CustomSelect
            name="seasonSelect"
            options={availableSeasons.map((s) => s.label)}
            value={selectedSeasonLabel}
            placeholder="Selecione a temporada"
            onChange={handleSeasonChange}
          />
        </div>
      )}

      {tableData.length === 0 ? (
        <NoStatsMessage
          isStats={true}
          textOne="Nenhum dado na tabela"
          textTwo="Adicione times para visualizar a classificação"
        />
      ) : (
        <>
          <div className={Styles.wrapper}>
            <ButtonsSwitch
              isMatches
              activeTab={activeMode}
              setActiveTab={setActiveMode}
              customTabs={[
                { value: "Resumido", label: "Resumido" },
                { value: "Completo", label: "Completo" },
              ]}
            />
            <ButtonsSwitch onClickCopy={copyClick} />
          </div>

          <Card className={Styles.card}>
            {mainLeague && (
              <div className={Styles.league_header}>
                {mainLeague.logo && (
                  <div className={Styles.background_image}>
                    <img
                      src={mainLeague.logo}
                      alt={mainLeague.name}
                      className={Styles.league_image}
                    />
                  </div>
                )}
                <span className={Styles.league_name}>{mainLeague.name}</span>
              </div>
            )}
            <table className={Styles.table}>
              <TableHeader columns={columns} />
              <TableBody
                tableData={tableData}
                columns={columns}
                career={career}
                activeMode={activeMode}
                onRowClick={isGeralPage ? undefined : rowClick}
              />
            </table>
            <LegendTable
              tableData={tableData}
              isFirstDivision={isFirstDivision}
            />
          </Card>
        </>
      )}
    </ContainerClubContent>
  );
};
