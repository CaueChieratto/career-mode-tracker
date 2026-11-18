import { useState, useEffect, useCallback, useRef } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { TransferItem } from "../types";
import { TransferProposal } from "../../../../../../../../common/interfaces/proposals/transferProposal";
import {
  findClubBadgeInDatabase,
  isClubNameMatch,
  normalizeClubName,
} from "../helpers/findClubBadgeInDatabase";

export interface UsePartnerClubBadgesResult {
  dbBadges: Record<string, string>;
  getClubBadgeUrl: (clubName?: string) => string | undefined;
}

export const usePartnerClubBadges = (
  career: Career,
  season: ClubData,
  allTransfers: TransferItem[],
  proposals?: TransferProposal[],
): UsePartnerClubBadgesResult => {
  const [dbBadges, setDbBadges] = useState<Record<string, string>>({});
  const inFlightClubsRef = useRef<Set<string>>(new Set());

  const getClubBadgeUrl = useCallback(
    (clubName?: string): string | undefined => {
      if (!clubName || !clubName.trim()) return undefined;
      const clean = normalizeClubName(clubName);

      // 1. Escudo recuperado do banco de dados Firestore (ou cache positivo)
      if (dbBadges[clean]) {
        return dbBadges[clean];
      }
      for (const [key, badge] of Object.entries(dbBadges)) {
        if (badge && isClubNameMatch(key, clubName)) {
          return badge;
        }
      }

      // 2. Escudo do próprio clube da carreira
      if (
        career.clubName &&
        isClubNameMatch(career.clubName, clubName) &&
        career.teamBadge
      ) {
        return career.teamBadge;
      }

      // 3. Escudo em season.teams (mesmo local de AddMatches)
      const fromSeasonTeams = season.teams?.find(
        (t) => t.name && isClubNameMatch(t.name, clubName) && t.badge,
      );
      if (fromSeasonTeams?.badge) return fromSeasonTeams.badge;

      // 4. Escudo em season.table
      const fromSeasonTable = season.table?.find(
        (t) => t.name && isClubNameMatch(t.name, clubName) && t.badge,
      );
      if (fromSeasonTable?.badge) return fromSeasonTable.badge;

      // 5. Escudo em outras temporadas da mesma carreira
      if (career.clubData) {
        for (const s of career.clubData) {
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
      return undefined;
    },
    [career, season, dbBadges],
  );

  useEffect(() => {
    let isMounted = true;

    // Coleta clubes de transferências (saídas, chegadas e renovações)
    const transferClubs = allTransfers
      .map((t) => {
        if (t.direction === "renewals") {
          return career.clubName;
        }
        return t.direction === "exit"
          ? t.contract.leftClub
          : t.contract.fromClub;
      })
      .filter((c): c is string => Boolean(c && c.trim()));

    // Coleta clubes de propostas (vendas, compras, empréstimos e renovações)
    const proposalClubs = (proposals || [])
      .map((p) => {
        if (p.type === "renovacao") {
          return career.clubName;
        }
        return (
          p.clubNegotiation?.partnerClub ||
          p.formState?.formValues?.partnerClub ||
          p.formState?.formValues?.fromClub ||
          p.formState?.formValues?.toClub
        );
      })
      .filter((c): c is string => Boolean(c && c.trim()));

    const careerClubs = career.clubName ? [career.clubName] : [];

    const uniqueClubs = Array.from(
      new Set([...transferClubs, ...proposalClubs, ...careerClubs]),
    );

    const missingClubs = uniqueClubs.filter((club) => {
      const clean = normalizeClubName(club);
      if (
        !clean ||
        clean === "base" ||
        clean === "aposentou" ||
        clean === "aposentadoria" ||
        clean === "fim de contrato" ||
        clean === "nao informado" ||
        clean === "-"
      ) {
        return false;
      }
      if (dbBadges[clean] !== undefined) return false;
      if (getClubBadgeUrl(club)) return false;
      if (inFlightClubsRef.current.has(clean)) return false;
      return true;
    });

    if (missingClubs.length === 0) return;

    missingClubs.forEach((club) => {
      inFlightClubsRef.current.add(normalizeClubName(club));
    });

    const loadBadges = async () => {
      const fetched: Record<string, string> = {};
      await Promise.all(
        missingClubs.map(async (club) => {
          const clean = normalizeClubName(club);
          try {
            const badge = await findClubBadgeInDatabase(club, career, season);
            if (isMounted) {
              fetched[clean] = badge || "";
            }
          } catch {
            if (isMounted) {
              fetched[clean] = "";
            }
          } finally {
            inFlightClubsRef.current.delete(clean);
          }
        }),
      );

      if (isMounted && Object.keys(fetched).length > 0) {
        setDbBadges((prev) => ({ ...prev, ...fetched }));
      }
    };

    void loadBadges();

    return () => {
      isMounted = false;
    };
  }, [allTransfers, proposals, career, season, getClubBadgeUrl, dbBadges]);

  return { dbBadges, getClubBadgeUrl };
};

export default usePartnerClubBadges;
