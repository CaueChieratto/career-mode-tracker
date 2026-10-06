import { doc, getDoc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { auth, db } from "../Firebase";
import { Career } from "../../interfaces/Career";
import { CareerGroup } from "../../interfaces/CareerGroup";
import { OpponentPlayer } from "../../interfaces/OpponentPlayer";
import { normalizeOpponentEvents } from "../../../pages/Match/helpers/opponentCards";

const normalizePlayerName = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

export const sanitizeOpponentPlayer = (
  player: OpponentPlayer,
): OpponentPlayer => {
  const sanitized: OpponentPlayer = {
    id: player.id || uuidv4(),
    name: player.name.trim(),
    createdAt: player.createdAt || Date.now(),
  };

  if (player.team && player.team.trim() !== "") {
    sanitized.team = player.team.trim();
  }
  if (player.groupId) {
    sanitized.groupId = player.groupId;
  } else if (player.careerId) {
    sanitized.careerId = player.careerId;
  }

  return sanitized;
};

export const extractOpponentPlayersFromCareer = (
  careerData: Career,
): OpponentPlayer[] => {
  const playerMap = new Map<string, OpponentPlayer>();

  careerData.clubData?.forEach((season) => {
    season.matches?.forEach((match) => {
      const oppEvents = normalizeOpponentEvents(match.opponentEvents);
      const isHome = match.homeTeam === careerData.clubName;
      const opponentTeam = isHome ? match.awayTeam : match.homeTeam;

      const recordPlayer = (name?: string, existingId?: string) => {
        if (!name || !name.trim()) return;
        const normalized = normalizePlayerName(name);
        if (!playerMap.has(normalized)) {
          const raw: OpponentPlayer = {
            id: existingId || uuidv4(),
            name: name.trim(),
            createdAt: Date.now(),
            ...(opponentTeam ? { team: opponentTeam } : {}),
            ...(careerData.id ? { careerId: careerData.id } : {}),
          };
          playerMap.set(normalized, sanitizeOpponentPlayer(raw));
        }
      };

      oppEvents?.goals?.forEach((g) => recordPlayer(g.player, g.playerId));
      oppEvents?.assists?.forEach((a) => recordPlayer(a.player, a.playerId));
      oppEvents?.cards?.forEach((c) => recordPlayer(c.player, c.playerId));
      oppEvents?.ownGoals?.forEach((og) => recordPlayer(og.player, og.playerId));
      if (match.opponentMvpName) {
        recordPlayer(match.opponentMvpName, match.opponentMvpPlayerId);
      }
    });
  });

  return Array.from(playerMap.values());
};

export const ServiceOpponentPlayers = {
  getOpponentPlayers: async (
    careerId: string,
    groupId?: string | null,
    teamName?: string,
  ): Promise<OpponentPlayer[]> => {
    const user = auth.currentUser;
    if (!user) return [];

    try {
      if (groupId) {
        const groupRef = doc(db, `users/${user.uid}/careerGroups/${groupId}`);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const groupData = groupSnap.data() as CareerGroup;
          if (groupData.opponentPlayers && groupData.opponentPlayers.length > 0) {
            return ServiceOpponentPlayers.sortAndFilter(
              groupData.opponentPlayers,
              teamName,
            );
          }
        }
      }

      const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
      const careerSnap = await getDoc(careerRef);
      if (careerSnap.exists()) {
        const careerData = careerSnap.data() as Career;
        let players = careerData.opponentPlayers;

        if (!players || players.length === 0) {
          players = extractOpponentPlayersFromCareer(careerData);
          if (players.length > 0) {
            const sanitizedBootstrap = players.map(sanitizeOpponentPlayer);
            try {
              if (groupId) {
                const groupRef = doc(
                  db,
                  `users/${user.uid}/careerGroups/${groupId}`,
                );
                await updateDoc(groupRef, {
                  opponentPlayers: sanitizedBootstrap,
                  updatedAt: Date.now(),
                });
              } else {
                await updateDoc(careerRef, {
                  opponentPlayers: sanitizedBootstrap,
                  updatedAt: Date.now(),
                });
              }
            } catch (err) {
              console.warn("Falha ao salvar bootstrap de opponentPlayers:", err);
            }
          }
        }

        return ServiceOpponentPlayers.sortAndFilter(players || [], teamName);
      }
    } catch (error) {
      console.error("Erro ao buscar jogadores adversários:", error);
    }

    return [];
  },

  saveOpponentPlayers: async (
    careerId: string,
    playersToSave: { name: string; team?: string; id?: string }[],
    groupId?: string | null,
  ): Promise<OpponentPlayer[]> => {
    const user = auth.currentUser;
    if (!user) return [];

    const validNewPlayers = playersToSave.filter(
      (p) => p && typeof p.name === "string" && p.name.trim() !== "",
    );
    if (validNewPlayers.length === 0) return [];

    try {
      const targetRef = groupId
        ? doc(db, `users/${user.uid}/careerGroups/${groupId}`)
        : doc(db, `users/${user.uid}/careers/${careerId}`);

      const targetSnap = await getDoc(targetRef);
      if (!targetSnap.exists()) return [];

      const targetData = targetSnap.data() as {
        opponentPlayers?: OpponentPlayer[];
      };
      const existingList: OpponentPlayer[] = targetData.opponentPlayers || [];

      const playerMap = new Map<string, OpponentPlayer>();
      existingList.forEach((p) => {
        playerMap.set(normalizePlayerName(p.name), sanitizeOpponentPlayer(p));
      });

      let hasNew = false;
      validNewPlayers.forEach((p) => {
        const normalized = normalizePlayerName(p.name);
        if (!playerMap.has(normalized)) {
          const newPlayer: OpponentPlayer = {
            id: p.id || uuidv4(),
            name: p.name.trim(),
            createdAt: Date.now(),
            ...(p.team?.trim() ? { team: p.team.trim() } : {}),
            ...(groupId ? { groupId } : careerId ? { careerId } : {}),
          };
          playerMap.set(normalized, sanitizeOpponentPlayer(newPlayer));
          hasNew = true;
        }
      });

      const updatedList = Array.from(playerMap.values()).map(
        sanitizeOpponentPlayer,
      );

      if (hasNew) {
        await updateDoc(targetRef, {
          opponentPlayers: updatedList,
          updatedAt: Date.now(),
        });
      }

      return updatedList;
    } catch (error) {
      console.error("Erro ao salvar jogadores adversários:", error);
      return [];
    }
  },

  sortAndFilter: (
    players: OpponentPlayer[],
    teamName?: string,
  ): OpponentPlayer[] => {
    const sorted = [...players].sort((a, b) => {
      if (teamName) {
        const aMatchesTeam =
          a.team?.trim().toLowerCase() === teamName.trim().toLowerCase();
        const bMatchesTeam =
          b.team?.trim().toLowerCase() === teamName.trim().toLowerCase();
        if (aMatchesTeam && !bMatchesTeam) return -1;
        if (!aMatchesTeam && bMatchesTeam) return 1;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });
    return sorted;
  },
};

