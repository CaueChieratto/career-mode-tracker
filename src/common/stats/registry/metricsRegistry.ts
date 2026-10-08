import {
  MetricDefinition,
  MetricScreen,
  MetricCategoryName,
} from "../types/metric.types";

/**
 * ============================================================================
 * CATÁLOGO CENTRAL DE MÉTRICAS E ESTATÍSTICAS (Single Source of Truth)
 * ============================================================================
 *
 * Para desativar uma métrica de TODAS as telas (BestPlayers, ComparePlayers, Curiosities):
 *    Altere `enabled: false` na métrica desejada.
 *
 * Para ativar/desativar em apenas UMA tela específica:
 *    Ajuste as flags do objeto `screens`:
 *    screens: {
 *      bestPlayers: false,    // Oculta no ranking de Melhores Jogadores
 *      comparePlayers: true,  // Exibe na Comparação de Jogadores
 *      curiosities: false,    // Oculta rankings do grupo em Curiosidades
 *      playerDetailed: true,  // Exibe no perfil detalhado do jogador
 *    }
 *
 * Para adicionar uma métrica COMPLETAMENTE NOVA:
 *    Basta criar uma nova entrada neste registro. Ela aparecerá automaticamente
 *    nas telas habilitadas em `screens`!
 */
export const METRICS_REGISTRY: Record<string, MetricDefinition> = {
  // --------------------------------------------------------------------------
  // CATEGORIA: JOGADOR (Metadados bio / perfil)
  // --------------------------------------------------------------------------
  age: {
    id: "age",
    category: "Jogador",
    labels: { default: "Idade", comparePlayers: "Idade" },
    getValue: (s) => s.age ?? (s.player?.age ? `${s.player.age} anos` : "-"),
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: false },
    group: "bio",
    order: { comparePlayers: 1 },
  },
  position: {
    id: "position",
    category: "Jogador",
    labels: { default: "Posição", comparePlayers: "Posição" },
    getValue: (s) => s.position ?? s.player?.position ?? "-",
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: false },
    group: "bio",
    order: { comparePlayers: 2 },
  },
  marketValue: {
    id: "marketValue",
    category: "Jogador",
    labels: { default: "Valor de mercado", comparePlayers: "Valor de mercado" },
    getValue: (s) => s.marketValue ?? "-",
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: false },
    group: "bio",
    order: { comparePlayers: 3 },
  },
  salary: {
    id: "salary",
    category: "Jogador",
    labels: { default: "Salário semanal", comparePlayers: "Salário semanal" },
    getValue: (s) => s.salary ?? "-",
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: false },
    group: "bio",
    order: { comparePlayers: 4 },
  },
  seasonsAtClub: {
    id: "seasonsAtClub",
    category: "Jogador",
    labels: { default: "Temporadas no clube", comparePlayers: "Temporadas no clube" },
    getValue: (s) => s.seasonsAtClub,
    onlyCompareMode: "total",
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: false },
    group: "bio",
    order: { comparePlayers: 5 },
  },

  // --------------------------------------------------------------------------
  // CATEGORIA: GERAL
  // --------------------------------------------------------------------------
  games: {
    id: "games",
    category: "Geral",
    labels: {
      default: "Partidas",
      bestPlayers: "Jogos",
      comparePlayers: "Partidas",
      playerDetailed: "Jogos",
    },
    getValue: (s) => s.games,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "general",
    order: { bestPlayers: 1, comparePlayers: 1 },
  },
  avgRating: {
    id: "avgRating",
    category: "Geral",
    labels: {
      default: "Nota Média",
      bestPlayers: "Médias das notas",
      comparePlayers: "Nota Média",
      playerDetailed: "Médias das notas",
    },
    isRating: true,
    getValue: (s) => (s.avgRating > 0 ? s.avgRating : 0),
    format: (v) => (Number(v) > 0 ? Number(v).toFixed(2) : "-"),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "general",
    order: { bestPlayers: 2, comparePlayers: 2 },
  },
  goals: {
    id: "goals",
    category: "Geral",
    labels: {
      default: "Gols",
      bestPlayers: "Gols",
      comparePlayers: "Gols",
      playerDetailed: "Gols",
    },
    getValue: (s) => s.goals,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, curiosities: true, matchStatsCard: true },
    group: "goals",
    order: { bestPlayers: 3, comparePlayers: 3 },
  },
  goalsPerGame: {
    id: "goalsPerGame",
    category: "Geral",
    labels: {
      default: "Gols por partida",
      bestPlayers: "Gols por jogo",
      comparePlayers: "Gols por jogo",
      playerDetailed: "Gols por jogo",
    },
    getValue: (s) => s.goalsPerGame,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "goals",
    order: { bestPlayers: 4, comparePlayers: 4 },
  },
  goalsPer90: {
    id: "goalsPer90",
    category: "Geral",
    labels: {
      default: "Gols por 90 minutos",
      bestPlayers: "Gols por 90 min",
      comparePlayers: "Gols por 90 minutos",
      playerDetailed: "Gols por 90 minutos",
    },
    getValue: (s) => s.goalsPer90,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "goals",
    order: { bestPlayers: 5, comparePlayers: 5 },
  },
  assists: {
    id: "assists",
    category: "Geral",
    labels: {
      default: "Assistências",
      bestPlayers: "Assistências",
      comparePlayers: "Assistências",
      playerDetailed: "Assistências",
    },
    getValue: (s) => s.assists,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, curiosities: true, matchStatsCard: true },
    group: "assists",
    order: { bestPlayers: 6, comparePlayers: 6 },
  },
  assistsPerGame: {
    id: "assistsPerGame",
    category: "Geral",
    labels: {
      default: "Assistências por partida",
      bestPlayers: "Assistências por jogo",
      comparePlayers: "Assistências por jogo",
      playerDetailed: "Assistências por jogo",
    },
    getValue: (s) => s.assistsPerGame,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "assists",
    order: { bestPlayers: 7, comparePlayers: 7 },
  },
  assistsPer90: {
    id: "assistsPer90",
    category: "Geral",
    labels: {
      default: "Assistências por 90 minutos",
      bestPlayers: "Assistências por 90 min",
      comparePlayers: "Assistências por 90 minutos",
      playerDetailed: "Assistências por 90 minutos",
    },
    getValue: (s) => s.assistsPer90,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "assists",
    order: { bestPlayers: 8, comparePlayers: 8 },
  },
  goalParticipations: {
    id: "goalParticipations",
    category: "Geral",
    labels: {
      default: "Participação em gols (G/A)",
      bestPlayers: "G/A (Gols + Assists)",
      comparePlayers: "Participação em gols (G/A)",
      playerDetailed: "Participação em gols (G/A)",
    },
    getValue: (s) => s.goalParticipations,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "goals",
    order: { bestPlayers: 9, comparePlayers: 9 },
  },
  goalParticipationsPerGame: {
    id: "goalParticipationsPerGame",
    category: "Geral",
    labels: {
      default: "Participação em gols por partida (G/A)",
      bestPlayers: "G/A por jogo",
      comparePlayers: "Participação em gols por jogo (G/A)",
      playerDetailed: "Participação em gols por jogo (G/A)",
    },
    getValue: (s) => s.goalParticipationsPerGame,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "goals",
    order: { bestPlayers: 10, comparePlayers: 10 },
  },
  goalParticipationsPer90: {
    id: "goalParticipationsPer90",
    category: "Geral",
    labels: {
      default: "Participação em gols por 90 minutos (G/A)",
      bestPlayers: "G/A por 90 min",
      comparePlayers: "Participação em gols por 90 min (G/A)",
      playerDetailed: "Participação em gols por 90 min (G/A)",
    },
    getValue: (s) => s.goalParticipationsPer90,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "goals",
    order: { bestPlayers: 11, comparePlayers: 11 },
  },
  defenses: {
    id: "defenses",
    category: "Geral",
    labels: {
      default: "Defesas (GOL)",
      bestPlayers: "Defesas (GOL)",
      comparePlayers: "Defesas (GOL)",
      playerDetailed: "Defesas (GOL)",
    },
    getValue: (s) => s.defenses,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "defense",
    order: { comparePlayers: 12 },
  },
  defensesPerGame: {
    id: "defensesPerGame",
    category: "Geral",
    labels: {
      default: "Defesas por partida",
      comparePlayers: "Defesas por jogo",
      playerDetailed: "Defesas por jogo",
    },
    getValue: (s) => s.defensesPerGame,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: true },
    group: "defense",
    order: { comparePlayers: 13 },
  },
  defensesPer90: {
    id: "defensesPer90",
    category: "Geral",
    labels: {
      default: "Defesas por 90 minutos",
      comparePlayers: "Defesas por 90 minutos",
      playerDetailed: "Defesas por 90 minutos",
    },
    getValue: (s) => s.defensesPer90,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: true },
    group: "defense",
    order: { comparePlayers: 14 },
  },

  // --------------------------------------------------------------------------
  // CATEGORIA: ATAQUE
  // --------------------------------------------------------------------------
  goalFrequency: {
    id: "goalFrequency",
    category: "Ataque",
    labels: {
      default: "Gols por minutos",
      bestPlayers: "Minutos por gol",
      comparePlayers: "Gols por minutos",
      playerDetailed: "Gols por minutos",
    },
    isAscending: true,
    getValue: (s) => s.goalFrequency,
    format: (v) => (Number(v) > 0 ? `${Math.round(Number(v))}'` : "-"),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "goals",
    order: { bestPlayers: 13, comparePlayers: 1 },
  },
  assistFrequency: {
    id: "assistFrequency",
    category: "Ataque",
    labels: {
      default: "Assistências por minutos",
      bestPlayers: "Minutos por assistência",
      comparePlayers: "Assistências por minutos",
      playerDetailed: "Assistências por minutos",
    },
    isAscending: true,
    getValue: (s) => s.assistFrequency,
    format: (v) => (Number(v) > 0 ? `${Math.round(Number(v))}'` : "-"),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "assists",
    order: { bestPlayers: 14, comparePlayers: 2 },
  },
  participationFrequency: {
    id: "participationFrequency",
    category: "Ataque",
    labels: {
      default: "G/A por minutos",
      bestPlayers: "Minutos por G/A",
      comparePlayers: "G/A por minutos",
      playerDetailed: "G/A por minutos",
    },
    isAscending: true,
    getValue: (s) => s.participationFrequency,
    format: (v) => (Number(v) > 0 ? `${Math.round(Number(v))}'` : "-"),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "goals",
    order: { bestPlayers: 15, comparePlayers: 3 },
  },
  totalFinishings: {
    id: "totalFinishings",
    category: "Ataque",
    labels: {
      default: "Finalizações",
      bestPlayers: "Finalizações",
      comparePlayers: "Finalizações",
      playerDetailed: "Finalizações",
    },
    getValue: (s) => s.totalFinishings,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "finishing",
    order: { bestPlayers: 16, comparePlayers: 4 },
  },
  finishingsPerGame: {
    id: "finishingsPerGame",
    category: "Ataque",
    labels: {
      default: "Finalizações por partida",
      bestPlayers: "Finalizações por jogo",
      comparePlayers: "Finalizações por jogo",
      playerDetailed: "Finalizações por jogo",
    },
    getValue: (s) => s.finishingsPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "finishing",
    order: { bestPlayers: 17, comparePlayers: 5 },
  },
  finishingsPer90: {
    id: "finishingsPer90",
    category: "Ataque",
    labels: {
      default: "Finalizações por 90 minutos",
      bestPlayers: "Finalizações por 90 min",
      comparePlayers: "Finalizações por 90 minutos",
      playerDetailed: "Finalizações por 90 minutos",
    },
    getValue: (s) => s.finishingsPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "finishing",
    order: { bestPlayers: 18, comparePlayers: 6 },
  },
  finishingsOnTarget: {
    id: "finishingsOnTarget",
    category: "Ataque",
    labels: {
      default: "Finalizações certas",
      bestPlayers: "Finalizações certas",
      comparePlayers: "Finalizações certas",
      playerDetailed: "Finalizações certas",
    },
    getValue: (s) => s.finishingsOnTarget,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "finishing",
    order: { bestPlayers: 19, comparePlayers: 7 },
  },
  finishingsOnTargetPerGame: {
    id: "finishingsOnTargetPerGame",
    category: "Ataque",
    labels: {
      default: "Finalizações certas por partida",
      bestPlayers: "Chutes certos por jogo",
      comparePlayers: "Finalizações certas por jogo",
      playerDetailed: "Finalizações certas por jogo",
    },
    getValue: (s) => s.finishingsOnTargetPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "finishing",
    order: { bestPlayers: 20, comparePlayers: 8 },
  },
  finishingsOnTargetPer90: {
    id: "finishingsOnTargetPer90",
    category: "Ataque",
    labels: {
      default: "Finalizações certas por 90 minutos",
      bestPlayers: "Chutes certos por 90 min",
      comparePlayers: "Finalizações certas por 90 minutos",
      playerDetailed: "Finalizações certas por 90 minutos",
    },
    getValue: (s) => s.finishingsOnTargetPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "finishing",
    order: { bestPlayers: 21, comparePlayers: 9 },
  },
  finishingsMissed: {
    id: "finishingsMissed",
    category: "Ataque",
    labels: {
      default: "Finalizações erradas",
      bestPlayers: "Finalizações erradas",
      comparePlayers: "Finalizações erradas",
      playerDetailed: "Finalizações erradas",
    },
    getValue: (s) => s.finishingsMissed,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "finishing",
    order: { bestPlayers: 22, comparePlayers: 10 },
  },
  finishingsMissedPerGame: {
    id: "finishingsMissedPerGame",
    category: "Ataque",
    labels: {
      default: "Finalizações erradas por partida",
      bestPlayers: "Chutes errados por jogo",
      comparePlayers: "Finalizações erradas por jogo",
      playerDetailed: "Finalizações erradas por jogo",
    },
    getValue: (s) => s.finishingsMissedPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "finishing",
    order: { bestPlayers: 23, comparePlayers: 11 },
  },
  finishingsMissedPer90: {
    id: "finishingsMissedPer90",
    category: "Ataque",
    labels: {
      default: "Finalizações erradas por 90 minutos",
      bestPlayers: "Chutes errados por 90 min",
      comparePlayers: "Finalizações erradas por 90 minutos",
      playerDetailed: "Finalizações erradas por 90 minutos",
    },
    getValue: (s) => s.finishingsMissedPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "finishing",
    order: { bestPlayers: 24, comparePlayers: 12 },
  },

  // --------------------------------------------------------------------------
  // CATEGORIA: DISTRIBUIÇÃO
  // --------------------------------------------------------------------------
  totalPasses: {
    id: "totalPasses",
    category: "Distribuição",
    labels: {
      default: "Passes",
      bestPlayers: "Passes",
      comparePlayers: "Passes",
      playerDetailed: "Passes",
    },
    getValue: (s) => s.totalPasses,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "distribution",
    order: { bestPlayers: 25, comparePlayers: 1 },
  },
  passesPerGame: {
    id: "passesPerGame",
    category: "Distribuição",
    labels: {
      default: "Passes por partida",
      bestPlayers: "Passes por jogo",
      comparePlayers: "Passes por jogo",
      playerDetailed: "Passes por jogo",
    },
    getValue: (s) => s.passesPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 26, comparePlayers: 2 },
  },
  passesPer90: {
    id: "passesPer90",
    category: "Distribuição",
    labels: {
      default: "Passes por 90 minutos",
      bestPlayers: "Passes por 90 min",
      comparePlayers: "Passes por 90 minutos",
      playerDetailed: "Passes por 90 minutos",
    },
    getValue: (s) => s.passesPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 27, comparePlayers: 3 },
  },
  passesCompleted: {
    id: "passesCompleted",
    category: "Distribuição",
    labels: {
      default: "Passes certos",
      bestPlayers: "Passes certos",
      comparePlayers: "Passes certos",
      playerDetailed: "Passes certos",
    },
    getValue: (s) => s.passesCompleted,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "distribution",
    order: { bestPlayers: 28, comparePlayers: 4 },
  },
  passesCompletedPerGame: {
    id: "passesCompletedPerGame",
    category: "Distribuição",
    labels: {
      default: "Passes certos por partida",
      bestPlayers: "Passes certos por jogo",
      comparePlayers: "Passes certos por jogo",
      playerDetailed: "Passes certos por jogo",
    },
    getValue: (s) => s.passesCompletedPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 29, comparePlayers: 5 },
  },
  passesCompletedPer90: {
    id: "passesCompletedPer90",
    category: "Distribuição",
    labels: {
      default: "Passes certos por 90 minutos",
      bestPlayers: "Passes certos por 90 min",
      comparePlayers: "Passes certos por 90 minutos",
      playerDetailed: "Passes certos por 90 minutos",
    },
    getValue: (s) => s.passesCompletedPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 30, comparePlayers: 6 },
  },
  passesMissed: {
    id: "passesMissed",
    category: "Distribuição",
    labels: {
      default: "Passes errados",
      bestPlayers: "Passes errados",
      comparePlayers: "Passes errados",
      playerDetailed: "Passes errados",
    },
    getValue: (s) => s.passesMissed,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "distribution",
    order: { bestPlayers: 31, comparePlayers: 7 },
  },
  passesMissedPerGame: {
    id: "passesMissedPerGame",
    category: "Distribuição",
    labels: {
      default: "Passes errados por partida",
      bestPlayers: "Passes errados por jogo",
      comparePlayers: "Passes errados por jogo",
      playerDetailed: "Passes errados por jogo",
    },
    getValue: (s) => s.passesMissedPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 32, comparePlayers: 8 },
  },
  passesMissedPer90: {
    id: "passesMissedPer90",
    category: "Distribuição",
    labels: {
      default: "Passes errados por 90 minutos",
      bestPlayers: "Passes errados por 90 min",
      comparePlayers: "Passes errados por 90 minutos",
      playerDetailed: "Passes errados por 90 minutos",
    },
    getValue: (s) => s.passesMissedPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 33, comparePlayers: 9 },
  },
  keyPasses: {
    id: "keyPasses",
    category: "Distribuição",
    labels: {
      default: "Passes decisivos",
      bestPlayers: "Passes decisivos",
      comparePlayers: "Passes decisivos",
      playerDetailed: "Passes decisivos",
    },
    getValue: (s) => s.keyPasses,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "distribution",
    order: { bestPlayers: 34, comparePlayers: 10 },
  },
  keyPassesPerGame: {
    id: "keyPassesPerGame",
    category: "Distribuição",
    labels: {
      default: "Passes decisivos por partida",
      bestPlayers: "Passes decisivos por jogo",
      comparePlayers: "Passes decisivos por jogo",
      playerDetailed: "Passes decisivos por jogo",
    },
    getValue: (s) => s.keyPassesPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 35, comparePlayers: 11 },
  },
  keyPassesPer90: {
    id: "keyPassesPer90",
    category: "Distribuição",
    labels: {
      default: "Passes decisivos por 90 minutos",
      bestPlayers: "Passes decisivos por 90 min",
      comparePlayers: "Passes decisivos por 90 minutos",
      playerDetailed: "Passes decisivos por 90 minutos",
    },
    getValue: (s) => s.keyPassesPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 36, comparePlayers: 12 },
  },
  totalDribbles: {
    id: "totalDribbles",
    category: "Distribuição",
    labels: {
      default: "Conduções",
      bestPlayers: "Conduções",
      comparePlayers: "Conduções",
      playerDetailed: "Conduções",
    },
    getValue: (s) => s.totalDribbles,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 37, comparePlayers: 13 },
  },
  dribblesPerGame: {
    id: "dribblesPerGame",
    category: "Distribuição",
    labels: {
      default: "Conduções por partida",
      bestPlayers: "Conduções por jogo",
      comparePlayers: "Conduções por jogo",
      playerDetailed: "Conduções por jogo",
    },
    getValue: (s) => s.dribblesPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 38, comparePlayers: 14 },
  },
  dribblesPer90: {
    id: "dribblesPer90",
    category: "Distribuição",
    labels: {
      default: "Conduções por 90 minutos",
      bestPlayers: "Conduções por 90 min",
      comparePlayers: "Conduções por 90 minutos",
      playerDetailed: "Conduções por 90 minutos",
    },
    getValue: (s) => s.dribblesPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 39, comparePlayers: 15 },
  },
  dribblesCompleted: {
    id: "dribblesCompleted",
    category: "Distribuição",
    labels: {
      default: "Conduções certas",
      bestPlayers: "Conduções certas",
      comparePlayers: "Conduções certas",
      playerDetailed: "Conduções certas",
    },
    getValue: (s) => s.dribblesCompleted,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: false },
    group: "distribution",
    order: { comparePlayers: 16 },
  },
  dribblesCompletedPerGame: {
    id: "dribblesCompletedPerGame",
    category: "Distribuição",
    labels: {
      default: "Conduções certas por partida",
      bestPlayers: "Conduções certas por jogo",
      comparePlayers: "Conduções certas por jogo",
      playerDetailed: "Conduções certas por jogo",
    },
    getValue: (s) => s.dribblesCompletedPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 40, comparePlayers: 17 },
  },
  dribblesCompletedPer90: {
    id: "dribblesCompletedPer90",
    category: "Distribuição",
    labels: {
      default: "Conduções certas por 90 minutos",
      bestPlayers: "Conduções certas por 90 min",
      comparePlayers: "Conduções certas por 90 minutos",
      playerDetailed: "Conduções certas por 90 minutos",
    },
    getValue: (s) => s.dribblesCompletedPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 41, comparePlayers: 18 },
  },
  dribblesMissed: {
    id: "dribblesMissed",
    category: "Distribuição",
    labels: {
      default: "Conduções erradas",
      bestPlayers: "Conduções erradas",
      comparePlayers: "Conduções erradas",
      playerDetailed: "Conduções erradas",
    },
    getValue: (s) => s.dribblesMissed,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: false, playerDetailed: false },
    group: "distribution",
    order: { comparePlayers: 19 },
  },
  dribblesMissedPerGame: {
    id: "dribblesMissedPerGame",
    category: "Distribuição",
    labels: {
      default: "Conduções erradas por partida",
      bestPlayers: "Conduções erradas por jogo",
      comparePlayers: "Conduções erradas por jogo",
      playerDetailed: "Conduções erradas por jogo",
    },
    getValue: (s) => s.dribblesMissedPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 42, comparePlayers: 20 },
  },
  dribblesMissedPer90: {
    id: "dribblesMissedPer90",
    category: "Distribuição",
    labels: {
      default: "Conduções erradas por 90 minutos",
      bestPlayers: "Conduções erradas por 90 min",
      comparePlayers: "Conduções erradas por 90 minutos",
      playerDetailed: "Conduções erradas por 90 minutos",
    },
    getValue: (s) => s.dribblesMissedPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distribution",
    order: { bestPlayers: 43, comparePlayers: 21 },
  },

  // --------------------------------------------------------------------------
  // CATEGORIA: DEFESA
  // --------------------------------------------------------------------------
  cleanSheets: {
    id: "cleanSheets",
    category: "Defesa",
    labels: {
      default: "Clean Sheets",
      bestPlayers: "Clean Sheets",
      comparePlayers: "Clean Sheets",
      playerDetailed: "Clean Sheets",
    },
    getValue: (s) => s.cleanSheets,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "defense",
    order: { comparePlayers: 1 },
  },
  cleanSheetsPerGame: {
    id: "cleanSheetsPerGame",
    category: "Defesa",
    labels: {
      default: "Clean Sheets por partida",
      comparePlayers: "Clean Sheets por jogo",
      playerDetailed: "Clean Sheets por jogo",
    },
    getValue: (s) => s.cleanSheetsPerGame,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: true },
    group: "defense",
    order: { comparePlayers: 2 },
  },
  ballsRecovered: {
    id: "ballsRecovered",
    category: "Defesa",
    labels: {
      default: "Bolas recuperadas",
      bestPlayers: "Bolas recuperadas",
      comparePlayers: "Bolas recuperadas",
      playerDetailed: "Bolas recuperadas",
    },
    getValue: (s) => s.ballsRecovered,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "defense",
    order: { bestPlayers: 44, comparePlayers: 3 },
  },
  ballsRecoveredPerGame: {
    id: "ballsRecoveredPerGame",
    category: "Defesa",
    labels: {
      default: "Bolas recuperadas por partida",
      bestPlayers: "Bolas recuperadas por jogo",
      comparePlayers: "Bolas recuperadas por jogo",
      playerDetailed: "Bolas recuperadas por jogo",
    },
    getValue: (s) => s.ballsRecoveredPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "defense",
    order: { bestPlayers: 45, comparePlayers: 4 },
  },
  ballsRecoveredPer90: {
    id: "ballsRecoveredPer90",
    category: "Defesa",
    labels: {
      default: "Bolas recuperadas por 90 minutos",
      bestPlayers: "Recuperações por 90 min",
      comparePlayers: "Bolas recuperadas por 90 minutos",
      playerDetailed: "Bolas recuperadas por 90 minutos",
    },
    getValue: (s) => s.ballsRecoveredPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "defense",
    order: { bestPlayers: 46, comparePlayers: 5 },
  },
  ballsLost: {
    id: "ballsLost",
    category: "Defesa",
    labels: {
      default: "Bolas perdidas",
      bestPlayers: "Bolas perdidas",
      comparePlayers: "Bolas perdidas",
      playerDetailed: "Bolas perdidas",
    },
    getValue: (s) => s.ballsLost,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "defense",
    order: { bestPlayers: 47, comparePlayers: 6 },
  },
  ballsLostPerGame: {
    id: "ballsLostPerGame",
    category: "Defesa",
    labels: {
      default: "Bolas perdidas por partida",
      bestPlayers: "Perdas de bola por jogo",
      comparePlayers: "Bolas perdidas por jogo",
      playerDetailed: "Bolas perdidas por jogo",
    },
    getValue: (s) => s.ballsLostPerGame,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "defense",
    order: { bestPlayers: 48, comparePlayers: 7 },
  },
  ballsLostPer90: {
    id: "ballsLostPer90",
    category: "Defesa",
    labels: {
      default: "Bolas perdidas por 90 minutos",
      bestPlayers: "Perdas de bola por 90 min",
      comparePlayers: "Bolas perdidas por 90 minutos",
      playerDetailed: "Bolas perdidas por 90 minutos",
    },
    getValue: (s) => s.ballsLostPer90,
    format: (v) => Number(v).toFixed(1),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "defense",
    order: { bestPlayers: 49, comparePlayers: 8 },
  },

  // --------------------------------------------------------------------------
  // CATEGORIA: DISCIPLINA & PRESENÇA
  // --------------------------------------------------------------------------
  minutesPlayed: {
    id: "minutesPlayed",
    category: "Disciplina & Presença",
    labels: {
      default: "Minutos jogados",
      bestPlayers: "Minutos jogados",
      comparePlayers: "Minutos jogados",
      playerDetailed: "Minutos jogados",
    },
    getValue: (s) => s.minutesPlayed,
    format: (v) => `${v}'`,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "general",
    order: { bestPlayers: 50, comparePlayers: 1 },
  },
  minutesPerGame: {
    id: "minutesPerGame",
    category: "Disciplina & Presença",
    labels: {
      default: "Minutos por jogo",
      bestPlayers: "Minutos por jogo",
      comparePlayers: "Minutos por jogo",
      playerDetailed: "Minutos por jogo",
    },
    getValue: (s) => s.minutesPerGame,
    format: (v) => (Number(v) > 0 ? `${Math.round(Number(v))}'` : "-"),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "general",
    order: { bestPlayers: 51, comparePlayers: 2 },
  },
  maxDistanceKmInGame: {
    id: "maxDistanceKmInGame",
    category: "Disciplina & Presença",
    labels: {
      default: "Maior distância em um jogo",
      bestPlayers: "Maior distância em um jogo",
      comparePlayers: "Maior distância em um jogo",
      playerDetailed: "Maior distância em um jogo",
    },
    getValue: (s) => s.maxDistanceKmInGame,
    format: (v) => `${Number(v).toFixed(1)}km`,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distance",
    order: { bestPlayers: 52, comparePlayers: 3 },
  },
  distanceKm: {
    id: "distanceKm",
    category: "Disciplina & Presença",
    labels: {
      default: "Distância total",
      bestPlayers: "Distância total",
      comparePlayers: "Distância total",
      playerDetailed: "Distância total",
    },
    getValue: (s) => s.distanceKm,
    format: (v) => `${Number(v).toFixed(1)}km`,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distance",
    order: { bestPlayers: 53, comparePlayers: 4 },
  },
  distanceKmPerGame: {
    id: "distanceKmPerGame",
    category: "Disciplina & Presença",
    labels: {
      default: "Distância por partida",
      bestPlayers: "Distância por jogo",
      comparePlayers: "Distância por jogo",
      playerDetailed: "Distância por jogo",
    },
    getValue: (s) => s.distanceKmPerGame,
    format: (v) => `${Number(v).toFixed(1)}km`,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distance",
    order: { bestPlayers: 54, comparePlayers: 5 },
  },
  distanceKmPer90: {
    id: "distanceKmPer90",
    category: "Disciplina & Presença",
    labels: {
      default: "Distância por 90 min",
      bestPlayers: "Distância por 90 min",
      comparePlayers: "Distância por 90 min",
      playerDetailed: "Distância por 90 min",
    },
    getValue: (s) => s.distanceKmPer90,
    format: (v) => `${Number(v).toFixed(1)}km`,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "distance",
    order: { bestPlayers: 55, comparePlayers: 6 },
  },
  yellowCards: {
    id: "yellowCards",
    category: "Disciplina & Presença",
    labels: {
      default: "Cartões amarelos",
      bestPlayers: "Cartões amarelos",
      comparePlayers: "Cartões amarelos",
      playerDetailed: "Cartões amarelos",
    },
    getValue: (s) => s.yellowCards,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "cards",
    order: { bestPlayers: 56, comparePlayers: 7 },
  },
  yellowCardsPerGame: {
    id: "yellowCardsPerGame",
    category: "Disciplina & Presença",
    labels: {
      default: "Cartões amarelos por partida",
      bestPlayers: "Amarelos por jogo",
      comparePlayers: "Cartões amarelos por jogo",
      playerDetailed: "Cartões amarelos por jogo",
    },
    getValue: (s) => s.yellowCardsPerGame,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "cards",
    order: { bestPlayers: 57, comparePlayers: 8 },
  },
  yellowCardsPer90: {
    id: "yellowCardsPer90",
    category: "Disciplina & Presença",
    labels: {
      default: "Cartões amarelos por 90 minutos",
      bestPlayers: "Amarelos por 90 min",
      comparePlayers: "Cartões amarelos por 90 minutos",
      playerDetailed: "Cartões amarelos por 90 minutos",
    },
    getValue: (s) => s.yellowCardsPer90,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "cards",
    order: { bestPlayers: 58, comparePlayers: 9 },
  },
  redCards: {
    id: "redCards",
    category: "Disciplina & Presença",
    labels: {
      default: "Cartões vermelhos",
      bestPlayers: "Cartões vermelhos",
      comparePlayers: "Cartões vermelhos",
      playerDetailed: "Cartões vermelhos",
    },
    getValue: (s) => s.redCards,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true, matchStatsCard: true },
    group: "cards",
    order: { bestPlayers: 59, comparePlayers: 10 },
  },
  redCardsPerGame: {
    id: "redCardsPerGame",
    category: "Disciplina & Presença",
    labels: {
      default: "Cartões vermelhos por partida",
      bestPlayers: "Vermelhos por jogo",
      comparePlayers: "Cartões vermelhos por jogo",
      playerDetailed: "Cartões vermelhos por jogo",
    },
    getValue: (s) => s.redCardsPerGame,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "cards",
    order: { bestPlayers: 60, comparePlayers: 11 },
  },
  redCardsPer90: {
    id: "redCardsPer90",
    category: "Disciplina & Presença",
    labels: {
      default: "Cartões vermelhos por 90 minutos",
      bestPlayers: "Vermelhos por 90 min",
      comparePlayers: "Cartões vermelhos por 90 minutos",
      playerDetailed: "Cartões vermelhos por 90 minutos",
    },
    getValue: (s) => s.redCardsPer90,
    format: (v) => Number(v).toFixed(2),
    enabled: true,
    screens: { bestPlayers: true, comparePlayers: true, playerDetailed: true },
    group: "cards",
    order: { bestPlayers: 61, comparePlayers: 12 },
  },
  ownGoals: {
    id: "ownGoals",
    category: "Disciplina & Presença",
    labels: {
      default: "Gols contra",
      bestPlayers: "Gols contra",
      comparePlayers: "Gols contra",
      playerDetailed: "Gols contra",
    },
    getValue: (s) => s.ownGoals,
    format: (v) => v,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: true, playerDetailed: true },
    group: "general",
    order: { comparePlayers: 13 },
  },

  // --------------------------------------------------------------------------
  // CATEGORIA: MÉTRICAS COLETIVAS DA EQUIPE (MatchStatsCard)
  // --------------------------------------------------------------------------
  wins: {
    id: "wins",
    category: "Geral",
    labels: { default: "Vitórias", matchStatsCard: "Vitórias" },
    getValue: () => undefined,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: false, matchStatsCard: true },
    group: "general",
  },
  draws: {
    id: "draws",
    category: "Geral",
    labels: { default: "Empates", matchStatsCard: "Empates" },
    getValue: () => undefined,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: false, matchStatsCard: true },
    group: "general",
  },
  losses: {
    id: "losses",
    category: "Geral",
    labels: { default: "Derrotas", matchStatsCard: "Derrotas" },
    getValue: () => undefined,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: false, matchStatsCard: true },
    group: "general",
  },
  xg: {
    id: "xg",
    category: "Ataque",
    labels: { default: "xG médio", matchStatsCard: "xG médio" },
    getValue: () => undefined,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: false, matchStatsCard: true },
    group: "finishing",
  },
  possession: {
    id: "possession",
    category: "Distribuição",
    labels: { default: "Posse de bola média", matchStatsCard: "Posse de bola média" },
    getValue: () => undefined,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: false, matchStatsCard: true },
    group: "distribution",
  },
  goalsConceded: {
    id: "goalsConceded",
    category: "Defesa",
    labels: { default: "Gols sofridos", matchStatsCard: "Gols sofridos" },
    getValue: () => undefined,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: false, matchStatsCard: true },
    group: "defense",
  },
  ballRecoveryTime: {
    id: "ballRecoveryTime",
    category: "Defesa",
    labels: { default: "Tempo de recuperação da bola", matchStatsCard: "Tempo médio para recuperar a bola" },
    getValue: () => undefined,
    enabled: true,
    screens: { bestPlayers: false, comparePlayers: false, matchStatsCard: true },
    group: "defense",
  },
};

