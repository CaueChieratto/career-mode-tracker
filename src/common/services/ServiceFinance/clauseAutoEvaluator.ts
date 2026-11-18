import { Career } from "../../interfaces/Career";
import { ClubData } from "../../interfaces/club/clubData";
import { League } from "../../interfaces/League";
import { Match } from "../../interfaces/Match";
import { QualificationZone, TableRowData } from "../../interfaces/Table";
import { TableTeamData } from "../../interfaces/TableTeamData";
import { Players } from "../../interfaces/playersInfo/players";
import { TransferBonus, ClauseStatus } from "../../interfaces/playersInfo/transferTerms";
import { ContractDetails } from "../../interfaces/playersInfo/contractClauses";
import {
  contributesToLeagueStandings,
  getAllLeaguesFlat,
} from "../../utils/league";

export interface PlayerSeasonAggregatedStats {
  playerId: string;
  games: number;
  goals: number;
  assists: number;
  cleanSheets: number;
}

export interface EvaluatedBonusItem {
  bonus: TransferBonus;
  calculatedProgress: number;
  target: number;
  isAchieved: boolean;
  isReadyToPay: boolean;
  status: ClauseStatus;
  achievedInMatchId?: string;
  evaluationDetail?: string;
}

export interface AchievedObjectiveBonusCandidate {
  playerId: string;
  playerName: string;
  contractIndex?: number;
  isContractDetailsBonus: boolean;
  bonus: TransferBonus;
  evaluation: EvaluatedBonusItem;
}

export interface WageAdjustmentEvaluation {
  enabled: boolean;
  applied: boolean;
  outcome: "increased" | "decreased" | "pending";
  originalWage: number;
  adjustedWage: number;
  percentage: number;
  reason: string;
}

export const normalizeStageName = (stage?: string): string => {
  if (!stage) return "";
  return stage
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export const getStageWeight = (stage?: string): number => {
  const norm = normalizeStageName(stage);
  if (!norm) return 0;

  if (
    norm.includes("16 avos") ||
    norm.includes("16-avos") ||
    norm.includes("dezesseis") ||
    norm.includes("fase de 16") ||
    norm.includes("playoff")
  ) {
    return 1;
  }
  if (norm.includes("oitava")) {
    return 2;
  }
  if (norm.includes("quarta")) {
    return 3;
  }
  if (
    norm.includes("semifina") ||
    norm.includes("semi-fina") ||
    norm.includes("semi")
  ) {
    return 4;
  }
  if (norm.includes("final")) {
    return 5;
  }
  return 0;
};

const getDefaultQualificationZone = (
  position: number,
  totalTeams: number,
  isFirstDivision: boolean,
): QualificationZone => {
  if (isFirstDivision) {
    if (position === 1) return "first";
    if (position >= 2 && position <= 4) return "champions";
    if (position === 5) return "europa";
    if (position === 6) return "conference";
    if (totalTeams >= 4 && position >= totalTeams - 2) return "relegation";
  } else {
    if (position === 1) return "first";
    if (position === 2) return "promotion";
    if (position >= 3 && position <= 6) return "promotion_playoff";
    if (totalTeams >= 5 && position >= totalTeams - 3) return "relegation";
  }
  return "none";
};

export const normalizeTableRows = (
  rawTable: Array<TableRowData | TableTeamData> = [],
  isFirstDivision: boolean = true,
): TableRowData[] => {
  if (!rawTable || rawTable.length === 0) return [];

  const allHavePositionAndZone = rawTable.every(
    (row) =>
      "position" in row &&
      typeof row.position === "number" &&
      row.position > 0 &&
      "zone" in row &&
      Boolean(row.zone),
  );

  if (allHavePositionAndZone) {
    return [...(rawTable as TableRowData[])].sort(
      (a, b) => a.position - b.position,
    );
  }

  const sorted = [...rawTable].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });

  return sorted.map((team, index) => {
    const position = index + 1;
    const defaultZone = getDefaultQualificationZone(
      position,
      sorted.length,
      isFirstDivision,
    );
    const customZone =
      "customZone" in team ? team.customZone : undefined;
    const existingZone = "zone" in team ? team.zone : undefined;
    const zone: QualificationZone =
      customZone && customZone !== "default"
        ? customZone
        : existingZone || defaultZone;

    return {
      ...team,
      position,
      zone,
    };
  });
};

