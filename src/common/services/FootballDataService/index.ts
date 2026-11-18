export interface FootballDataClubResult {
  id: string;
  name: string;
  shortName: string | null;
  badge: string | null;
}

interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
}

interface FootballDataResponse {
  count: number;
  teams: FootballDataTeam[];
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sanitizeTeamName(name: string): string {
  return normalizeText(name)
    .replace(/^(fc|ac|sc|cd|ca|cf|club)\s+/, "")
    .trim();
}

export async function fetchTeamByClubName(
  club: string,
): Promise<FootballDataClubResult | null> {
  if (!club || !club.trim()) return null;

  const apiToken = import.meta.env.VITE_FOOTBALL_DATA_API_TOKEN;
  if (!apiToken) {
    console.warn("VITE_FOOTBALL_DATA_API_TOKEN não definido no .env");
    return null;
  }

  console.log(
    `[API CALL] 🌐 Chamando a API externa para buscar o time: "${club}"`,
  );

  const url = `/api/football-data/teams?limit=500`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Auth-Token": apiToken,
      },
    });

    if (res.status === 429) {
      console.warn("Limite da API football-data atingido (429)");
      return null;
    }

    if (!res.ok) {
      console.warn(`Erro na API football-data (Status: ${res.status})`);
      return null;
    }

    const json = (await res.json()) as FootballDataResponse;
    const teams: FootballDataTeam[] = json.teams;

    if (!teams || teams.length === 0) return null;

    const clubNormalized = sanitizeTeamName(club);

    const scoredTeams = teams.map((t) => {
      const teamName = sanitizeTeamName(t.name || "");
      const shortName = sanitizeTeamName(t.shortName || "");
      const tla = sanitizeTeamName(t.tla || "");

      let score = 0;

      if (teamName === clubNormalized) {
        score = 100;
      } else if (teamName.startsWith(clubNormalized)) {
        score = 90;
      } else if (shortName === clubNormalized) {
        score = 70;
      } else if (tla === clubNormalized) {
        score = 60;
      } else if (teamName.includes(clubNormalized)) {
        score = 50;
      } else if (shortName.includes(clubNormalized)) {
        score = 30;
      }

      return {
        team: t,
        score,
      };
    });

    const bestMatch = [...scoredTeams].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (a.team.name || "").length - (b.team.name || "").length;
    })[0];

    if (!bestMatch || bestMatch.score <= 0) {
      return null;
    }

    return {
      id: String(bestMatch.team.id),
      name: bestMatch.team.name,
      shortName: bestMatch.team.shortName || bestMatch.team.tla || null,
      badge: bestMatch.team.crest || null,
    };
  } catch (error) {
    console.error("Erro na busca do time:", error);
    return null;
  }
}

export const FootballDataService = {
  fetchTeamByClubName,
};