/**
 * Retorna as métricas ativas para uma tela específica, ordenadas
 */
export const getMetricsForScreen = (screen: MetricScreen): MetricDefinition[] => {
  return Object.values(METRICS_REGISTRY)
    .filter((metric) => metric.enabled && metric.screens[screen] === true)
    .sort((a, b) => {
      const orderA = a.order?.[screen as "bestPlayers" | "comparePlayers"] ?? 999;
      const orderB = b.order?.[screen as "bestPlayers" | "comparePlayers"] ?? 999;
      return orderA - orderB;
    });
};

/**
 * Retorna métricas agrupadas por categoria para a tela de ComparePlayers
 */
export const getCategorizedMetricsForCompare = (
  compareMode: "season" | "total" | "none",
): Array<{ title: MetricCategoryName; stats: MetricDefinition[] }> => {
  const categoryOrder: MetricCategoryName[] = [
    "Jogador",
    "Geral",
    "Ataque",
    "Distribuição",
    "Defesa",
    "Disciplina & Presença",
  ];

  const compareMetrics = Object.values(METRICS_REGISTRY).filter((metric) => {
    if (!metric.enabled || !metric.screens.comparePlayers) return false;
    if (metric.onlyCompareMode && metric.onlyCompareMode !== compareMode) {
      return false;
    }
    return true;
  });

  return categoryOrder
    .map((category) => {
      const stats = compareMetrics
        .filter((m) => m.category === category)
        .sort((a, b) => {
          const orderA = a.order?.comparePlayers ?? 999;
          const orderB = b.order?.comparePlayers ?? 999;
          return orderA - orderB;
        });

      return { title: category, stats };
    })
    .filter((cat) => cat.stats.length > 0);
};

