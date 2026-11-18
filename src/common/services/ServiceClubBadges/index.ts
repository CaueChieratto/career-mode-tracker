import { collection, getDocs } from "firebase/firestore";
import { Career } from "../../interfaces/Career";
import { Teams } from "../../interfaces/Teams";
import { auth, db } from "../Firebase";
import { FootballDataService } from "../FootballDataService";
import { isClubNameMatch } from "../../helpers/clubMatching";

export interface ClubCatalogItem {
  name: string;
  badge?: string;
  colors?: string[];
}

export function normalizeClubKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isValidColorsArray(colors: unknown): colors is string[] {
  return (
    Array.isArray(colors) &&
    colors.length >= 2 &&
    colors.every((c) => Boolean(c && typeof c === "string"))
  );
}

export function extractTeamFromCareers(
  careers: Career[],
  clubName: string,
): Teams | null {
  const target = normalizeClubKey(clubName);
  if (!target) return null;

  let bestMatch: Teams | null = null;

  for (const careerData of careers) {
    // 1. Verifica se o clube da própria carreira é o clube buscado
    if (
      careerData.clubName &&
      normalizeClubKey(careerData.clubName) === target
    ) {
      const colors = isValidColorsArray(careerData.colorsTeams)
        ? careerData.colorsTeams
        : undefined;

      const team: Teams = {
        name: careerData.clubName,
        badge: careerData.teamBadge || "",
        colors,
      };

      // Se possui badge e colors válidas, é o registro autoritativo da carreira do clube!
      if (team.badge && team.colors) {
        return team;
      }
      if (!bestMatch || (!bestMatch.colors && team.colors)) {
        bestMatch = team;
      }
    }

    // 2. Verifica season.teams
    if (careerData.clubData) {
      for (const season of careerData.clubData) {
        if (season.teams) {
          for (const t of season.teams) {
            if (t.name && normalizeClubKey(t.name) === target) {
              const colors = isValidColorsArray(t.colors) ? t.colors : undefined;
              const team: Teams = {
                name: t.name,
                badge: t.badge || "",
                colors,
                leagueName: t.leagueName,
              };

              if (team.badge && team.colors) {
                if (!bestMatch || !bestMatch.colors) {
                  bestMatch = team;
                }
              } else if (!bestMatch && (team.badge || team.colors)) {
                bestMatch = team;
              }
            }
          }
        }
      }
    }

    // 3. Verifica season.table (fallback apenas de badge caso não tenha achado ainda)
    if (!bestMatch && careerData.clubData) {
      for (const season of careerData.clubData) {
        if (season.table) {
          for (const row of season.table) {
            if (row.name && normalizeClubKey(row.name) === target && row.badge) {
              bestMatch = {
                name: row.name,
                badge: row.badge,
              };
              break;
            }
          }
        }
      }
    }
  }

  // 4. Se não encontrou por chave normalizada estrita, busca por correspondência flexível (ex: "Arsenal FC" vs "Arsenal")
  if (!bestMatch) {
    for (const careerData of careers) {
      if (
        careerData.clubName &&
        isClubNameMatch(careerData.clubName, clubName)
      ) {
        const colors = isValidColorsArray(careerData.colorsTeams)
          ? careerData.colorsTeams
          : undefined;
        const team: Teams = {
          name: careerData.clubName,
          badge: careerData.teamBadge || "",
          colors,
        };
        if (team.badge && team.colors) {
          return team;
        }
        if (!bestMatch || (!bestMatch.colors && team.colors)) {
          bestMatch = team;
        }
      }

      if (careerData.clubData) {
        for (const season of careerData.clubData) {
          if (season.teams) {
            for (const t of season.teams) {
              if (t.name && isClubNameMatch(t.name, clubName)) {
                const colors = isValidColorsArray(t.colors) ? t.colors : undefined;
                const team: Teams = {
                  name: t.name,
                  badge: t.badge || "",
                  colors,
                  leagueName: t.leagueName,
                };
                if (team.badge && team.colors) {
                  if (!bestMatch || !bestMatch.colors) {
                    bestMatch = team;
                  }
                } else if (!bestMatch && (team.badge || team.colors)) {
                  bestMatch = team;
                }
              }
            }
          }
        }
      }

      if (!bestMatch && careerData.clubData) {
        for (const season of careerData.clubData) {
          if (season.table) {
            for (const row of season.table) {
              if (row.name && isClubNameMatch(row.name, clubName) && row.badge) {
                bestMatch = {
                  name: row.name,
                  badge: row.badge,
                };
                break;
              }
            }
          }
        }
      }
    }
  }

  return bestMatch;
}

