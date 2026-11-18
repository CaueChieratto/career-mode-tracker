import { Players } from "../interfaces/playersInfo/players";

/**
 * Retorna a chave canônica de identidade de um jogador.
 * Diferencia homônimos (nomes iguais) com base no ID.
 * Unifica jogadores da base promovidos (ex: ID 'a1' na base e 'academy-a1' no profissional).
 */
export const getPlayerIdentityKey = (
  player: {
    id?: string;
    name?: string;
    nation?: string;
    nationality?: string;
    isAcademy?: boolean;
    academyData?: { id?: string; nationality?: string; nation?: string };
    playedWithUs?: string;
  },
  careerId?: string,
): string => {
  const nation =
    player.nation ||
    player.nationality ||
    player.academyData?.nationality ||
    player.academyData?.nation ||
    "";

  // Para save-1786982104992 a chave mantém a regra estrita de nome + nacionalidade
  if (careerId === "save-1786982104992") {
    if (player.name && nation) {
      return `${player.name.trim().toLowerCase()}-${nation.trim().toLowerCase()}`;
    }
  }

  // 1. Identidade canônica por nome + nacionalidade
  if (player.name && nation) {
    return `${player.name.trim().toLowerCase()}-${nation.trim().toLowerCase()}`;
  }

  // 2. playedWithUs explícito
  if (player.playedWithUs) {
    return player.playedWithUs;
  }

  // 3. Base da academia
  if (player.academyData?.id) {
    return `academy:${player.academyData.id}`;
  }
  if (player.id?.startsWith("academy-")) {
    return `academy:${player.id.slice("academy-".length)}`;
  }
  if (player.isAcademy && player.id) {
    return `academy:${player.id}`;
  }

  return player.id || "";
};

export interface PlayerIdentityInput {
  id?: string;
  name?: string;
  nation?: string;
  nationality?: string;
  isAcademy?: boolean;
  academyData?: { id?: string; nationality?: string; nation?: string };
  playedWithUs?: string;
}

/**
 * Compara se um playerId ou objeto de jogador corresponde a outro.
 * Trata playedWithUs, variações de prefixo 'academy-', isAcademy e vínculo academyData.
 */
export const isSamePlayerId = (
  idOrPlayerA:
    | string
    | {
        id?: string;
        isAcademy?: boolean;
        academyData?: { id?: string };
        playedWithUs?: string;
      }
    | undefined,
  idOrPlayerB:
    | string
    | {
        id?: string;
        isAcademy?: boolean;
        academyData?: { id?: string };
        playedWithUs?: string;
      }
    | undefined,
): boolean => {
  if (!idOrPlayerA || !idOrPlayerB) return false;
  const idA = typeof idOrPlayerA === "string" ? idOrPlayerA : idOrPlayerA.id;
  const idB = typeof idOrPlayerB === "string" ? idOrPlayerB : idOrPlayerB.id;
  if (!idA || !idB) return false;
  if (idA === idB) return true;

  const playedWithUsA =
    typeof idOrPlayerA === "object" ? idOrPlayerA.playedWithUs : undefined;
  const playedWithUsB =
    typeof idOrPlayerB === "object" ? idOrPlayerB.playedWithUs : undefined;

  if (
    playedWithUsA &&
    (playedWithUsA === idB || playedWithUsA === playedWithUsB)
  )
    return true;
  if (
    playedWithUsB &&
    (playedWithUsB === idA || playedWithUsB === playedWithUsA)
  )
    return true;

  const cleanA = idA.startsWith("academy-") ? idA.slice(8) : idA;
  const cleanB = idB.startsWith("academy-") ? idB.slice(8) : idB;
  if (cleanA === cleanB) return true;

  const academyDataA =
    typeof idOrPlayerA === "object" ? idOrPlayerA.academyData?.id : undefined;
  const academyDataB =
    typeof idOrPlayerB === "object" ? idOrPlayerB.academyData?.id : undefined;

  if (academyDataA && (academyDataA === idB || academyDataA === cleanB))
    return true;
  if (academyDataB && (academyDataB === idA || academyDataB === cleanA))
    return true;

  return false;
};

/**
 * Encontra no elenco o jogador correspondente a um registro de playerStat da partida.
 */
export const matchPlayerStatToPlayer = (
  statPlayerId: string,
  players: Players[],
): Players | undefined => {
  // 1. Tenta match exato primeiro (mais rápido)
  const exact = players.find((p) => p.id === statPlayerId);
  if (exact) return exact;

  // 2. Tenta match com normalização de base / academy
  return players.find((p) => isSamePlayerId(statPlayerId, p));
};

/**
 * Encontra um jogador em uma lista pelo ID (incluindo playedWithUs e vínculos da base)
 * ou por fallback canônico de nome + nacionalidade.
 */
export function findPlayerInList<T extends PlayerIdentityInput>(
  players: T[] | undefined | null,
  targetPlayer: PlayerIdentityInput | undefined | null,
): T | undefined {
  if (!players || !targetPlayer) return undefined;

  const byId = players.find((p) => isSamePlayerId(p, targetPlayer));
  if (byId) return byId;

  if (targetPlayer.name && targetPlayer.nation) {
    const normalizedName = targetPlayer.name.trim().toLowerCase();
    const normalizedNation = targetPlayer.nation.trim().toLowerCase();
    return players.find(
      (p) =>
        Boolean(p.name && p.nation) &&
        p.name!.trim().toLowerCase() === normalizedName &&
        p.nation!.trim().toLowerCase() === normalizedNation,
    );
  }

  return undefined;
}
