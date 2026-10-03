import { describe, it, expect } from "vitest";
import { Match } from "../common/interfaces/Match";
import {
  OpponentCard,
  OpponentEvents,
} from "../common/interfaces/OpponentEventsMatches";
import {
  countOpponentCards,
  getDerivedOpponentCards,
  getOpponentCardsProjection,
  hasAuthoritativeOpponentCards,
  isUserHomeTeam,
  normalizeOpponentEvents,
} from "../pages/Match/helpers/opponentCards";

describe("Opponent Cards - Pure Counting and Business Rules", () => {
  it("amarelo simples: contabiliza 1 amarelo e 0 vermelhos", () => {
    const cards: OpponentCard[] = [
      {
        player: "Silva",
        yellow: true,
        yellowMinute: "23",
        secondYellow: false,
        secondYellowMinute: "",
        red: false,
        redMinute: "",
      },
    ];

    const result = countOpponentCards(cards);
    expect(result).toEqual({ yellowCards: 1, redCards: 0 });
  });

  it("vermelho simples (direto): contabiliza 0 amarelos e 1 vermelho", () => {
    const cards: OpponentCard[] = [
      {
        player: "Ramos",
        yellow: false,
        yellowMinute: "",
        secondYellow: false,
        secondYellowMinute: "",
        red: true,
        redMinute: "45",
      },
    ];

    const result = countOpponentCards(cards);
    expect(result).toEqual({ yellowCards: 0, redCards: 1 });
  });

  it("segundo amarelo: contabiliza 2 amarelos e 1 vermelho/expulsão", () => {
    const cards: OpponentCard[] = [
      {
        player: "Casemiro",
        yellow: true,
        yellowMinute: "30",
        secondYellow: true,
        secondYellowMinute: "75",
        red: false,
        redMinute: "",
      },
    ];

    const result = countOpponentCards(cards);
    expect(result).toEqual({ yellowCards: 2, redCards: 1 });
  });

  it("amarelo + vermelho direto: contabiliza 1 amarelo e 1 vermelho", () => {
    const cards: OpponentCard[] = [
      {
        player: "Pepe",
        yellow: true,
        yellowMinute: "15",
        secondYellow: false,
        secondYellowMinute: "",
        red: true,
        redMinute: "80",
      },
    ];

    const result = countOpponentCards(cards);
    expect(result).toEqual({ yellowCards: 1, redCards: 1 });
  });

  it("flags contraditórias (secondYellow === true E red === true): não gera dois vermelhos para a mesma expulsão", () => {
    const cards: OpponentCard[] = [
      {
        player: "Suarez",
        yellow: true,
        yellowMinute: "20",
        secondYellow: true,
        secondYellowMinute: "60",
        red: true,
        redMinute: "60",
      },
    ];

    const result = countOpponentCards(cards);
    expect(result).toEqual({ yellowCards: 2, redCards: 1 });
  });

  it("zero: lista vazia retorna 0 amarelos e 0 vermelhos", () => {
    expect(countOpponentCards([])).toEqual({ yellowCards: 0, redCards: 0 });
    expect(countOpponentCards(null)).toEqual({ yellowCards: 0, redCards: 0 });
    expect(countOpponentCards(undefined)).toEqual({
      yellowCards: 0,
      redCards: 0,
    });
  });

  it("sem minuto: contabiliza flags mesmo sem nenhum minuto preenchido", () => {
    const cards: OpponentCard[] = [
      {
        player: "Jogador A",
        yellow: true,
        yellowMinute: "",
        secondYellow: false,
        secondYellowMinute: "",
        red: false,
        redMinute: "",
      },
      {
        player: "Jogador B",
        yellow: true,
        yellowMinute: "",
        secondYellow: true,
        secondYellowMinute: "",
        red: false,
        redMinute: "",
      },
      {
        player: "Jogador C",
        yellow: false,
        yellowMinute: "",
        secondYellow: false,
        secondYellowMinute: "",
        red: true,
        redMinute: "",
      },
    ];

    const result = countOpponentCards(cards);
    // Jogador A: 1 Y, 0 R
    // Jogador B: 2 Y, 1 R
    // Jogador C: 0 Y, 1 R
    // Total: 3 Y, 2 R
    expect(result).toEqual({ yellowCards: 3, redCards: 2 });
  });

  it("não mutação: não altera o array nem os objetos recebidos", () => {
    const originalCard: OpponentCard = Object.freeze({
      player: "Imutável",
      yellow: true,
      yellowMinute: "10",
      secondYellow: true,
      secondYellowMinute: "50",
      red: false,
      redMinute: "",
    });
    const cards = Object.freeze([originalCard]);

    const result = countOpponentCards(cards);
    expect(result).toEqual({ yellowCards: 2, redCards: 1 });
    expect(cards[0].player).toBe("Imutável");
  });
});

