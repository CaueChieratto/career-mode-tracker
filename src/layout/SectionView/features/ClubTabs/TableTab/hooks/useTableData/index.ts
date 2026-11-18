import { useEffect, useMemo, useRef, useState } from "react";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { ServiceTable } from "../../../../../../../common/services/ServiceTable";
import {
  QualificationZone,
  TableRowData,
} from "../../../../../../../common/interfaces/Table";
import { TableTeamData } from "../../../../../../../common/interfaces/TableTeamData";
import { getAllLeaguesFlat } from "../../../../../../../common/utils/league";

export const useTableData = (
  career: Career,
  season: ClubData,
  isActive: boolean = true,
) => {
  const [rawTableData, setRawTableData] = useState<TableTeamData[]>(() => {
    return (season.table as unknown as TableTeamData[]) || [];
  });

  const lastFetchedUpdatedAtRef = useRef<number | string | undefined>(career.updatedAt);

  const isFirstDivision = useMemo(() => {
    if (!season.leagues || season.leagues.length === 0) return true;

    const allKnownCompetitions = getAllLeaguesFlat();

    for (const seasonComp of season.leagues) {
      const knownComp = allKnownCompetitions.find(
        (c) => c.name === seasonComp.name,
      );

      if (knownComp && knownComp.league) {
        return knownComp.isFirstDivision ?? true;
      }
    }

    return true;
  }, [season.leagues]);

  useEffect(() => {
    if (season.table) {
      setRawTableData(season.table as unknown as TableTeamData[]);
    }
  }, [season.table]);

  useEffect(() => {
    if (!isActive) return;
    if (!career.id || !season.id) return;

    if (
      season.table !== undefined &&
      lastFetchedUpdatedAtRef.current === career.updatedAt
    ) {
      return;
    }

    lastFetchedUpdatedAtRef.current = career.updatedAt;

    const fetchTable = async () => {
      try {
        const data = await ServiceTable.getTableBySeason(
          career.id,
          season.id,
        );
        setRawTableData(data);
      } catch (error) {
        console.error("Erro ao buscar a tabela no Firebase:", error);
      }
    };
    fetchTable();
  }, [career.id, season.id, career.updatedAt, isActive, season.table]);

  const tableData = useMemo<TableRowData[]>(() => {
    const getQualificationZone = (
      position: number,
      totalTeams: number = 20,
    ): QualificationZone => {
      if (isFirstDivision) {
        if (position === 1) return "first";
        if (position >= 2 && position <= 4) return "champions";
        if (position === 5) return "europa";
        if (position === 6) return "conference";
        if (position >= totalTeams - 2) return "relegation";
      } else {
        if (position === 1) return "first";
        if (position === 2) return "promotion";
        if (position >= 3 && position <= 6) return "promotion_playoff";
        if (position >= totalTeams - 3) return "relegation";
      }
      return "none";
    };

    const sortedData = [...rawTableData].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      return b.goalsFor - a.goalsFor;
    });

    return sortedData.map((team, index) => {
      const position = index + 1;
      const defaultZone = getQualificationZone(position, sortedData.length);
      const finalZone =
        team.customZone && team.customZone !== "default"
          ? team.customZone
          : defaultZone;
      return {
        ...team,
        position,
        zone: finalZone,
      };
    });
  }, [rawTableData, isFirstDivision]);

  return { tableData, isFirstDivision };
};
