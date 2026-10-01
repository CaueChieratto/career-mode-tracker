interface TheSportsDBTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort: string | null;
  strAlternate: string | null;
  strBadge: string | null;
  strColour1: string | null;
  strColour2: string | null;
  [key: string]: unknown;
}

interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
  clubColors?: string | null;
}

interface FootballDataResponse {
  count: number;
  teams: FootballDataTeam[];
}

const API_TOKEN = import.meta.env.VITE_FOOTBALL_DATA_API_TOKEN;

if (!API_TOKEN) {
  throw new Error("VITE_FOOTBALL_DATA_API_TOKEN não definido no .env");
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function mapFootballDataToOurFormat(team: FootballDataTeam): TheSportsDBTeam {
  let color1 = null;
  let color2 = null;

  if (team.clubColors) {
    const colors = team.clubColors.split("/").map((c: string) => c.trim());
    if (colors.length > 0) color1 = colors[0];
    if (colors.length > 1) color2 = colors[1];
  }

  return {
    idTeam: String(team.id),
    strTeam: team.name,
    strTeamShort: team.shortName || team.tla || null,
    strAlternate: null,
    strBadge: team.crest || null,
    strColour1: color1,
    strColour2: color2,
  };
}

function sanitizeTeamName(name: string): string {
  return normalizeText(name)
    .replace(/^(fc|ac|sc|cd|ca|cf|club)\s+/, "")
    .trim();
}

export async function fetchTeamByClubName(
  club: string,
): Promise<TheSportsDBTeam | null> {
  if (!club) return null;
  console.log(
    `[API CALL] 🌐 Chamando a API externa para buscar o time: "${club}"`,
  );

  const url = `/api/football-data/teams?limit=500`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Auth-Token": API_TOKEN,
      },
    });

    if (res.status === 429) {
      throw new Error("Limite da API atingido");
    }

    if (!res.ok) {
      throw new Error(`Erro na API (Status: ${res.status})`);
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

      return a.team.name.length - b.team.name.length;
    })[0];

    if (!bestMatch || bestMatch.score <= 0) {
      return null;
    }

    return mapFootballDataToOurFormat(bestMatch.team);
  } catch (error) {
    console.error("Erro na busca do time:", error);
    return null;
  }
}
