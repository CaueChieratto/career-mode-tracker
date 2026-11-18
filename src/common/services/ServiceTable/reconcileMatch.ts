import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocsFromServer,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { DocumentReference } from "firebase/firestore";
import { auth, db } from "../Firebase";
import { Career } from "../../interfaces/Career";
import { Match } from "../../interfaces/Match";
import { TableTeamData } from "../../interfaces/TableTeamData";
import { contributesToLeagueStandings } from "../../utils/league";
import { calculateMatchResult } from "./helpers/calculateMatchResult";
import { getUpdatedTableTeamData } from "./helpers/calculateTableStats";
import { hasStandingsImpact } from "./hasStandingsImpact";
import {
  isQuotaExceededActive,
  isQuotaExceededError,
  markQuotaExceeded,
  withFirestoreRetry,
} from "../../utils/firestoreRetry";
import { updateCareerFirestore } from "../../helpers/Setters";

export { isQuotaExceededError, isQuotaExceededActive, markQuotaExceeded };

const reconcileMatchDirectly = async (
  userUid: string,
  careerId: string,
  seasonId: string,
  matchId: string,
  update?: Match,
  removePenalties = false,
  dependentRefs: DocumentReference[] = [],
): Promise<void> => {
  const careerRef = doc(db, `users/${userUid}/careers/${careerId}`);
  const matchRef = doc(
    db,
    `${careerRef.path}/seasons/${seasonId}/matches/${matchId}`,
  );

  if (update) {
    const next = { ...update, matchesId: matchId };
    if (removePenalties) {
      delete next.homePenScore;
      delete next.awayPenScore;
    }
    const cleanedPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(next)) {
      if (value !== undefined) {
        cleanedPayload[key] = value;
      }
    }
    if (removePenalties) {
      cleanedPayload.homePenScore = deleteField();
      cleanedPayload.awayPenScore = deleteField();
    }
    await setDoc(matchRef, cleanedPayload, { merge: true });
  } else {
    await deleteDoc(matchRef);
  }
  for (const dependentRef of dependentRefs) {
    try {
      await deleteDoc(dependentRef);
    } catch {
      // ignore
    }
  }
  try {
    await updateCareerFirestore(userUid, careerId, {
      updatedAt: Date.now(),
    });
  } catch {
    try {
      await updateDoc(careerRef, { updatedAt: Date.now() });
    } catch {
      // ignore
    }
  }
};