/**
 * Calcula as estatísticas agregadas de um jogador a partir das partidas finalizadas.
 * Clean Sheet: Qualquer atleta em campo (goleiro, zagueiro, meio-campista ou atacante)
 * pontua se participou da partida oficial (minutesPlayed > 0) e a equipe não sofreu gols.
 */
export const calculatePlayerSeasonStats = (
  playerId: string,
  matches: Match[] = [],
  userClubName?: string,
): PlayerSeasonAggregatedStats => {
  let games = 0;
  let goals = 0;
  let assists = 0;
  let cleanSheets = 0;

  const finishedMatches = matches.filter((m) => m.status === "FINISHED");
  const normClub = userClubName?.trim().toLowerCase();

  for (const match of finishedMatches) {
    const statsList = match.playerStats || [];
    const playerStat = statsList.find((s) => s.playerId === playerId);

    if (!playerStat || (playerStat.minutesPlayed ?? 0) <= 0) {
      continue;
    }

    games += 1;
    goals += playerStat.goals || 0;
    assists += playerStat.assists || 0;

    // Regra mandatória de Clean Sheet: sem restrição de posição
    let concededZero = false;

    if (playerStat.cleanSheet === true) {
      concededZero = true;
    } else if (normClub) {
      const isHome = match.homeTeam.trim().toLowerCase() === normClub;
      const isAway = match.awayTeam.trim().toLowerCase() === normClub;

      if (isHome && (match.awayScore ?? 1) === 0) {
        concededZero = true;
      } else if (isAway && (match.homeScore ?? 1) === 0) {
        concededZero = true;
      }
    } else {
      // Se userClubName não foi passado, verifica se o placar do adversário foi zero
      // inferindo pelo homeScore/awayScore quando o playerStat pontua defenses ou quando um dos lados é 0
      if ((match.awayScore ?? 1) === 0 || (match.homeScore ?? 1) === 0) {
        if (playerStat.cleanSheet !== false) {
          concededZero = true;
        }
      }
    }

    if (concededZero) {
      cleanSheets += 1;
    }
  }

  return {
    playerId,
    games,
    goals,
    assists,
    cleanSheets,
  };
};

/**
 * Calcula a tabela de artilheiros e garçons da temporada entre todos os atletas.
 */
export const calculateSeasonLeaders = (
  players: Players[] = [],
  matches: Match[] = [],
  userClubName?: string,
): {
  topScorerPlayerIds: string[];
  topAssistPlayerIds: string[];
  maxGoals: number;
  maxAssists: number;
} => {
  const statsMap = new Map<string, PlayerSeasonAggregatedStats>();

  for (const p of players) {
    statsMap.set(p.id, calculatePlayerSeasonStats(p.id, matches, userClubName));
  }

  let maxGoals = 0;
  let maxAssists = 0;

  for (const stat of statsMap.values()) {
    if (stat.goals > maxGoals) maxGoals = stat.goals;
    if (stat.assists > maxAssists) maxAssists = stat.assists;
  }

  const topScorerPlayerIds: string[] = [];
  const topAssistPlayerIds: string[] = [];

  if (maxGoals > 0) {
    for (const [id, stat] of statsMap.entries()) {
      if (stat.goals === maxGoals) topScorerPlayerIds.push(id);
    }
  }

  if (maxAssists > 0) {
    for (const [id, stat] of statsMap.entries()) {
      if (stat.assists === maxAssists) topAssistPlayerIds.push(id);
    }
  }

  return {
    topScorerPlayerIds,
    topAssistPlayerIds,
    maxGoals,
    maxAssists,
  };
};

const isFinalMatchStage = (stage?: string): boolean =>
  getStageWeight(stage) === 5;

/**
 * Avalia se o time venceu título de Copa ou mata-mata (stage === "Final" e vitória/agregado).
 */