describe("Opponent Cards - Authoritative Check and Legacy Support", () => {
  it("objeto ausente: retorna false e null de derived cards", () => {
    expect(hasAuthoritativeOpponentCards(undefined)).toBe(false);
    expect(hasAuthoritativeOpponentCards(null)).toBe(false);
    expect(getDerivedOpponentCards(undefined)).toBeNull();
    expect(getDerivedOpponentCards(null)).toBeNull();
  });

  it("formato legado (array): normaliza para o primeiro elemento e conta cartões", () => {
    const legacyArray: OpponentEvents[] = [
      {
        cards: [
          {
            player: "Legado",
            yellow: true,
            yellowMinute: "12",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
        ],
      },
    ];

    expect(hasAuthoritativeOpponentCards(legacyArray)).toBe(true);
    const normalized = normalizeOpponentEvents(legacyArray);
    expect(normalized?.cards?.length).toBe(1);
    expect(getDerivedOpponentCards(legacyArray)).toEqual({
      yellowCards: 1,
      redCards: 0,
    });
  });

  it("legado com array vazio sem flag: não considera autoritativo para preservar manuais", () => {
    const legacyEmptyArray: OpponentEvents[] = [];
    expect(hasAuthoritativeOpponentCards(legacyEmptyArray)).toBe(false);
    expect(getDerivedOpponentCards(legacyEmptyArray)).toBeNull();
  });

  it("remoção explícita até zero (cardsAuthoritative = true e cards = []): é autoritativo e zera projeção", () => {
    const explicitZeroDetails: OpponentEvents = {
      cards: [],
      cardsAuthoritative: true,
    };

    expect(hasAuthoritativeOpponentCards(explicitZeroDetails)).toBe(true);
    expect(getDerivedOpponentCards(explicitZeroDetails)).toEqual({
      yellowCards: 0,
      redCards: 0,
    });
  });
});

describe("Opponent Cards - Home / Away Mapping", () => {
  const baseMatch: Match = {
    matchesId: "m1",
    date: "01/10/2026",
    league: "Premier League",
    homeTeam: "Chelsea",
    awayTeam: "Arsenal",
    result: "V",
    status: "FINISHED",
    homeYellowCards: 1,
    homeRedCards: 0,
    awayYellowCards: 5,
    awayRedCards: 2,
  };

  it("quando o clube da carreira é mandante: cartões adversários mapeiam para away e preservam home", () => {
    expect(isUserHomeTeam(baseMatch, "Chelsea")).toBe(true);

    const matchWithDetails: Match = {
      ...baseMatch,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "30",
            secondYellow: true,
            secondYellowMinute: "85",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
    };

    const projection = getOpponentCardsProjection(matchWithDetails, "Chelsea");
    // Chelsea (user) is Home -> Home cards preserved (1 Y, 0 R)
    // Arsenal (opponent) is Away -> Derived from details (2 Y, 1 R)
    expect(projection.homeYellowCards).toBe(1);
    expect(projection.homeRedCards).toBe(0);
    expect(projection.awayYellowCards).toBe(2);
    expect(projection.awayRedCards).toBe(1);
  });

  it("quando o clube da carreira é visitante: cartões adversários mapeiam para home e preservam away", () => {
    expect(isUserHomeTeam(baseMatch, "Arsenal")).toBe(false);

    const matchWithDetails: Match = {
      ...baseMatch,
      homeYellowCards: 5,
      homeRedCards: 2,
      awayYellowCards: 1,
      awayRedCards: 0,
      opponentEvents: {
        cards: [
          {
            player: "Palmer",
            yellow: true,
            yellowMinute: "10",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
    };

    const projection = getOpponentCardsProjection(matchWithDetails, "Arsenal");
    // Arsenal (user) is Away -> Away cards preserved (1 Y, 0 R)
    // Chelsea (opponent) is Home -> Derived from details (1 Y, 0 R)
    expect(projection.homeYellowCards).toBe(1);
    expect(projection.homeRedCards).toBe(0);
    expect(projection.awayYellowCards).toBe(1);
    expect(projection.awayRedCards).toBe(0);
  });

  it("partida legado sem detalhes autoritativos: preserva totais manuais existentes", () => {
    const legacyMatch: Match = {
      ...baseMatch,
      homeYellowCards: 3,
      awayYellowCards: 4,
      homeRedCards: 1,
      awayRedCards: 0,
      opponentEvents: undefined,
    };

    const projection = getOpponentCardsProjection(legacyMatch, "Chelsea");
    expect(projection.homeYellowCards).toBe(3);
    expect(projection.awayYellowCards).toBe(4);
    expect(projection.homeRedCards).toBe(1);
    expect(projection.awayRedCards).toBe(0);
  });
});