/**
 * Verifica se um grupo de curiosidades está habilitado no registro central
 */
export const isCuriosityGroupEnabled = (group?: string): boolean => {
  if (!group) return true;

  // Busca se alguma métrica representativa deste grupo foi desabilitada
  if (group === "goals") {
    const goalsMetric = METRICS_REGISTRY.goals;
    if (!goalsMetric.enabled) return false;
    if (goalsMetric.screens.curiosities === false) return false;
  }

  if (group === "assists") {
    const assistsMetric = METRICS_REGISTRY.assists;
    if (!assistsMetric.enabled) return false;
    if (assistsMetric.screens.curiosities === false) return false;
  }

  return true;
};

/**
 * Verifica se uma métrica está habilitada para a aba de estatísticas do clube (StatsTab_Club / CalculatedStatistics)
 */
export const isMetricEnabledForClubTab = (metricId: string): boolean => {
  const normalizedId =
    metricId === "matches"
      ? "games"
      : metricId === "rating"
        ? "avgRating"
        : metricId === "goalContributions"
          ? "goalParticipations"
          : metricId;

  const metric = METRICS_REGISTRY[normalizedId];
  if (!metric) return true;
  if (!metric.enabled) return false;
  if (metric.screens.statsTabClub === false) return false;

  // Se for contribuições em gols, depende também de gols e assistências
  if (normalizedId === "goalParticipations") {
    if (!METRICS_REGISTRY.goals?.enabled || METRICS_REGISTRY.goals?.screens.statsTabClub === false) return false;
    if (!METRICS_REGISTRY.assists?.enabled || METRICS_REGISTRY.assists?.screens.statsTabClub === false) return false;
  }

  return true;
};