export const checkCupTitleWon = (
  matches: Match[] = [],
  userClubName?: string,
): boolean => {
  const normClub = userClubName?.trim().toLowerCase();

  return matches.some((m) => {
    if (m.status !== "FINISHED" || !isFinalMatchStage(m.stage)) return false;

    if (m.isReturnMatch && m.firstLegScore) {
      const isHome = normClub
        ? m.homeTeam.trim().toLowerCase() === normClub
        : true;
      const leg2User = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const leg2Opp = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      const userAgg = m.firstLegScore.userScore + leg2User;
      const oppAgg = m.firstLegScore.opponentScore + leg2Opp;

      if (userAgg > oppAgg) return true;
      if (userAgg < oppAgg) return false;
      return m.result === "V" || (m.result as string) === "WIN";
    }

    return m.result === "V" || (m.result as string) === "WIN";
  });
};

/**
 * Avalia se um clube parceiro (ex.: comprador em bônus a receber) venceu uma final contra o clube do usuário.
 */
const checkPartnerClubCupTitleWon = (
  matches: Match[] = [],
  partnerClub: string,
): boolean => {
  const normPartner = partnerClub.trim().toLowerCase();
  if (!normPartner) return false;

  return matches.some((m) => {
    if (m.status !== "FINISHED" || !isFinalMatchStage(m.stage)) return false;
    const involvesPartner =
      m.homeTeam?.trim().toLowerCase() === normPartner ||
      m.awayTeam?.trim().toLowerCase() === normPartner;
    if (!involvesPartner) return false;

    if (m.isReturnMatch && m.firstLegScore) {
      const partnerIsHome = m.homeTeam?.trim().toLowerCase() === normPartner;
      const leg2Partner = partnerIsHome
        ? (m.homeScore ?? 0)
        : (m.awayScore ?? 0);
      const leg2User = partnerIsHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      const partnerAgg = m.firstLegScore.opponentScore + leg2Partner;
      const userAgg = m.firstLegScore.userScore + leg2User;
      if (partnerAgg > userAgg) return true;
      if (partnerAgg < userAgg) return false;
    }

    return m.result === "D" || (m.result as string) === "LOSS";
  });
};

/**
 * Avalia a fase máxima alcançada em torneios mata-mata.
 */
export const checkCupStageReached = (
  requiredStage: string,
  matches: Match[] = [],
): boolean => {
  const targetWeight = getStageWeight(requiredStage);
  if (targetWeight === 0) return false;

  return matches.some((m) => {
    const statusUpper = m.status?.toUpperCase?.() || "";
    if (statusUpper !== "FINISHED") return false;
    const stage = m.stage || (m as { matchStage?: string }).matchStage;
    const matchWeight = getStageWeight(stage);
    return matchWeight >= targetWeight;
  });
};

export interface CheckLeagueTableObjectiveOptions {
  isFirstDivision?: boolean;
  enforceCompletionOrClinch?: boolean;
}

const isContinentalZone = (zone: QualificationZone, position: number): boolean =>
  zone === "champions" ||
  zone === "europa" ||
  zone === "conference" ||
  zone === "first" ||
  position <= 4;

const isPromotionZone = (zone: QualificationZone): boolean =>
  zone === "promotion_playoff" ||
  zone === "promotion" ||
  zone === "first";

const isMathematicallyAhead = (
  userRow: TableRowData,
  challenger: TableRowData | undefined,
  totalRounds: number,
): boolean => {
  if (!challenger) return false;
  const remaining = Math.max(0, totalRounds - (challenger.played ?? 0));
  const maxChallengerPoints = (challenger.points ?? 0) + remaining * 3;
  return (userRow.points ?? 0) > maxChallengerPoints;
};

/**
 * Avalia as metas de classificação na tabela de Liga Nacional.
 */