// The career document serializes result writes, including new rows/matches that
// collection enumeration alone cannot lock. All document reads precede writes.
// Retry reloads membership and values; unrelated standings rows stay untouched.
export async function reconcileMatch(
  careerId: string,
  seasonId: string,
  matchId: string,
  update?: Match,
  removePenalties = false,
  dependentRefs: DocumentReference[] = [],
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");

  // Se o circuit breaker de quota estiver ativo, salva diretamente sem passar por runTransaction
  // para evitar chamadas de rede que geram 429 no console do navegador.
  if (isQuotaExceededActive()) {
    return await reconcileMatchDirectly(
      user.uid,
      careerId,
      seasonId,
      matchId,
      update,
      removePenalties,
      dependentRefs,
    );
  }

  const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
  const base = `${careerRef.path}/seasons/${seasonId}`;
  const matchRef = doc(db, `${base}/matches/${matchId}`);
  try {
    await withFirestoreRetry(
      () =>
        runTransaction(
          db,
          async (transaction) => {
            const previous = (await transaction.get(matchRef)).data() as
              | Match
              | undefined;
            const next = update
              ? { ...previous, ...update, matchesId: matchId }
              : undefined;
            if (next) {
              if (removePenalties) {
                delete next.homePenScore;
                delete next.awayPenScore;
              }
              for (const key of Object.keys(next)) {
                if ((next as Record<string, unknown>)[key] === undefined) {
                  delete (next as Record<string, unknown>)[key];
                }
              }
            }
            const standingsChanged = hasStandingsImpact(previous, next);
            let career: Career | undefined;
            let season: Career["clubData"][number] | undefined;
            if (standingsChanged) {
              const careerSnap = await transaction.get(careerRef);
              if (!careerSnap.exists()) throw new Error("Carreira não encontrada");
              career = careerSnap.data() as Career;
              season = career.clubData.find((item) => item.id === seasonId);
            }
            const contributes = (match?: Match): match is Match => {
              if (!match || match.status !== "FINISHED") return false;
              return contributesToLeagueStandings(match.league, season?.leagues);
            };
            const affected = new Set(
              standingsChanged
                ? [previous, next]
                    .filter(contributes)
                    .flatMap((m) => [m.homeTeam, m.awayTeam])
                : [],
            );
            if (affected.size) {
              const tableRef = collection(db, `${base}/table`);
              const matchesSnap = await getDocsFromServer(
                collection(db, `${base}/matches`),
              );
              const tableSnap = await getDocsFromServer(tableRef);
              const matches = new Map(
                matchesSnap.docs
                  .filter((d) => d.id !== matchId)
                  .map((d) => [d.id, d.data() as Match]),
              );
              if (previous) matches.set(matchId, previous);
              if (next) matches.set(matchId, next);
              else matches.delete(matchId);
              const existing = tableSnap.docs.map(
                (d) => ({ ...d.data(), id: d.id }) as TableTeamData,
              );
              const normalized = (name: string) => name.trim().toLowerCase();
              const findRow = (name: string) => {
                const exact = existing.filter((row) => row.name === name);
                const candidates = exact.length
                  ? exact
                  : existing.filter((row) => normalized(row.name) === normalized(name));
                if (candidates.length > 1)
                  throw new Error("Identidade da equipe ambígua na classificação");
                return candidates[0];
              };
              const rows = new Map<string, TableTeamData>();
              for (const name of affected) {
                const old = findRow(name);
                const id = old?.id || doc(tableRef).id;
                rows.set(id, {
                  ...old,
                  id,
                  name: old?.name || name,
                  badge:
                    old?.badge ||
                    season?.teams?.find((t) => t.name === name)?.badge ||
                    (name === career?.clubName ? career?.teamBadge : "") ||
                    "",
                  played: 0,
                  won: 0,
                  drawn: 0,
                  lost: 0,
                  goalsFor: 0,
                  goalsAgainst: 0,
                  goalDiff: 0,
                  points: 0,
                });
              }
              for (const match of matches.values()) {
                if (!contributes(match)) continue;
                const home = match.homeScore || 0,
                  away = match.awayScore || 0;
                const result = calculateMatchResult(
                  home,
                  away,
                  true,
                  match.homePenScore !== undefined && match.awayPenScore !== undefined,
                  match.homePenScore || 0,
                  match.awayPenScore || 0,
                );
                const counted = new Set<string>();
                for (const [name, gf, ga, outcome] of [
                  [match.homeTeam, home, away, result],
                  [
                    match.awayTeam,
                    away,
                    home,
                    result === "V" ? "D" : result === "D" ? "V" : "E",
                  ],
                ] as const) {
                  const old = findRow(name);
                  const row = old
                    ? rows.get(old.id)
                    : [...rows.values()].find((r) => r.name === name);
                  if (row) {
                    if (counted.has(row.id))
                      throw new Error("A partida associa os dois lados à mesma equipe");
                    counted.add(row.id);
                    Object.assign(row, getUpdatedTableTeamData(row, gf, ga, outcome));
                  }
                }
              }
              for (const row of rows.values())
                transaction.set(doc(tableRef, row.id), row, { merge: true });
            }
            if (next)
              transaction.set(
                matchRef,
                {
                  ...next,
                  ...(removePenalties
                    ? { homePenScore: deleteField(), awayPenScore: deleteField() }
                    : {}),
                },
                { merge: true },
              );
            else transaction.delete(matchRef);
            for (const dependentRef of dependentRefs) {
              transaction.delete(dependentRef);
            }
            transaction.update(careerRef, {
              updatedAt: career
                ? Math.max(Date.now(), (career.updatedAt || 0) + 1)
                : Date.now(),
            });
          },
          { maxAttempts: 1 },
        ),
      1,
      200,
      (err) => !isQuotaExceededError(err),
    );
  } catch (error: unknown) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      console.warn(
        "Firestore quota exceeded during match reconciliation; falling back to direct write.",
        error,
      );
      return await reconcileMatchDirectly(
        user.uid,
        careerId,
        seasonId,
        matchId,
        update,
        removePenalties,
        dependentRefs,
      );
    }
    throw error;
  }
}