function collectClubsCatalogFromCareers(
  careers: Career[],
  catalogMap: Map<string, ClubCatalogItem>,
  isPriority = false,
): void {
  for (const careerData of careers) {
    if (careerData.clubName) {
      const key = normalizeClubKey(careerData.clubName);
      const existing = catalogMap.get(key);
      const colors = isValidColorsArray(careerData.colorsTeams)
        ? careerData.colorsTeams
        : undefined;
      const badge = careerData.teamBadge?.trim() || "";

      if (isPriority || !existing) {
        catalogMap.set(key, {
          name: careerData.clubName.trim(),
          badge: badge || existing?.badge || "",
          colors: colors || existing?.colors,
        });
      } else {
        if (!existing.badge && badge) existing.badge = badge;
        if (!existing.colors && colors) existing.colors = colors;
      }
    }

    if (careerData.clubData) {
      for (const season of careerData.clubData) {
        if (season.teams) {
          for (const t of season.teams) {
            if (t.name) {
              const key = normalizeClubKey(t.name);
              const existing = catalogMap.get(key);
              const colors = isValidColorsArray(t.colors) ? t.colors : undefined;
              const badge = t.badge?.trim() || "";

              if (isPriority || !existing) {
                catalogMap.set(key, {
                  name: t.name.trim(),
                  badge: badge || existing?.badge || "",
                  colors: colors || existing?.colors,
                });
              } else {
                if (!existing.badge && badge) existing.badge = badge;
                if (!existing.colors && colors) existing.colors = colors;
              }
            }
          }
        }
        if (season.table) {
          for (const row of season.table) {
            if (row.name && Boolean(row.badge?.trim())) {
              const key = normalizeClubKey(row.name);
              const existing = catalogMap.get(key);
              if (!existing) {
                catalogMap.set(key, {
                  name: row.name.trim(),
                  badge: row.badge.trim(),
                });
              } else if (!existing.badge) {
                existing.badge = row.badge.trim();
              }
            }
          }
        }
      }
    }
  }
}