export const checkLeagueTableObjective = (
  objectiveTarget: string,
  table: Array<TableRowData | TableTeamData> = [],
  userClubName?: string,
  options?: CheckLeagueTableObjectiveOptions,
): boolean => {
  if (!table || table.length === 0) return false;

  const normalizedTable = normalizeTableRows(
    table,
    options?.isFirstDivision ?? true,
  );
  const enforceCompletionOrClinch = Boolean(options?.enforceCompletionOrClinch);

  const normTarget = normalizeStageName(objectiveTarget);
  const normClub = userClubName?.trim().toLowerCase();

  let userRow = normClub
    ? normalizedTable.find((r) => r.name.trim().toLowerCase() === normClub)
    : undefined;

  // Se não encontrou pelo nome do clube, fallback para row 1 apenas quando userClubName não foi informado
  if (!userRow && !normClub && normTarget.includes("campe")) {
    userRow = normalizedTable.find((r) => r.position === 1);
  }

  if (!userRow) return false;

  const totalRounds =
    normalizedTable.length >= 2 ? (normalizedTable.length - 1) * 2 : 0;
  const isSeasonFinished =
    totalRounds === 0
      ? (userRow.played ?? 0) > 0
      : (userRow.played ?? 0) >= totalRounds;

  if (enforceCompletionOrClinch && (userRow.played ?? 0) <= 0) {
    return false;
  }

  // 1. Campeão
  if (
    normTarget.includes("campe") ||
    normTarget.includes("titulo") ||
    normTarget.includes("1º") ||
    normTarget.includes("primeiro")
  ) {
    if (userRow.position !== 1) return false;
    if (!enforceCompletionOrClinch || isSeasonFinished) return true;
    const secondRow = normalizedTable.find((r) => r.position === 2);
    return isMathematicallyAhead(userRow, secondRow, totalRounds);
  }

  // 2. Vaga Continental / Champions / Europa
  if (
    normTarget.includes("europa") ||
    normTarget.includes("champions") ||
    normTarget.includes("continental") ||
    normTarget.includes("conference") ||
    normTarget.includes("libertadores") ||
    normTarget.includes("sulamericana")
  ) {
    if (!isContinentalZone(userRow.zone, userRow.position)) return false;
    if (!enforceCompletionOrClinch || isSeasonFinished) return true;
    const firstOutsideRow = normalizedTable.find(
      (r) => !isContinentalZone(r.zone, r.position),
    );
    return isMathematicallyAhead(userRow, firstOutsideRow, totalRounds);
  }

  // 3. Evitar Rebaixamento
  if (
    normTarget.includes("evitar") ||
    normTarget.includes("rebaixamento") ||
    normTarget.includes("permanen")
  ) {
    const isSafePosition =
      userRow.zone !== "relegation" &&
      (normalizedTable.length === 1 || userRow.position < normalizedTable.length);
    if (!isSafePosition) return false;
    if (!enforceCompletionOrClinch || isSeasonFinished) return true;
    const topRelegationRow = normalizedTable.find(
      (r) => r.zone === "relegation",
    );
    return isMathematicallyAhead(userRow, topRelegationRow, totalRounds);
  }

  // 4. Meio da Tabela
  if (normTarget.includes("meio")) {
    const isRelegation = userRow.zone === "relegation";
    if (isRelegation) return false;
    if (enforceCompletionOrClinch && !isSeasonFinished) return false;
    const maxMidTablePos = Math.ceil(normalizedTable.length * 0.65);
    return userRow.position <= maxMidTablePos;
  }

  // 5. Playoffs de Promoção / Acesso
  if (
    normTarget.includes("playoff") ||
    normTarget.includes("acesso") ||
    normTarget.includes("promoc")
  ) {
    if (!isPromotionZone(userRow.zone)) return false;
    if (!enforceCompletionOrClinch || isSeasonFinished) return true;
    const firstOutsideRow = normalizedTable.find(
      (r) => !isPromotionZone(r.zone),
    );
    return isMathematicallyAhead(userRow, firstOutsideRow, totalRounds);
  }

  return false;
};

const isTitleObjectiveText = (normalizedObjective: string): boolean =>
  normalizedObjective.includes("campe") ||
  normalizedObjective.includes("titulo") ||
  normalizedObjective.includes("vencer");

