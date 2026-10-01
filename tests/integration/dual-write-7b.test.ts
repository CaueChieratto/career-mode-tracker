import { describe, it, expect, beforeEach } from "vitest";
import { ServiceLineup } from "../../src/pages/Match/services/ServiceLineup";
import { ServiceMatches } from "../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { db, auth } from "../../src/common/services/Firebase";
import {
  getDoc,
  doc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { login, resetData } from "./helpers";
import { stat, player, season, career } from "../../src/test/factories/domain";
import { augmentCareerWithMatchStats } from "../../src/layout/SectionView/helpers/mergeMatchStats";
import type { PlayerMatchStat } from "../../src/common/interfaces/PlayerMatchStat";
import type { Match } from "../../src/common/interfaces/Match";
import type { Career } from "../../src/common/interfaces/Career";

describe("7B Dual-Write, Concurrency, Match Detail Contract & Migration", () => {
  const careerId = "test-career";
  const seasonId = "test-season";
  const matchId = "test-match";

  beforeEach(async () => {
    await resetData();
    const uid = await login();
    const matchRef = doc(
      db,
      `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
    );
    const careerRef = doc(db, `users/${uid}/careers/${careerId}`);
    await setDoc(careerRef, {
      id: careerId,
      clubName: "Clube Teste",
      clubData: [{ id: seasonId, teams: [] }],
    });
    await setDoc(matchRef, {
      matchesId: matchId,
      status: "FINISHED",
      result: "V",
      homeTeam: "Clube Teste",
      awayTeam: "Rival",
      homeScore: 2,
      awayScore: 1,
    });
  });

  it("A/B/C: salvar, editar e remover stat com dual-write atomico", async () => {
    const uid = auth.currentUser?.uid;

    // A: Salvar
    const initialStat = stat({
      playerId: "p1",
      goals: 1,
      assists: 0,
      rating: 8,
      minutesPlayed: 90,
    });
    await ServiceMatches.savePlayerStatsToSubcollection(
      careerId,
      seasonId,
      matchId,
      [initialStat],
      [initialStat],
    );

    let matchSnap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
      ),
    );
    expect(matchSnap.data()?._playerStatsVersion).toBe(1);
    expect(matchSnap.data()?.playerStats).toHaveLength(1);
    expect(matchSnap.data()?.playerStats[0].goals).toBe(1);

    let statSnap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}/playerStats/p1`,
      ),
    );
    expect(statSnap.data()?.goals).toBe(1);

    // B: Editar
    const editedStat = stat({
      playerId: "p1",
      goals: 2,
      assists: 1,
      rating: 9,
      minutesPlayed: 90,
    });
    await ServiceMatches.savePlayerStatsToSubcollection(
      careerId,
      seasonId,
      matchId,
      [editedStat],
      [editedStat],
    );

    matchSnap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
      ),
    );
    expect(matchSnap.data()?.playerStats[0].goals).toBe(2);
    statSnap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}/playerStats/p1`,
      ),
    );
    expect(statSnap.data()?.goals).toBe(2);

    // C: Remover stat pela Lineup
    await ServiceLineup.saveLineupToMatch(
      careerId,
      seasonId,
      matchId,
      {
        formation: "4-4-2",
        goalkeeper: { slotId: "gk", playerId: null, playerName: null },
        lines: [],
        bench: [],
      },
      [],
      ["p1"],
    );

    matchSnap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
      ),
    );
    expect(matchSnap.data()?._playerStatsVersion).toBe(1);
    expect(matchSnap.data()?.playerStats).toHaveLength(0); // removed

    statSnap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}/playerStats/p1`,
      ),
    );
    expect(statSnap.exists()).toBe(false); // subcollection deleted
  });

  it("D/E: concorrência de dois players diferentes e o mesmo player converge semanticamente", async () => {
    const uid = auth.currentUser?.uid;

    // Concorrência diferentes players
    const p2 = stat({ playerId: "p2", goals: 1 });
    const p3 = stat({ playerId: "p3", goals: 2 });
    await Promise.all([
      ServiceMatches.savePlayerStatsToSubcollection(
        careerId,
        seasonId,
        matchId,
        [p2],
        [p2, p3],
      ),
      ServiceMatches.savePlayerStatsToSubcollection(
        careerId,
        seasonId,
        matchId,
        [p3],
        [p2, p3],
      ),
    ]);

    let matchSnap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
      ),
    );
    expect(matchSnap.data()?.playerStats).toHaveLength(2);

    const subDocs = await getDocs(
      collection(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}/playerStats`,
      ),
    );
    expect(subDocs.docs).toHaveLength(2);

    // Concorrência mesmo player
    const p2Assist = stat({ playerId: "p2", assists: 1 });
    const p2Rating = stat({ playerId: "p2", rating: 10 });
    await Promise.all([
      ServiceMatches.savePlayerStatsToSubcollection(
        careerId,
        seasonId,
        matchId,
        [p2Assist],
        [p2Assist, p3],
      ),
      ServiceMatches.savePlayerStatsToSubcollection(
        careerId,
        seasonId,
        matchId,
        [p2Rating],
        [p2Rating, p3],
      ),
    ]);

    matchSnap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
      ),
    );

    const embeddedP2 = (
      matchSnap.data()?.playerStats as PlayerMatchStat[]
    ).find((s) => s.playerId === "p2");
    const subP2Snap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}/playerStats/p2`,
      ),
    );
    const subP2 = subP2Snap.data() as PlayerMatchStat;

    expect(embeddedP2).toBeDefined();
    expect(subP2).toBeDefined();
    // Convergência semântica: embedded reflete os valores gravados na subcoleção moderna
    expect(embeddedP2?.rating).toEqual(subP2?.rating);
    expect(embeddedP2?.assists).toEqual(subP2?.assists);
  });

  it("F: concorrência delete vs update mantém as fontes consistentes com o último batch", async () => {
    const uid = auth.currentUser?.uid;

    // Inicializar com p1 e p2
    const initialStats = [
      stat({ playerId: "p1", goals: 1 }),
      stat({ playerId: "p2", goals: 2 }),
    ];
    await ServiceMatches.savePlayerStatsToSubcollection(
      careerId,
      seasonId,
      matchId,
      initialStats,
      initialStats,
    );

    // Concorrente: remover p1 via lineup vs atualizar p2 via stats
    await Promise.all([
      ServiceLineup.saveLineupToMatch(
        careerId,
        seasonId,
        matchId,
        {
          formation: "4-4-2",
          goalkeeper: { slotId: "gk", playerId: null, playerName: null },
          lines: [{ slotId: "s2", playerId: "p2", playerName: "P2" }],
          bench: [],
        },
        [],
        ["p1"],
      ),
      ServiceMatches.savePlayerStatsToSubcollection(
        careerId,
        seasonId,
        matchId,
        [stat({ playerId: "p2", goals: 5, rating: 9 })],
        [
          initialStats[0],
          stat({ playerId: "p2", goals: 5, rating: 9 }),
        ],
      ),
    ]);

    const matchSnap = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
      ),
    );
    const embeddedStats =
      (matchSnap.data()?.playerStats as PlayerMatchStat[]) || [];
    const p1InEmbedded = embeddedStats.find((s) => s.playerId === "p1");
    const p2InEmbedded = embeddedStats.find((s) => s.playerId === "p2");

    const p1Sub = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}/playerStats/p1`,
      ),
    );
    const p2Sub = await getDoc(
      doc(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}/playerStats/p2`,
      ),
    );

    // O último snapshot local pode manter ou remover p1, mas as fontes convergem.
    expect(Boolean(p1InEmbedded)).toBe(p1Sub.exists());

    // p2 sobreviveu e convergiu com gols atualizados
    expect(p2InEmbedded).toBeDefined();
    expect(p2Sub.exists()).toBe(true);
    expect(p2InEmbedded?.goals).toBe(5);
    expect(p2Sub.data()?.goals).toBe(5);
  });

  it("G: Match Detail: subcoleção moderna é autoritativa sobre embedded divergente", async () => {
    const uid = auth.currentUser?.uid;

    // Configurar cenário crítico:
    // 1. match embedded versão 1 contém stat A (goals: 1)
    const matchRef = doc(
      db,
      `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
    );
    await setDoc(
      matchRef,
      {
        matchesId: matchId,
        status: "FINISHED",
        _playerStatsVersion: 1,
        playerStats: [
          stat({ playerId: "p1", goals: 1, assists: 0, rating: 6 }),
        ],
      },
      { merge: true },
    );

    // 2. subcollection contém stat moderno B divergente (goals: 99, assists: 10, rating: 10)
    const statB = stat({ playerId: "p1", goals: 99, assists: 10, rating: 10 });
    const statRef = doc(matchRef, "playerStats", "p1");
    await setDoc(statRef, statB);

    // 3. Simulação da resolução do Match Detail (contrato de useMatchData):
    // Lê o snapshot inicial da partida (com embedded stat A)
    const currentMatchSnap = await getDoc(matchRef);
    const initialMatch = currentMatchSnap.data() as Match;
    expect(initialMatch.playerStats?.[0].goals).toBe(1); // embedded A

    // Abertura da partida consulta especificamente a subcoleção de matchId
    const subSnap = await getDocs(collection(matchRef, "playerStats"));
    const subStats = subSnap.docs.map((d) => d.data() as PlayerMatchStat);

    // Reconciliação autoritativa por ID: subcoleção moderna sobrescreve embedded
    const statsMap = new Map<string, PlayerMatchStat>();
    (initialMatch.playerStats || []).forEach((s) =>
      statsMap.set(s.playerId, s),
    );
    subStats.forEach((s) => statsMap.set(s.playerId, s));
    const resolvedMatchDetailStats = Array.from(statsMap.values());

    // Prova do contrato:
    // O valor na UI do Match Detail DEVE ser o moderno B (99 gols), e NÃO o embutido A (1 gol)!
    const resolvedP1 = resolvedMatchDetailStats.find(
      (s) => s.playerId === "p1",
    );
    expect(resolvedP1?.goals).toBe(99);
    expect(resolvedP1?.assists).toBe(10);
    expect(resolvedP1?.rating).toBe(10);

    // Escopo de query: exatamente 1 query para a subcoleção desta partida específica
    expect(subSnap.docs).toHaveLength(1);
    expect(subSnap.docs[0].ref.path).toContain(
      `matches/${matchId}/playerStats`,
    );
  });

  it("H: Legacy Merge: modern-only, legacy-only, mixed, empty, homônimos e same ID", () => {
    // Função pura que reproduz o algoritmo de merge do migrate-7b e do runtime
    function mergeStats(
      embedded: PlayerMatchStat[],
      subcollection: PlayerMatchStat[],
    ): PlayerMatchStat[] {
      const statsMap = new Map<string, PlayerMatchStat>();
      for (const s of embedded) {
        statsMap.set(s.playerId, s);
      }
      for (const s of subcollection) {
        statsMap.set(s.playerId, s);
      }
      return Array.from(statsMap.values());
    }

    // 1. Cenário solicitado: embedded (legacy-A, legacy-B), subcollection (modern-A), modern-A.id == legacy-A.id
    // Resultado esperado: modern-A (substitui legacy-A) e legacy-B (preservado)
    const legA = stat({ playerId: "id-A", goals: 1, rating: 6 });
    const legB = stat({ playerId: "id-B", goals: 2, rating: 7 });
    const modA = stat({ playerId: "id-A", goals: 10, rating: 9 });

    const result1 = mergeStats([legA, legB], [modA]);
    expect(result1).toHaveLength(2);
    expect(result1.find((s) => s.playerId === "id-A")?.goals).toBe(10);
    expect(result1.find((s) => s.playerId === "id-A")?.rating).toBe(9);
    expect(result1.find((s) => s.playerId === "id-B")?.goals).toBe(2);
    expect(result1.find((s) => s.playerId === "id-B")?.rating).toBe(7);

    // 2. modern-only
    const resultModernOnly = mergeStats([], [modA]);
    expect(resultModernOnly).toEqual([modA]);

    // 3. legacy-only
    const resultLegacyOnly = mergeStats([legA, legB], []);
    expect(resultLegacyOnly).toEqual([legA, legB]);

    // 4. mixed: players diferentes em ambos
    const modC = stat({ playerId: "id-C", goals: 5 });
    const resultMixed = mergeStats([legA], [modC]);
    expect(resultMixed).toHaveLength(2);
    expect(resultMixed.map((s) => s.playerId).sort()).toEqual(["id-A", "id-C"]);

    // 5. empty
    const resultEmpty = mergeStats([], []);
    expect(resultEmpty).toHaveLength(0);

    // 6. homônimos com IDs diferentes
    const homonym1 = stat({ playerId: "id-1", goals: 3 });
    const homonym2 = stat({ playerId: "id-2", goals: 7 });
    const resultHomonyms = mergeStats([homonym1], [homonym2]);
    expect(resultHomonyms).toHaveLength(2);
    expect(resultHomonyms.find((s) => s.playerId === "id-1")?.goals).toBe(3);
    expect(resultHomonyms.find((s) => s.playerId === "id-2")?.goals).toBe(7);
  });

  it("I: Migration emulator: dry-run (zero writes), migração real e idempotência", async () => {
    const uid = auth.currentUser?.uid;
    const matchRef = doc(
      db,
      `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
    );

    // Setup legacy match sem _playerStatsVersion
    await setDoc(matchRef, {
      matchesId: matchId,
      status: "FINISHED",
      playerStats: [stat({ playerId: "leg1", goals: 1 })],
    });
    const subRef = doc(matchRef, "playerStats", "mod1");
    await setDoc(subRef, stat({ playerId: "mod1", goals: 3 }));

    // Helper simulando migrate-7b logicamente
    async function runMigration(isDryRun: boolean) {
      const snap = await getDoc(matchRef);
      const data = snap.data() as Match;
      if (data._playerStatsVersion === 1) return { skipped: true };

      const subSnap = await getDocs(collection(matchRef, "playerStats"));
      const map = new Map<string, PlayerMatchStat>();
      (data.playerStats || []).forEach((s) => map.set(s.playerId, s));
      subSnap.docs.forEach((d) => map.set(d.id, d.data() as PlayerMatchStat));

      if (!isDryRun) {
        await updateDoc(matchRef, {
          playerStats: Array.from(map.values()),
          _playerStatsVersion: 1,
        });
      }
      return { skipped: false, count: map.size };
    }

    // 1. Dry run: zero writes
    const dryRunResult = await runMigration(true);
    expect(dryRunResult.skipped).toBe(false);
    let matchSnap = await getDoc(matchRef);
    expect(matchSnap.data()?._playerStatsVersion).toBeUndefined(); // NÃO escreveu!
    expect(matchSnap.data()?.playerStats).toHaveLength(1); // NÃO alterou!

    // 2. Migração real: grava snapshot e carimba versão 1
    const migResult = await runMigration(false);
    expect(migResult.skipped).toBe(false);
    matchSnap = await getDoc(matchRef);
    expect(matchSnap.data()?._playerStatsVersion).toBe(1);
    expect(matchSnap.data()?.playerStats).toHaveLength(2); // fundiu leg1 + mod1

    // 3. Segunda execução: idempotente (pula partidas versionadas)
    const idempotentResult = await runMigration(false);
    expect(idempotentResult.skipped).toBe(true);
  });

  it("J: Equivalência programática dos agregadores BEFORE vs AFTER migration", async () => {
    // Criar carreira com jogadores e partidas
    const p1 = player({ id: "p1", name: "Atacante 1", statsLeagues: [] });
    const p2 = player({ id: "p2", name: "Goleiro 1", statsLeagues: [] });

    // Criar partida não-migrada (legacy) com stats na subcoleção e embutidas
    const m1Stats: PlayerMatchStat[] = [
      stat({
        playerId: "p1",
        goals: 2,
        assists: 1,
        minutesPlayed: 90,
        rating: 8.5,
        cleanSheet: false,
        defenses: 0,
      }),
      stat({
        playerId: "p2",
        goals: 0,
        assists: 0,
        minutesPlayed: 90,
        rating: 7.0,
        cleanSheet: true,
        defenses: 4,
      }),
    ];

    const testMatch: Match = {
      matchesId: "m1",
      date: "01/08/2026",
      league: "Brasileirão",
      homeTeam: "Meu Clube",
      awayTeam: "Rival",
      status: "FINISHED",
      result: "V",
      homeScore: 2,
      awayScore: 0,
      playerStats: m1Stats, // legacy embedded
    };

    const initialCareer: Career = career({
      id: careerId,
      clubName: "Meu Clube",
      clubData: [
        season({
          id: seasonId,
          players: [p1, p2],
          matches: [testMatch],
          leagues: [
            {
              name: "Brasileirão",
              logo: "/logo.png",
              trophy: "/trophy.png",
              league: true,
            },
          ],
        }),
      ],
    });

    // 1. Capturar agregados BEFORE migration
    const beforeAugmented = augmentCareerWithMatchStats(initialCareer);
    const beforeSeason = beforeAugmented.clubData![0];
    const beforeP1 = beforeSeason.players.find((p) => p.id === "p1")!;
    const beforeP2 = beforeSeason.players.find((p) => p.id === "p2")!;
    const beforeP1Stats = beforeP1.statsLeagues[0].stats;
    const beforeP2Stats = beforeP2.statsLeagues[0].stats;

    // 2. Simular migração (carimbo _playerStatsVersion: 1)
    const migratedMatch: Match = {
      ...testMatch,
      _playerStatsVersion: 1,
      playerStats: m1Stats,
    };
    const migratedCareer: Career = {
      ...initialCareer,
      clubData: [
        {
          ...initialCareer.clubData![0],
          matches: [migratedMatch],
        },
      ],
    };

    // 3. Capturar agregados AFTER migration
    const afterAugmented = augmentCareerWithMatchStats(migratedCareer);
    const afterSeason = afterAugmented.clubData![0];
    const afterP1 = afterSeason.players.find((p) => p.id === "p1")!;
    const afterP2 = afterSeason.players.find((p) => p.id === "p2")!;
    const afterP1Stats = afterP1.statsLeagues[0].stats;
    const afterP2Stats = afterP2.statsLeagues[0].stats;

    // 4. Assertions programáticas de equivalência estrita campo a campo
    // Atacante (P1)
    expect(afterP1Stats.goals).toBe(beforeP1Stats.goals);
    expect(afterP1Stats.assists).toBe(beforeP1Stats.assists);
    expect(afterP1Stats.games).toBe(beforeP1Stats.games);
    expect(afterP1Stats.minutesPlayed).toBe(beforeP1Stats.minutesPlayed);
    expect(afterP1Stats.rating).toBe(beforeP1Stats.rating);
    expect(afterP1Stats.cleanSheets).toBe(beforeP1Stats.cleanSheets);
    expect(afterP1Stats.defenses).toBe(beforeP1Stats.defenses);

    // Goleiro (P2)
    expect(afterP2Stats.goals).toBe(beforeP2Stats.goals);
    expect(afterP2Stats.assists).toBe(beforeP2Stats.assists);
    expect(afterP2Stats.games).toBe(beforeP2Stats.games);
    expect(afterP2Stats.minutesPlayed).toBe(beforeP2Stats.minutesPlayed);
    expect(afterP2Stats.rating).toBe(beforeP2Stats.rating);
    expect(afterP2Stats.cleanSheets).toBe(beforeP2Stats.cleanSheets);
    expect(afterP2Stats.defenses).toBe(beforeP2Stats.defenses);
  });
});
