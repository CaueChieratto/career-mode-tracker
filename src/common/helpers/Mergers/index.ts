import { Career } from "../../interfaces/Career";
import { Trophy } from "../../interfaces/club/trophy";
import { League } from "../../interfaces/League";
import { getAllLeaguesFlat } from "../../utils/league";

export const mergeTrophies = (
  career: Career,
  leagueName: string,
  seasons: string[],
): Trophy[] => {
  const trophies: Trophy[] = career.trophies || [];

  const allLeagues: League[] = getAllLeaguesFlat();

  const leagueFound = allLeagues.find((l) => l.name === leagueName);
  if (!leagueFound) {
    console.error("Liga não encontrada:", leagueName);
    return trophies;
  }

  const existingTrophy = trophies.find((t) => t.leagueName === leagueName);

  if (existingTrophy) {
    existingTrophy.seasons = Array.from(
      new Set([...existingTrophy.seasons, ...seasons]),
    );
  } else {
    trophies.push({
      leagueName,
      leagueImage: leagueFound.trophy,
      seasons,
    });
  }

  return trophies;
};

export const syncSeasonTrophies = (
  career: Career,
  seasonName: string,
  selectedTrophies: string[],
  availableLeagues: League[] = [],
): Trophy[] => {
  const currentTrophies: Trophy[] = (career.trophies || []).map((t) => ({
    ...t,
    seasons: [...(t.seasons || [])],
  }));

  // 1. Remove seasonName dos troféus que não estão mais selecionados para esta temporada
  let updatedTrophies = currentTrophies.map((trophy) => {
    const isSelected = selectedTrophies.includes(trophy.leagueName);
    const hasSeason = trophy.seasons.includes(seasonName);

    if (hasSeason && !isSelected) {
      return {
        ...trophy,
        seasons: trophy.seasons.filter((s) => s !== seasonName),
      };
    }
    return trophy;
  });

  // Remove troféus que ficaram com zero temporadas
  updatedTrophies = updatedTrophies.filter((t) => t.seasons.length > 0);

  // 2. Adiciona ou assegura seasonName nos troféus selecionados
  for (const trophyName of selectedTrophies) {
    const existingIndex = updatedTrophies.findIndex(
      (t) => t.leagueName === trophyName,
    );

    if (existingIndex >= 0) {
      if (!updatedTrophies[existingIndex].seasons.includes(seasonName)) {
        updatedTrophies[existingIndex].seasons.push(seasonName);
      }
    } else {
      // Buscar imagem do troféu nas ligas da temporada ou no catálogo global
      let trophyImage = availableLeagues.find((l) => l.name === trophyName)?.trophy;

      if (!trophyImage) {
        const allGlobalLeagues = getAllLeaguesFlat();
        trophyImage =
          allGlobalLeagues.find((l) => l.name === trophyName)?.trophy || "";
      }

      updatedTrophies.push({
        leagueName: trophyName,
        leagueImage: trophyImage,
        seasons: [seasonName],
      });
    }
  }

  return updatedTrophies;
};
