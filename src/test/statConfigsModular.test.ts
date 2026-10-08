import { describe, it, expect } from "vitest";
import {
  UNIFIED_CARDS_CONFIG,
  statConfigs,
} from "../layout/SectionView/features/ClubTabs/BestPlayersTab/constants/statConfigs";
import { AggregatedPlayerStats } from "../common/interfaces/AggregatedPlayerStats/AggregatedPlayerStats";

const createPlayerStat = (position: string) =>
  ({
    player: { position },
  }) as unknown as AggregatedPlayerStats;

describe("statConfigs modular & unit formatting requirements", () => {
  it("carrega todas as 8 categorias de cards unificados", () => {
    const categories = new Set(UNIFIED_CARDS_CONFIG.map((c) => c.category));
    expect(categories).toEqual(
      new Set([
        "geral",
        "ataque",
        "criacao",
        "conducoes",
        "defesa",
        "disciplina",
        "goleiro",
        "fisico",
      ]),
    );
  });

  it("Gols: palavra 'gol'/'gols' sempre no value e com plural correto", () => {
    const card = UNIFIED_CARDS_CONFIG.find((c) => c.id === "goals");
    expect(card).toBeDefined();

    const totals = card?.tabs.find((t) => t.id === "totals");
    expect(totals?.formatParts?.(1)).toEqual({ value: "1 gol" });
    expect(totals?.formatParts?.(2)).toEqual({ value: "2 gols" });
    expect(totals?.format?.(1)).toBe("1 gol");
    expect(totals?.format?.(2)).toBe("2 gols");

    const freq = card?.tabs.find((t) => t.id === "frequency");
    expect(freq?.formatParts?.(90)).toEqual({
      value: "1 gol",
      description: "a cada 90 min",
    });

    const perGame = card?.tabs.find((t) => t.id === "perGame");
    expect(perGame?.formatParts?.(1)).toEqual({
      value: "1,00 gol",
      description: "por partida",
    });
    expect(perGame?.formatParts?.(1.5)).toEqual({
      value: "1,50 gols",
      description: "por partida",
    });

    const per90 = card?.tabs.find((t) => t.id === "per90");
    expect(per90?.formatParts?.(1.2)).toEqual({
      value: "1,20 gols",
      description: "a cada 90 min",
    });
  });

  it("Participações (ex-G/A): palavra 'participação' no value, remove sigla 'G/A'", () => {
    const card = UNIFIED_CARDS_CONFIG.find((c) => c.id === "goalParticipations");
    expect(card).toBeDefined();
    expect(card?.title).toBe("Participações em Gols");

    const totals = card?.tabs.find((t) => t.id === "totals");
    expect(totals?.formatParts?.(1)).toEqual({ value: "1 participação" });
    expect(totals?.formatParts?.(5)).toEqual({ value: "5 participações" });

    const freq = card?.tabs.find((t) => t.id === "frequency");
    expect(freq?.formatParts?.(60)).toEqual({
      value: "1 participação",
      description: "a cada 60 min",
    });
    expect(freq?.format?.(60)).toBe("1 participação a cada 60 min");

    const perGame = card?.tabs.find((t) => t.id === "perGame");
    expect(perGame?.formatParts?.(1.25)).toEqual({
      value: "1,25 participações",
      description: "por partida",
    });

    const per90 = card?.tabs.find((t) => t.id === "per90");
    expect(per90?.formatParts?.(1.75)).toEqual({
      value: "1,75 participações",
      description: "a cada 90 min",
    });
  });

  it("Chutes: palavra 'chute'/'chutes' no value (não 'finalização')", () => {
    const card = UNIFIED_CARDS_CONFIG.find((c) => c.id === "totalFinishings");
    expect(card).toBeDefined();

    const totals = card?.tabs.find((t) => t.id === "totals");
    expect(totals?.formatParts?.(1)).toEqual({ value: "1 chute" });
    expect(totals?.formatParts?.(4)).toEqual({ value: "4 chutes" });

    const perGame = card?.tabs.find((t) => t.id === "perGame");
    expect(perGame?.formatParts?.(3.5)).toEqual({
      value: "3,50 chutes",
      description: "por partida",
    });

    const per90 = card?.tabs.find((t) => t.id === "per90");
    expect(per90?.formatParts?.(4.1)).toEqual({
      value: "4,10 chutes",
      description: "a cada 90 min",
    });
  });

  it("Chutes no Alvo: 'chute(s) no alvo' no value e não na descrição", () => {
    const card = UNIFIED_CARDS_CONFIG.find((c) => c.id === "finishingsOnTarget");
    expect(card).toBeDefined();

    const totals = card?.tabs.find((t) => t.id === "totals");
    expect(totals?.formatParts?.(1)).toEqual({ value: "1 chute no alvo" });
    expect(totals?.formatParts?.(7)).toEqual({ value: "7 chutes no alvo" });

    const perGame = card?.tabs.find((t) => t.id === "perGame");
    expect(perGame?.formatParts?.(2.1)).toEqual({
      value: "2,10 chutes no alvo",
      description: "por partida",
    });

    const per90 = card?.tabs.find((t) => t.id === "per90");
    expect(per90?.formatParts?.(2.5)).toEqual({
      value: "2,50 chutes no alvo",
      description: "a cada 90 min",
    });
  });

  it("Chutes para Fora: 'chute(s) para fora' no value e não na descrição", () => {
    const card = UNIFIED_CARDS_CONFIG.find((c) => c.id === "finishingsMissed");
    expect(card).toBeDefined();

    const totals = card?.tabs.find((t) => t.id === "totals");
    expect(totals?.formatParts?.(1)).toEqual({ value: "1 chute para fora" });
    expect(totals?.formatParts?.(3)).toEqual({ value: "3 chutes para fora" });

    const perGame = card?.tabs.find((t) => t.id === "perGame");
    expect(perGame?.formatParts?.(1.5)).toEqual({
      value: "1,50 chutes para fora",
      description: "por partida",
    });

    const per90 = card?.tabs.find((t) => t.id === "per90");
    expect(per90?.formatParts?.(1.8)).toEqual({
      value: "1,80 chutes para fora",
      description: "a cada 90 min",
    });
  });

  it("Passes Certos: 'passe certo'/'passes certos' no value", () => {
    const card = UNIFIED_CARDS_CONFIG.find((c) => c.id === "passesCompleted");
    expect(card).toBeDefined();

    const totals = card?.tabs.find((t) => t.id === "totals");
    expect(totals?.formatParts?.(1)).toEqual({ value: "1 passe certo" });
    expect(totals?.formatParts?.(50)).toEqual({ value: "50 passes certos" });

    const perGame = card?.tabs.find((t) => t.id === "perGame");
    expect(perGame?.formatParts?.(45.2)).toEqual({
      value: "45,20 passes certos",
      description: "por partida",
    });
  });

  it("Conduções: para certas e erradas, palavra 'condução' no value e certa/errada na description", () => {
    const cardCompleted = UNIFIED_CARDS_CONFIG.find(
      (c) => c.id === "dribblesCompleted",
    );
    const cardMissed = UNIFIED_CARDS_CONFIG.find(
      (c) => c.id === "dribblesMissed",
    );
    expect(cardCompleted).toBeDefined();
    expect(cardMissed).toBeDefined();

    expect(cardCompleted?.tabs.find((t) => t.id === "totals")?.formatParts?.(1)).toEqual({
      value: "1 condução",
      description: "certa",
    });
    expect(cardCompleted?.tabs.find((t) => t.id === "totals")?.formatParts?.(10)).toEqual({
      value: "10 conduções",
      description: "certas",
    });
    expect(cardCompleted?.tabs.find((t) => t.id === "perGame")?.formatParts?.(5.5)).toEqual({
      value: "5,50 conduções",
      description: "certas por partida",
    });

    expect(cardMissed?.tabs.find((t) => t.id === "totals")?.formatParts?.(1)).toEqual({
      value: "1 condução",
      description: "errada",
    });
    expect(cardMissed?.tabs.find((t) => t.id === "totals")?.formatParts?.(3)).toEqual({
      value: "3 conduções",
      description: "erradas",
    });
    expect(cardMissed?.tabs.find((t) => t.id === "perGame")?.formatParts?.(2.2)).toEqual({
      value: "2,20 conduções",
      description: "erradas por partida",
    });
  });

  it("Defesa: Bolas Recuperadas mantém 'bola recuperada' em totais e usa 'recuperações de bola' em médias", () => {
    const recovered = UNIFIED_CARDS_CONFIG.find((c) => c.id === "ballsRecovered");
    const lost = UNIFIED_CARDS_CONFIG.find((c) => c.id === "ballsLost");

    expect(recovered?.tabs.find((t) => t.id === "totals")?.formatParts?.(1)).toEqual({
      value: "1 bola recuperada",
    });
    expect(recovered?.tabs.find((t) => t.id === "totals")?.formatParts?.(8)).toEqual({
      value: "8 bolas recuperadas",
    });
    expect(recovered?.tabs.find((t) => t.id === "perGame")?.formatParts?.(4.5)).toEqual({
      value: "4,50 recuperações",
      description: "de bola por partida",
    });
    expect(recovered?.tabs.find((t) => t.id === "per90")?.formatParts?.(5.1)).toEqual({
      value: "5,10 recuperações",
      description: "de bola a cada 90 min",
    });

    expect(lost?.tabs.find((t) => t.id === "totals")?.formatParts?.(1)).toEqual({
      value: "1 bola perdida",
    });
    expect(lost?.tabs.find((t) => t.id === "totals")?.formatParts?.(4)).toEqual({
      value: "4 bolas perdidas",
    });
  });

  it("Disciplina: Cartões Amarelos e Vermelhos mantêm apenas a cor no value", () => {
    const yellow = UNIFIED_CARDS_CONFIG.find((c) => c.id === "yellowCards");
    const red = UNIFIED_CARDS_CONFIG.find((c) => c.id === "redCards");

    expect(yellow?.title).toBe("Cartões Amarelos");
    expect(yellow?.tabs.find((t) => t.id === "totals")?.formatParts?.(1)).toEqual({
      value: "1 amarelo",
    });
    expect(yellow?.tabs.find((t) => t.id === "totals")?.formatParts?.(3)).toEqual({
      value: "3 amarelos",
    });
    expect(yellow?.tabs.find((t) => t.id === "perGame")?.formatParts?.(0.2)).toEqual({
      value: "0,20 amarelos",
      description: "por partida",
    });

    expect(red?.title).toBe("Cartões Vermelhos");
    expect(red?.tabs.find((t) => t.id === "totals")?.formatParts?.(1)).toEqual({
      value: "1 vermelho",
    });
    expect(red?.tabs.find((t) => t.id === "totals")?.formatParts?.(2)).toEqual({
      value: "2 vermelhos",
    });
  });

  it("Goleiro: Defesas e Clean Sheets (com filtro position=GOL e jogos no valor)", () => {
    const defenses = UNIFIED_CARDS_CONFIG.find((c) => c.id === "defenses");
    const cleanSheets = UNIFIED_CARDS_CONFIG.find((c) => c.id === "cleanSheets");

    expect(defenses?.tabs.find((t) => t.id === "totals")?.formatParts?.(1)).toEqual({
      value: "1 defesa",
    });
    expect(defenses?.tabs.find((t) => t.id === "totals")?.formatParts?.(6)).toEqual({
      value: "6 defesas",
    });

    // Filtro de posição para goleiros
    expect(cleanSheets?.filter?.(createPlayerStat("GOL"))).toBe(true);
    expect(cleanSheets?.filter?.(createPlayerStat("ZAG"))).toBe(false);

    expect(cleanSheets?.tabs.find((t) => t.id === "totals")?.formatParts?.(1)).toEqual({
      value: "1 jogo",
      description: "sem sofrer gol",
    });
    expect(cleanSheets?.tabs.find((t) => t.id === "totals")?.formatParts?.(5)).toEqual({
      value: "5 jogos",
      description: "sem sofrer gols",
    });
    expect(cleanSheets?.tabs.find((t) => t.id === "perGame")?.formatParts?.(0.8)).toEqual({
      value: "0,80 clean sheets",
      description: "por partida",
    });
  });

  it("Físico: km e minutos no value", () => {
    const kmCard = UNIFIED_CARDS_CONFIG.find((c) => c.id === "distanceKm");
    const minCard = UNIFIED_CARDS_CONFIG.find((c) => c.id === "minutesPlayed");
    const minPerGameCard = UNIFIED_CARDS_CONFIG.find(
      (c) => c.id === "minutesPerGame",
    );

    expect(kmCard?.tabs.find((t) => t.id === "totals")?.formatParts?.(11.2)).toEqual({
      value: "11,2 km",
      description: "percorridos ao todo",
    });
    expect(kmCard?.tabs.find((t) => t.id === "perGame")?.formatParts?.(10.5)).toEqual({
      value: "10,5 km",
      description: "por partida",
    });
    expect(kmCard?.tabs.find((t) => t.id === "per90")?.formatParts?.(9.8)).toEqual({
      value: "9,8 km",
      description: "a cada 90 min",
    });

    expect(minCard?.tabs.find((t) => t.id === "totals")?.formatParts?.(1200)).toEqual({
      value: "1.200 minutos",
      description: "jogados",
    });

    expect(minPerGameCard?.tabs.find((t) => t.id === "totals")?.formatParts?.(75)).toEqual({
      value: "75 minutos",
      description: "por partida",
    });
  });

  it("Todas as tabs de todos os cards possuem formatParts e format", () => {
    UNIFIED_CARDS_CONFIG.forEach((card) => {
      card.tabs.forEach((tab) => {
        expect(tab.formatParts).toBeDefined();
        expect(tab.format).toBeDefined();
      });
    });
  });

  it("statConfigs mapeia corretamente todos os cards e tabs", () => {
    const totalTabsCount = UNIFIED_CARDS_CONFIG.reduce(
      (acc, card) => acc + card.tabs.length,
      0,
    );
    expect(statConfigs.length).toBe(totalTabsCount);
  });

  it("statConfigs preserva filter em cada tab correspondente", () => {
    const cleanSheetsConfigs = statConfigs.filter(
      (c) => c.key === "cleanSheets" || c.key === "cleanSheetsPerGame",
    );
    expect(cleanSheetsConfigs.length).toBe(2);
    cleanSheetsConfigs.forEach((cfg) => {
      expect(cfg.filter).toBeDefined();
      expect(cfg.filter?.(createPlayerStat("GOL"))).toBe(true);
      expect(cfg.filter?.(createPlayerStat("MC"))).toBe(false);
    });
  });
});

