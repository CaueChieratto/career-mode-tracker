import {
  career,
  season,
  player,
  match,
  stat,
  academyPlayer,
} from "../../src/test/factories/domain.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
export const project = "demo-career-tracker-integration";
export const base = `http://127.0.0.1:8089/v1/projects/${project}/databases/(default)/documents`;
export const profiles = [
  { name: "small", seasons: 1, matches: 20, players: 18, academy: 6 },
  { name: "medium", seasons: 2, matches: 50, players: 25, academy: 10 },
  { name: "large", seasons: 6, matches: 50, players: 28, academy: 12 },
];
export function value(x) {
  if (x === null) return { nullValue: null };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(value) } };
  if (typeof x === "object") return { mapValue: { fields: fields(x) } };
  if (typeof x === "boolean") return { booleanValue: x };
  if (typeof x === "number")
    return Number.isInteger(x)
      ? { integerValue: String(x) }
      : { doubleValue: x };
  return { stringValue: x };
}
export const fields = (x) =>
  Object.fromEntries(
    Object.entries(x)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, value(v)]),
  );
export async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
export async function seed() {
  await request(
    `http://127.0.0.1:8089/emulator/v1/projects/${project}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  await request(
    `http://127.0.0.1:9098/emulator/v1/projects/${project}/accounts`,
    { method: "DELETE" },
  );
  const manifest = [];
  for (const p of profiles) {
    const email = `baseline-${p.name}@example.test`,
      password = "SyntheticOnly123!";
    const account = await request(
      "http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-performance-key",
      {
        method: "POST",
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const uid = account.localId,
      documents = [];
    const put = (path, data) => documents.push({ path, data });
    const league = {
      name: "Brasileirão",
      trophy: "/images/trophies/brasil/brasileirao.png",
      logo: "/Logo.png",
      league: true,
      isFirstDivision: true,
      order: 1,
    };
    for (let c = 1; c <= 3; c++) {
      const club = `Clube ${c}`,
        cp = `users/${uid}/careers/c${c}`,
        seasons = [];
      for (let s = 1; s <= p.seasons; s++) {
        const sid = `s${s}`,
          sp = `${cp}/seasons/${sid}`;
        const sd = season({
          id: sid,
          seasonNumber: s,
          leagues: [league],
          teams: [
            { name: "Rival", badge: "/Logo.png", leagueName: league.name },
          ],
        });
        seasons.push(sd);
        put(sp, sd);
        for (let i = 1; i <= p.players; i++)
          put(
            `${sp}/players/p${i}`,
            player({
              id: `p${i}`,
              name: `Jogador ${String(i).padStart(2, "0")}`,
              position: i === 1 ? "GOL" : "ATA",
              shirtNumber: String(i),
              statsLeagues: [],
            }),
          );
        for (let m = 1; m <= p.matches; m++) {
          put(
            `${sp}/matches/s${s}m${m}`,
            match({
              matchesId: `s${s}m${m}`,
              date: `${String(((m - 1) % 28) + 1).padStart(2, "0")}/${String(Math.floor((m - 1) / 5) + 1).padStart(2, "0")}/${24 + s}`,
              league: league.name,
              homeTeam: club,
              awayTeam: "Rival",
              status: "FINISHED",
              result: "V",
              homeScore: 2,
              awayScore: 1,
            }),
          );
          for (let i = 1; i <= 11; i++)
            put(
              `${sp}/matches/s${s}m${m}/playerStats/p${i}`,
              stat({
                playerId: `p${i}`,
                rating: 7,
                goals: i === 2 ? 2 : 0,
                assists: i === 3 ? 1 : 0,
              }),
            );
        }
        for (let a = 1; a <= p.academy; a++)
          put(
            `${sp}/academyPlayers/a${a}`,
            academyPlayer({
              id: `a${a}`,
              name: `Base ${String(a).padStart(2, "0")}`,
              nationality: "BRA",
            }),
          );
        for (let a = 1; a <= 2; a++)
          put(`${sp}/academyTournaments/a${a}`, {
            id: `a${a}`,
            name: `Copa Base ${a}`,
            date: "01/08/2025",
            totalMatches: 3,
            matches: [],
            tournamentResult: "Em andamento",
            isChampion: false,
            isFinished: false,
          });
        for (let t = 1; t <= 2; t++)
          put(`${sp}/table/t${t}`, {
            id: `t${t}`,
            name: t === 1 ? club : "Rival",
            badge: "/Logo.png",
            position: t,
            played: 10,
            won: 5,
            drawn: 2,
            lost: 3,
            goalsFor: 15,
            goalsAgainst: 10,
            goalDiff: 5,
            points: 17,
            zone: "none",
          });
      }
      put(
        cp,
        career({
          id: `c${c}`,
          clubName: club,
          managerName: c === 1 ? "Treinador Solo" : "Treinador Grupo",
          groupId: c === 1 ? null : "g1",
          teamBadge: "/Logo.png",
          colorsTeams: ["#224488", "#ffffff"],
          clubData: seasons,
          academy: {
            name: "Academia Sintetica",
            nickname: "Base",
            tournament: "Torneios",
          },
          updatedAt: 1700000000000,
          trophies: [
            {
              leagueName: league.name,
              leagueImage: league.trophy,
              seasons: ["1"],
            },
            {
              leagueName: "Copa do Brasil",
              leagueImage: "/images/trophies/brasil/copaDoBrasil.png",
              seasons: ["1"],
            },
          ],
        }),
      );
    }
    put(`users/${uid}/careerGroups/g1`, {
      id: "g1",
      managerName: "Treinador Grupo",
      careerIds: ["c2", "c3"],
      createdAt: new Date("2024-07-01T00:00:00Z"),
    });
    for (let start = 0; start < documents.length; start += 400)
      await request(base + ":commit", {
        method: "POST",
        body: JSON.stringify({
          writes: documents.slice(start, start + 400).map((d) => ({
            update: {
              name: `projects/${project}/databases/(default)/documents/${d.path}`,
              fields: fields(d.data),
            },
          })),
        }),
      });
    const totals = {
      careers: 3,
      seasons: 3 * p.seasons,
      matches: 3 * p.seasons * p.matches,
      players: 3 * p.seasons * p.players,
      playerStats: 3 * p.seasons * p.matches * 11,
      academyPlayers: 3 * p.seasons * p.academy,
      academyTournaments: 6 * p.seasons,
      table: 6 * p.seasons,
      groups: 1,
      documents: documents.length,
    };
    const fixtureSha256 = createHash("sha256")
      .update(JSON.stringify(documents).replaceAll(uid, "FIXTURE_UID"))
      .digest("hex");
    manifest.push({ ...p, email, password, uid, totals, fixtureSha256 });
    console.log("Seeded", p.name, totals.documents);
  }
  mkdirSync(".test-tools/performance", { recursive: true });
  writeFileSync(
    ".test-tools/performance/fixtures.json",
    JSON.stringify(manifest, null, 2),
  );
  return manifest;
}
