import { leaguesByContinent } from "../../../../common/utils/league";

const EXCLUDED_REGIONS = ["UEFA", "Conmebol", "AFC"];

export const CAREER_COUNTRY_OPTIONS: readonly string[] = Object.values(
  leaguesByContinent,
)
  .flatMap((continent) => Object.keys(continent))
  .filter((region) => !EXCLUDED_REGIONS.includes(region))
  .sort((a, b) => a.localeCompare(b, "pt-BR"));

