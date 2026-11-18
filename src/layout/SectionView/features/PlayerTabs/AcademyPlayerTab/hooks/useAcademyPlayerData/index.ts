import { useMemo } from "react";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { AcademyPlayers } from "../../../../../../../common/interfaces/AcademyData";
import { belongsToSeason } from "../../helpers/belongsToSeason";

interface UseAcademyPlayerDataProps {
  player?: Players;
  isGeral: boolean;
  seasonNumber?: number;
  careerStartYear: number;
  isEurope: boolean;
}

export const useAcademyPlayerData = ({
  player,
  isGeral,
  seasonNumber,
  careerStartYear,
  isEurope,
}: UseAcademyPlayerDataProps) => {
  const academyPlayer = useMemo(() => {
    if (!player || !player.isAcademy || !player.academyData) return null;

    let history = player.academyHistory || [];

    if (!isGeral) {
      history = history.filter((h) =>
        belongsToSeason(h.date, seasonNumber, careerStartYear, isEurope),
      );
    }

    return {
      ...player.academyData,
      id: player.academyData.id || player.id,
      evolutionHistory: history,
      name: player.name,
      nationality: player.nation,
      age: player.age,
      position: player.position,
      sector: player.sector,
      overall: player.overall,
      annotations:
        (player as unknown as { annotations?: string }).annotations ||
        player.academyData?.annotations ||
        "",
      shirtNumber: Number(player.shirtNumber) || 0,
    } as AcademyPlayers;
  }, [player, isGeral, seasonNumber, careerStartYear, isEurope]);

  const tournamentsAcademy = useMemo(() => {
    const allTournaments = player?.academyTournaments || [];
    const internalPlayerId = player?.academyData?.id || player?.id;

    const fixedTournaments = allTournaments.map((t) => ({
      ...t,
      matches:
        t.matches?.map((m) => ({
          ...m,
          lineup:
            m.lineup?.map((l) => ({
              ...l,
              playerId: internalPlayerId,
            })) || [],
        })) || [],
    }));

    if (isGeral) return fixedTournaments;

    return fixedTournaments.filter((t) =>
      belongsToSeason(t.date, seasonNumber, careerStartYear, isEurope),
    );
  }, [player, isGeral, seasonNumber, careerStartYear, isEurope]);

  return { academyPlayer, tournamentsAcademy };
};
