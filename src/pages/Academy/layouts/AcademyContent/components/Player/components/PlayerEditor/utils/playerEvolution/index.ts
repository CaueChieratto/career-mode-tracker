import { Career } from "../../../../../../../../../../common/interfaces/Career";
import { AcademyPlayers } from "../../../../../../../../../../common/interfaces/AcademyData";
import { AcademyPlayersHistory } from "../../../../../../../../../../common/interfaces/AcademyData";
import { PlayerDataPayload } from "../../../../forms/types/PlayerDataPayload";
import { getSeasonStartYear } from "../../../../../../utils/getSeasonStartYear";
import { isEuropeanSeason } from "../../../../../../utils/isEuropeanSeason";

export const generateEvolutionHistory = (
  player: AcademyPlayers,
  newData: PlayerDataPayload,
  career: Career,
  seasonId: string,
): AcademyPlayers => {
  const newHistoryEntries: AcademyPlayersHistory[] = [];
  let evolutionDateFinal = new Date().toLocaleDateString("pt-BR");

  if (newData.evolutionDate) {
    const [day, month] = newData.evolutionDate.split("/");
    let year = getSeasonStartYear(career, seasonId);

    const isEurope = isEuropeanSeason(career);
    if (isEurope && Number(month) < 7) {
      year += 1;
    }

    evolutionDateFinal = `${day}/${month}/${year}`;
  }

  const attributesToTrack: (keyof PlayerDataPayload)[] = [
    "age",
    "height",
    "weight",
    "sector",
    "position",
    "overall",
    "potential",
    "annotations",
  ];

  attributesToTrack.forEach((attr) => {
    const oldValue = player[attr as keyof AcademyPlayers];
    const newValue = newData[attr];

    if (newValue !== undefined && oldValue !== newValue) {
      newHistoryEntries.push({
        id: crypto.randomUUID(),
        date: evolutionDateFinal,
        description: `Alterou ${attr} de ${oldValue || "Vazio"} para ${newValue || "Vazio"}`,
        changedAttribute: attr,
        oldValue: oldValue as string | number,
        newValue: newValue as string | number,
      });
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { evolutionDate, ...cleanNewData } = newData;

  return {
    ...player,
    ...cleanNewData,
    evolutionHistory: [
      ...(player.evolutionHistory || []),
      ...newHistoryEntries,
    ],
  };
};