const resolveLeagueIsFirstDivision = (
  leagueName: string,
  seasonLeagues?: League[],
): boolean => {
  const norm = leagueName.trim().toLowerCase();
  const seasonMatch = seasonLeagues?.find(
    (l) => l.name.trim().toLowerCase() === norm,
  );
  if (seasonMatch?.isFirstDivision !== undefined) {
    return seasonMatch.isFirstDivision;
  }
  const catalogMatch = getAllLeaguesFlat().find(
    (l) => l.name.trim().toLowerCase() === norm,
  );
  return catalogMatch?.isFirstDivision ?? true;
};

const isObjectiveAchievedCategory = (bonus: TransferBonus): boolean =>
  bonus.bonusCategory
    ? bonus.bonusCategory === "Objetivo atingido"
    : bonus.category === "objective";

/**
 * Avalia um bônus de desempenho individual ou de conquista.
 */
export const evaluateBonus = (
  bonus: TransferBonus,
  playerId: string,
  players: Players[] = [],
  matches: Match[] = [],
  table: Array<TableRowData | TableTeamData> = [],
  userClubName?: string,
  seasonLeagues?: League[],
): EvaluatedBonusItem => {
  // Preservação estrita: se já foi pago, não regredir nem reverter
  if (bonus.status === "paid" || bonus.paid) {
    return {
      bonus,
      calculatedProgress: bonus.currentMetricProgress ?? bonus.metricTarget ?? 0,
      target: bonus.metricTarget ?? 0,
      isAchieved: true,
      isReadyToPay: false,
      status: "paid",
      evaluationDetail: "Bônus quitado previamente nesta temporada.",
    };
  }

  if (bonus.autoSettlementDisabled) {
    return {
      bonus,
      calculatedProgress: 0,
      target: 1,
      isAchieved: false,
      isReadyToPay: false,
      status: bonus.status || "pending",
      evaluationDetail: "Status mantido manualmente como pendente pelo usuário.",
    };
  }

  // Avaliação de meta de desempenho individual
  if (bonus.category === "performance" || bonus.metric) {
    const stats = calculatePlayerSeasonStats(playerId, matches, userClubName);
    const metric = bonus.metric || "goals";
    const target = bonus.metricTarget || 1;

    let progress = 0;
    if (metric === "matches") progress = stats.games;
    else if (metric === "goals") progress = stats.goals;
    else if (metric === "assists") progress = stats.assists;
    else if (metric === "cleanSheets") progress = stats.cleanSheets;

    const isAchieved = progress >= target;

    return {
      bonus: {
        ...bonus,
        currentMetricProgress: progress,
      },
      calculatedProgress: progress,
      target,
      isAchieved,
      isReadyToPay: isAchieved,
      status: isAchieved ? "pending" : (bonus.status || "pending"),
      evaluationDetail: `${progress} / ${target} ${metric}`,
    };
  }

  // Avaliação de Conquista / Prêmio
  const objective = bonus.bonusTarget || bonus.targetObjective || bonus.name || "";
  const objectiveNorm = normalizeStageName(objective);
  const targetLeague = bonus.targetLeague?.trim();

  let isAchieved = false;
  let detail = "Pendente de atingimento";

  // Avaliação orientada pela liga selecionada no bônus de "Objetivo atingido"
  if (targetLeague && isObjectiveAchievedCategory(bonus)) {
    const normTargetLeague = targetLeague.toLowerCase();
    const leagueMatches = (matches || []).filter(
      (m) => m.league?.trim().toLowerCase() === normTargetLeague,
    );
    const isStandingsLeague = contributesToLeagueStandings(
      targetLeague,
      seasonLeagues,
    );
    const isReceivableFromPartner =
      bonus.direction === "receivable" && Boolean(bonus.partnerClub?.trim());
    const evaluationClubName = isReceivableFromPartner
      ? bonus.partnerClub!.trim()
      : userClubName;

    if (isStandingsLeague) {
      const seasonStandingsLeagues = (seasonLeagues || []).filter(
        (l) => l.league === true || contributesToLeagueStandings(l.name),
      );
      const tableMatchesTargetLeague =
        seasonStandingsLeagues.length === 0 ||
        seasonStandingsLeagues.some(
          (l) => l.name.trim().toLowerCase() === normTargetLeague,
        );

      if (tableMatchesTargetLeague) {
        const isFirstDivision = resolveLeagueIsFirstDivision(
          targetLeague,
          seasonLeagues,
        );
        isAchieved = checkLeagueTableObjective(
          objective,
          table,
          evaluationClubName,
          { isFirstDivision, enforceCompletionOrClinch: true },
        );
      }

      detail = isAchieved
        ? `Objetivo "${objective}" atingido na tabela de ${targetLeague}!`
        : `Objetivo "${objective}" ainda pendente em ${targetLeague}.`;
    } else {
      const isTitleObj = isTitleObjectiveText(objectiveNorm);
      const stageWeight = getStageWeight(objective);

      if (isReceivableFromPartner) {
        const normPartner = bonus.partnerClub!.trim().toLowerCase();
        const partnerMatches = leagueMatches.filter(
          (m) =>
            m.homeTeam?.trim().toLowerCase() === normPartner ||
            m.awayTeam?.trim().toLowerCase() === normPartner,
        );

        if (isTitleObj) {
          isAchieved = checkPartnerClubCupTitleWon(
            partnerMatches,
            bonus.partnerClub!.trim(),
          );
        } else if (stageWeight > 0) {
          isAchieved = checkCupStageReached(objective, partnerMatches);
        }
      } else {
        if (isTitleObj) {
          isAchieved = checkCupTitleWon(leagueMatches, userClubName);
        } else if (stageWeight > 0) {
          isAchieved = checkCupStageReached(objective, leagueMatches);
        }
      }

      detail = isAchieved
        ? `Objetivo "${objective}" atingido em ${targetLeague}!`
        : `Objetivo "${objective}" ainda pendente em ${targetLeague}.`;
    }

    return {
      bonus,
      calculatedProgress: isAchieved ? 1 : 0,
      target: 1,
      isAchieved,
      isReadyToPay: isAchieved,
      status: isAchieved ? "pending" : (bonus.status || "pending"),
      evaluationDetail: detail,
    };
  }

  // Verificar Artilheiro ou Líder em Assistências
  if (
    objectiveNorm.includes("artilheiro") ||
    objectiveNorm.includes("top scorer") ||
    objectiveNorm.includes("lider em assistencias")
  ) {
    const leaders = calculateSeasonLeaders(players, matches, userClubName);
    if (
      objectiveNorm.includes("artilheiro") ||
      objectiveNorm.includes("top scorer")
    ) {
      isAchieved = leaders.topScorerPlayerIds.includes(playerId);
      detail = isAchieved
        ? `Artilheiro da temporada com ${leaders.maxGoals} gols!`
        : `Liderança atual: ${leaders.maxGoals} gols.`;
    } else {
      isAchieved = leaders.topAssistPlayerIds.includes(playerId);
      detail = isAchieved
        ? `Líder em assistências com ${leaders.maxAssists} passes!`
        : `Liderança atual: ${leaders.maxAssists} assistências.`;
    }
  } else if (
    objectiveNorm.includes("campeao da copa") ||
    objectiveNorm.includes("vencer o torneio") ||
    objectiveNorm.includes("vencer copa") ||
    objectiveNorm.includes("titulo da copa")
  ) {
    isAchieved = checkCupTitleWon(matches, userClubName);
    detail = isAchieved ? "Título de copa conquistado na Final!" : "Copa em disputa.";
  } else if (getStageWeight(objective) > 0) {
    isAchieved = checkCupStageReached(objective, matches);
    detail = isAchieved
      ? `Fase "${objective}" alcançada com sucesso!`
      : `Meta de fase pendente: ${objective}.`;
  } else {
    // Avaliação na tabela de liga
    isAchieved = checkLeagueTableObjective(objective, table, userClubName);
    detail = isAchieved
      ? `Objetivo de liga "${objective}" atingido na classificação!`
      : `Classificação atual não atinge "${objective}".`;
  }

  return {
    bonus,
    calculatedProgress: isAchieved ? 1 : 0,
    target: 1,
    isAchieved,
    isReadyToPay: isAchieved,
    status: isAchieved ? "pending" : (bonus.status || "pending"),
    evaluationDetail: detail,
  };
};

