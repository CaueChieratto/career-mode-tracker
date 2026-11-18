import { auth } from "../../../../../../../../common/services/Firebase";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { ServiceMatches } from "../../../../../../../../common/services/ServiceMatches";
import { ServiceTable } from "../../../../../../../../common/services/ServiceTable";
import { ServiceClubBadges } from "../../../../../../../../common/services/ServiceClubBadges";
import {
  normalizeClubName,
  isClubNameMatch,
} from "../../../../../../../../common/helpers/clubMatching";

export { normalizeClubName, isClubNameMatch };

/**
 * Busca o escudo do clube parceiro exclusivamente no banco de dados Firestore (e histórico de carreiras),
 * sem realizar chamadas a APIs externas.
 */
export const findClubBadgeInDatabase = async (
  clubName: string,
  currentCareer?: Career,
  currentSeason?: ClubData,
): Promise<string | null> => {
  if (!clubName || !clubName.trim()) return null;

  // 1. Verificação em memória na carreira atual e temporadas
  if (currentCareer) {
    if (
      currentCareer.clubName &&
      isClubNameMatch(currentCareer.clubName, clubName) &&
      currentCareer.teamBadge
    ) {
      return currentCareer.teamBadge;
    }
    if (currentSeason) {
      const fromSeasonTeams = currentSeason.teams?.find(
        (t) => t.name && isClubNameMatch(t.name, clubName) && t.badge,
      );
      if (fromSeasonTeams?.badge) return fromSeasonTeams.badge;

      const fromSeasonTable = currentSeason.table?.find(
        (t) => t.name && isClubNameMatch(t.name, clubName) && t.badge,
      );
      if (fromSeasonTable?.badge) return fromSeasonTable.badge;
    }
    if (currentCareer.clubData) {
      for (const s of currentCareer.clubData) {
        const tMatch = s.teams?.find(
          (t) => t.name && isClubNameMatch(t.name, clubName) && t.badge,
        );
        if (tMatch?.badge) return tMatch.badge;

        const tblMatch = s.table?.find(
          (t) => t.name && isClubNameMatch(t.name, clubName) && t.badge,
        );
        if (tblMatch?.badge) return tblMatch.badge;
      }
    }
  }

  // 2. Busca através das carreiras do usuário logado via ServiceMatches (mesmo local de AddMatches)
  try {
    const user = auth.currentUser;
    if (user) {
      const teamFromHistory =
        await ServiceMatches.findTeamAcrossUserCareers(clubName);
      if (teamFromHistory?.badge) {
        return teamFromHistory.badge;
      }
      const badgeFromUser = await ServiceMatches.findBadgeAcrossUserCareers(
        user.uid,
        clubName,
      );
      if (badgeFromUser) {
        return badgeFromUser;
      }
    }
  } catch {
    // Ignora eventuais falhas transitórias de conexão ou autenticação
  }

  // 3. Busca no perfil especial (VITE_SPECIAL_USER_ID) via ServiceMatches (mesmo local de AddMatches, sem API)
  try {
    const specialUserId = import.meta.env.VITE_SPECIAL_USER_ID;
    if (specialUserId) {
      const teamFromSpecial =
        await ServiceMatches.findTeamInSpecialUserCareers(
          specialUserId,
          clubName,
        );
      if (teamFromSpecial?.badge) {
        return teamFromSpecial.badge;
      }
      const badgeFromSpecial =
        await ServiceMatches.findBadgeInSpecialUserCareers(
          specialUserId,
          clubName,
        );
      if (badgeFromSpecial) {
        return badgeFromSpecial;
      }
    }
  } catch {
    // Continua
  }

  // 4. Busca na tabela da temporada ativa no Firestore (subcoleção modernizada)
  if (currentCareer?.id && currentSeason?.id) {
    try {
      const tableData = await ServiceTable.getTableBySeason(
        currentCareer.id,
        currentSeason.id,
      );
      const matchInTable = tableData.find(
        (t) => t.name && isClubNameMatch(t.name, clubName) && t.badge,
      );
      if (matchInTable?.badge) {
        return matchInTable.badge;
      }
    } catch {
      // Continua
    }
  }

  // 5. Busca no catálogo de clubes disponíveis nas carreiras do Firestore (sem API externa)
  try {
    const catalog = await ServiceClubBadges.getAvailableClubsCatalog();
    for (const item of Object.values(catalog)) {
      if (item.name && isClubNameMatch(item.name, clubName) && item.badge) {
        return item.badge;
      }
    }
  } catch {
    // Continua
  }

  return null;
};
