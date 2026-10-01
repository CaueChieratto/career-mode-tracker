import { expect, it } from "vitest";
import type { Match } from "../../src/common/interfaces/Match";
import type { TableTeamData } from "../../src/common/interfaces/TableTeamData";
import { ServiceMatches } from "../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { career, match, season } from "../../src/test/factories/domain";
import { boundary } from "./firestoreBoundary";
import { list, matchPath, put, read, seedCareer, seasonPath } from "./helpers";

const league = { name: "Liga", trophy: "", logo: "", league: true };

const tableRow = (id: string, name: string): TableTeamData => ({
  id,
  name,
  badge: "",
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  points: 0,
});

const seedFinishedSeason = async (extraMatches = 0, extraRows = 0) => {
  const currentSeason = season({
    leagues: [league],
    teams: [
      { name: "Clube", badge: "" },
      { name: "Rival", badge: "" },
    ],
  });
  await seedCareer(career({ clubData: [currentSeason] }));
  const persisted = match({
    status: "FINISHED",
    homeScore: 2,
    awayScore: 1,
    result: "V",
  });
  await put(matchPath(), persisted);
  await put(seasonPath() + "/table/club", tableRow("club", "Clube"));
  await put(seasonPath() + "/table/rival", tableRow("rival", "Rival"));

  for (let index = 0; index < extraMatches; index++) {
    await put(
      matchPath(`extra-match-${index}`),
      match({
        matchesId: `extra-match-${index}`,
        status: "SCHEDULED",
        homeTeam: `Extra ${index}`,
      }),
    );
  }
  for (let index = 0; index < extraRows; index++) {
    await put(
      seasonPath() + `/table/extra-row-${index}`,
      tableRow(`extra-row-${index}`, `Extra ${index}`),
    );
  }

  boundary.calls = [];
  return persisted;
};

it("update sem impacto usa uma leitura constante e nao enumera colecoes", async () => {
  const persisted = await seedFinishedSeason(12, 8);
  const updated: Match = {
    ...persisted,
    opponentMvpName: "Adversario",
    opponentMvpRating: 8,
    homePossession: 60,
    awayPossession: 40,
  };

  await ServiceMatches.updateMatchInSeason("c1", "s1", updated);

  const reads = boundary.calls.filter(
    ({ phase, operation }) => phase === "before" && operation.startsWith("get"),
  );
  expect(reads.filter(({ operation }) => operation === "getDocs")).toEqual([]);
  expect(reads.filter(({ operation }) => operation === "getDoc")).toHaveLength(1);
  expect(await read(matchPath())).toMatchObject({
    opponentMvpName: "Adversario",
    homePossession: 60,
  });
  expect(await list(seasonPath() + "/table")).toHaveLength(10);
});

it("mudanca de placar ainda reconcilia e mantem a classificacao correta", async () => {
  const persisted = await seedFinishedSeason(2, 2);

  await ServiceMatches.updateMatchInSeason("c1", "s1", {
    ...persisted,
    homeScore: 0,
    awayScore: 3,
    result: "D",
  });

  const queryReads = boundary.calls.filter(
    ({ phase, operation }) => phase === "before" && operation === "getDocs",
  );
  expect(queryReads).toHaveLength(2);
  expect(await read(seasonPath() + "/table/club")).toMatchObject({
    played: 1,
    won: 0,
    drawn: 0,
    lost: 1,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 3,
    goalDiff: -3,
  });
  expect(await read(seasonPath() + "/table/rival")).toMatchObject({
    played: 1,
    won: 1,
    points: 3,
    goalsFor: 3,
    goalsAgainst: 0,
    goalDiff: 3,
  });
});