/**
 * Identifica todos os bônus pendentes de "Objetivo atingido" (com liga vinculada)
 * cujo objetivo já foi cumprido na liga selecionada via partidas ou tabela.
 */
export const findAchievedObjectiveBonusesToSettle = (
  career?: Pick<Career, "clubName">,
  season?: Pick<ClubData, "players" | "matches" | "table" | "leagues">,
): AchievedObjectiveBonusCandidate[] => {
  if (!career || !season || !Array.isArray(season.players)) {
    return [];
  }

  const matches = season.matches || [];
  const table = (season.table as unknown as Array<TableRowData | TableTeamData>) || [];
  const leagues = season.leagues;
  const candidates: AchievedObjectiveBonusCandidate[] = [];

  for (const player of season.players) {
    const seenBonusIds = new Set<string>();

    const evaluateAndCollect = (
      bonus: TransferBonus,
      contractIndex: number | undefined,
      isContractDetailsBonus: boolean,
    ) => {
      if (!bonus?.id || seenBonusIds.has(bonus.id)) return;
      seenBonusIds.add(bonus.id);

      if (!isObjectiveAchievedCategory(bonus)) return;
      if (!bonus.targetLeague?.trim()) return;
      if (bonus.status === "paid" || bonus.paid) return;
      if (bonus.autoSettlementDisabled) return;

      const evaluation = evaluateBonus(
        bonus,
        player.id,
        season.players,
        matches,
        table,
        career.clubName,
        leagues,
      );

      if (evaluation.isReadyToPay) {
        candidates.push({
          playerId: player.id,
          playerName: player.name,
          contractIndex,
          isContractDetailsBonus,
          bonus,
          evaluation,
        });
      }
    };

    const contracts = player.contract || [];
    contracts.forEach((contract, contractIndex) => {
      (contract.bonuses || []).forEach((bonus) => {
        evaluateAndCollect(bonus, contractIndex, false);
      });
      (contract.contractDetails?.performanceBonuses || []).forEach((bonus) => {
        evaluateAndCollect(bonus, contractIndex, false);
      });
    });

    (player.contractDetails?.performanceBonuses || []).forEach((bonus) => {
      evaluateAndCollect(bonus, undefined, true);
    });
  }

  return candidates;
};

