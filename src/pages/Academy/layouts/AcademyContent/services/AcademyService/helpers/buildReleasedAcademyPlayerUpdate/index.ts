import { AcademyPlayers } from "../../../../interfaces/AcademyPlayers/AcademyPlayers";
import { buildEvolutionHistory } from "../buildEvolutionHistory";

export const buildReleasedAcademyPlayerUpdate = (
  academyPlayer: AcademyPlayers,
  releaseDate: string,
  deletedShirtNumber: unknown,
) => {
  const releaseEvolution = buildEvolutionHistory(
    releaseDate,
    "Atleta dispensado da categoria de base.",
    academyPlayer.status || "academy",
    "released",
  );

  return {
    status: "released" as const,
    exitDate: releaseDate,
    evolutionHistory: [...academyPlayer.evolutionHistory, releaseEvolution],
    shirtNumber: deletedShirtNumber,
  };
};