/**
 * Verifica se uma métrica (ou estatística coletiva da equipe) está habilitada para o MatchStatsCard
 */
export const isMetricEnabledForMatchStatsCard = (metricId: string): boolean => {
  const normalizedId =
    metricId === "matches"
      ? "games"
      : metricId === "rating"
        ? "avgRating"
        : metricId === "goalsScored" || metricId === "goalsPerGame"
          ? "goals"
          : metricId === "assistsPerGame"
            ? "assists"
            : metricId === "shots" || metricId === "finishings" || metricId === "finishingsPerGame"
              ? "totalFinishings"
              : metricId === "shotsOnTarget" || metricId === "shotsOnTargetPerGame"
                ? "finishingsOnTarget"
                : metricId === "shotsOffTarget" || metricId === "shotsOffTargetPerGame"
                  ? "finishingsMissed"
                  : metricId === "passes"
                    ? "totalPasses"
                    : metricId === "keyPassesPerGame"
                      ? "keyPasses"
                      : metricId === "goalsConcededPerGame"
                        ? "goalsConceded"
                        : metricId === "defensesPerGame"
                          ? "defenses"
                          : metricId === "ballsRecoveredPerGame"
                            ? "ballsRecovered"
                            : metricId === "ballsLostPerGame"
                              ? "ballsLost"
                              : metricId;

  const metric = METRICS_REGISTRY[normalizedId];
  if (!metric) return true;
  if (!metric.enabled) return false;
  if (metric.screens.matchStatsCard === false) return false;

  return true;
};