/**
 * Avalia o reajuste salarial automático (5% a 25%) acordado em contrato.
 */
export const evaluateWageAdjustment = (
  contractDetails?: ContractDetails,
  table: Array<TableRowData | TableTeamData> = [],
  matches: Match[] = [],
  userClubName?: string,
  seasonLeagues?: League[],
): WageAdjustmentEvaluation => {
  if (!contractDetails?.wageAdjustment?.enabled) {
    return {
      enabled: false,
      applied: false,
      outcome: "pending",
      originalWage: contractDetails?.weeklyWage || 0,
      adjustedWage: contractDetails?.weeklyWage || 0,
      percentage: 0,
      reason: "Sem cláusula de reajuste salarial automático.",
    };
  }

  const { percentage, competitionBasis, targetObjective, targetLeague } =
    contractDetails.wageAdjustment;
  const originalWage = contractDetails.weeklyWage || 0;

  const normalizedTarget = (targetObjective || "").trim().toLowerCase();

  let filteredMatches = matches;
  let filteredTable: Array<TableRowData | TableTeamData> = table;

  if (targetLeague) {
    const normTargetLeague = targetLeague.trim().toLowerCase();
    filteredMatches = (matches || []).filter(
      (m) => m.league?.trim().toLowerCase() === normTargetLeague,
    );
    const hasRowWithLeague = (table || []).some(
      (t) => Boolean((t as { league?: string }).league),
    );
    if (hasRowWithLeague) {
      filteredTable = (table || []).filter(
        (t) =>
          (t as { league?: string }).league?.trim().toLowerCase() ===
          normTargetLeague,
      );
    } else if (seasonLeagues && seasonLeagues.length > 0) {
      const isTargetInSeason = seasonLeagues.some(
        (l) => l.name.trim().toLowerCase() === normTargetLeague,
      );
      if (!isTargetInSeason) {
        filteredTable = [];
      }
    }
  }


  let achieved = false;

  const isCupEvaluation =
    competitionBasis === "cup" ||
    (Boolean(targetLeague) &&
      !contributesToLeagueStandings(targetLeague, seasonLeagues)) ||
    (Boolean(targetLeague) &&
      (normalizedTarget.includes("final") ||
        normalizedTarget.includes("semi") ||
        normalizedTarget.includes("oitavas") ||
        normalizedTarget.includes("quartas") ||
        normalizedTarget.includes("fase")));

  if (isCupEvaluation) {
    if (
      normalizedTarget.includes("campe") ||
      normalizedTarget.includes("titulo")
    ) {
      achieved = checkCupTitleWon(filteredMatches, userClubName);
    } else {
      achieved = checkCupStageReached(targetObjective, filteredMatches);
    }
  } else {
    achieved = checkLeagueTableObjective(
      targetObjective,
      filteredTable,
      userClubName,
      { enforceCompletionOrClinch: true },
    );
  }

  if (achieved) {
    const increase = Math.round(originalWage * (percentage / 100));
    return {
      enabled: true,
      applied: true,
      outcome: "increased",
      originalWage,
      adjustedWage: originalWage + increase,
      percentage,
      reason: `Meta esportiva "${targetObjective}" batida! Reajuste salarial de +${percentage}%.`,
    };
  } else {
    // Se a temporada possui jogos ou tabela definida e a meta não foi alcançada
    const hasData =
      (filteredMatches && filteredMatches.length > 0) ||
      (filteredTable && filteredTable.length > 0);
    if (!hasData) {
      return {
        enabled: true,
        applied: false,
        outcome: "pending",
        originalWage,
        adjustedWage: originalWage,
        percentage,
        reason: "Temporada em andamento.",
      };
    }

    const decrease = Math.round(originalWage * (percentage / 100));
    return {
      enabled: true,
      applied: true,
      outcome: "decreased",
      originalWage,
      adjustedWage: Math.max(0, originalWage - decrease),
      percentage,
      reason: `Meta esportiva "${targetObjective}" não atingida. Redução salarial de -${percentage}%.`,
    };
  }
};