export const ServiceClubBadges = {
  findTeamAcrossUserCareers: async (
    teamName: string,
  ): Promise<Teams | null> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careersRef = collection(db, `users/${user.uid}/careers`);
    const snapshot = await getDocs(careersRef);
    const careers = snapshot.docs.map((d) => d.data() as Career);

    return extractTeamFromCareers(careers, teamName);
  },

  findTeamInSpecialUserCareers: async (
    specialUserId: string,
    teamName: string,
  ): Promise<Teams | null> => {
    if (!specialUserId || !teamName || !teamName.trim()) {
      return null;
    }

    const careersRef = collection(db, `users/${specialUserId}/careers`);
    const snapshot = await getDocs(careersRef);
    const careers = snapshot.docs.map((d) => d.data() as Career);

    return extractTeamFromCareers(careers, teamName);
  },

  getAvailableClubsCatalog: async (): Promise<
    Record<string, ClubCatalogItem>
  > => {
    const catalogMap = new Map<string, ClubCatalogItem>();

    const specialUserId = import.meta.env.VITE_SPECIAL_USER_ID;
    const currentUser = auth.currentUser;
    const isSpecialUser = Boolean(
      currentUser?.uid && specialUserId && currentUser.uid === specialUserId,
    );

    // 1. Carrega o catálogo do usuário especial primeiro (define a cor "Real" de referência e badges)
    if (specialUserId && !isSpecialUser) {
      try {
        const careersRef = collection(db, `users/${specialUserId}/careers`);
        const snapshot = await getDocs(careersRef);
        const careers = snapshot.docs.map((d) => d.data() as Career);
        collectClubsCatalogFromCareers(careers, catalogMap, true);
      } catch (err) {
        console.warn("Erro ao buscar catálogo do usuário especial:", err);
      }
    }

    // 2. Carrega as carreiras do usuário atual (cores customizadas do usuário têm prioridade para ele)
    if (currentUser) {
      try {
        const careersRef = collection(db, `users/${currentUser.uid}/careers`);
        const snapshot = await getDocs(careersRef);
        const careers = snapshot.docs.map((d) => d.data() as Career);
        collectClubsCatalogFromCareers(careers, catalogMap, true);
      } catch (err) {
        console.warn("Erro ao buscar clubes do usuário:", err);
      }
    }

    const result: Record<string, ClubCatalogItem> = {};
    for (const [key, item] of catalogMap.entries()) {
      result[key] = item;
    }
    return result;
  },

  getAvailableClubsWithBadges: async (): Promise<string[]> => {
    const catalog = await ServiceClubBadges.getAvailableClubsCatalog();
    return Object.values(catalog)
      .filter((c) => Boolean(c.badge?.trim() || c.colors?.length))
      .map((c) => c.name)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  },

  resolveClubBadge: async (clubName: string): Promise<string> => {
    if (!clubName || !clubName.trim()) {
      return "";
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const fromUser =
          await ServiceClubBadges.findTeamAcrossUserCareers(clubName);
        if (fromUser && fromUser.badge && fromUser.badge.trim()) {
          return fromUser.badge;
        }
      } catch (err) {
        console.warn("Erro ao buscar escudo no histórico do usuário:", err);
      }
    }

    const specialUserId = import.meta.env.VITE_SPECIAL_USER_ID;
    const currentUid = currentUser?.uid;
    const isSpecialUser = Boolean(
      currentUid && specialUserId && currentUid === specialUserId,
    );

    if (isSpecialUser) {
      const apiTeam = await FootballDataService.fetchTeamByClubName(clubName);
      return apiTeam?.badge || "";
    }

    if (specialUserId) {
      const fromSpecial =
        await ServiceClubBadges.findTeamInSpecialUserCareers(
          specialUserId,
          clubName,
        );
      return fromSpecial?.badge || "";
    }

    return "";
  },

  resolveClubColors: async (clubName: string): Promise<string[] | null> => {
    if (!clubName || !clubName.trim()) {
      return null;
    }

    const currentUser = auth.currentUser;
    const specialUserId = import.meta.env.VITE_SPECIAL_USER_ID;
    const isSpecialUser = Boolean(
      currentUser?.uid && specialUserId && currentUser.uid === specialUserId,
    );

    // 1. Busca no histórico do usuário atual
    let userTeam: Teams | null = null;
    if (currentUser) {
      try {
        userTeam = await ServiceClubBadges.findTeamAcrossUserCareers(clubName);
      } catch (err) {
        console.warn("Erro ao buscar clube no histórico do usuário:", err);
      }
    }

    // 2. Busca no catálogo do usuário especial (que define a cor "Real")
    let specialTeam: Teams | null = null;
    if (specialUserId && !isSpecialUser) {
      try {
        specialTeam = await ServiceClubBadges.findTeamInSpecialUserCareers(
          specialUserId,
          clubName,
        );
      } catch (err) {
        console.warn("Erro ao buscar clube no catálogo especial:", err);
      }
    }

    const specialColors =
      specialTeam?.colors && specialTeam.colors.length >= 2
        ? specialTeam.colors
        : null;

    const userColors =
      userTeam?.colors && userTeam.colors.length >= 2 ? userTeam.colors : null;

    // Se o usuário atual for o usuário especial:
    if (isSpecialUser) {
      return userColors;
    }

    // Se o usuário atual escolheu uma cor customizada para esse clube em suas carreiras:
    // "e se outros users escolherem outras cores fiquem apenas para o user especifico"
    if (userColors) {
      return userColors;
    }

    // Se não tiver cor customizada do usuário, usa a cor "Real" definida pelo usuário especial:
    if (specialColors) {
      return specialColors;
    }

    // Se o usuário especial ainda não definiu a cor "Real", mas foi a primeira seleção de cor do clube:
    return userColors || null;
  },
};