export interface AchievedWageAdjustmentCandidate {
  playerId: string;
  contractIndex: number;
  playerName: string;
  targetObjective: string;
  targetLeague?: string;
  direction?: "Aumentar" | "Diminuir";
  percentage: number;
}

export const findAchievedWageAdjustmentsToApply = (
  career: Career,
  season: ClubData,
): AchievedWageAdjustmentCandidate[] => {
  const candidates: AchievedWageAdjustmentCandidate[] = [];
  const table = (season.table || []) as TableRowData[];
  const matches = (season.matches || []) as Match[];
  const userClubName = career.clubName;

  (season.players || []).forEach((player) => {
    (player.contract || []).forEach((contract, contractIndex) => {
      const wageAdj =
        contract.contractClauses?.wageAdjustment ||
        contract.contractDetails?.wageAdjustment;

      if (!wageAdj) return;
      if (wageAdj.autoSettlementDisabled) return;
      if (
        wageAdj.applied ||
        wageAdj.status === "applied" ||
        wageAdj.status === "paid"
      ) {
        return;
      }

      const evalResult = evaluateWageAdjustment(
        {
          weeklyWage: Number(contract.salary || player.salary || 0),
          durationYears: contract.contractTime || 1,
          wageAdjustment: {
            ...wageAdj,
            enabled: true,
          },
        },
        table,
        matches,
        userClubName,
        season?.leagues,
      );

      if (
        (wageAdj.direction === "Diminuir" && evalResult.outcome === "decreased") ||
        (wageAdj.direction !== "Diminuir" && evalResult.outcome === "increased")
      ) {
        candidates.push({
          playerId: player.id,
          contractIndex,
          playerName: player.name,
          targetObjective: wageAdj.targetObjective,
          targetLeague: wageAdj.targetLeague,
          direction: wageAdj.direction,
          percentage: wageAdj.percentage,
        });
      }
    });
  });

  return candidates;
};
