import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { db, auth } from "./firebase-client.js";
import {
  loadGuard,
  assertSafeEnvironment,
} from "../integration/protected-user-guard.cjs";

const project = "demo-career-tracker-integration";
const root = `http://127.0.0.1:8089/v1/projects/${project}/databases/(default)/documents`;

async function request(path, method = "GET", body = undefined) {
  const res = await fetch(`${root}/${path}`, {
    method,
    headers: {
      Authorization: "Bearer owner",
      "Content-Type": "application/json",
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host || host !== "127.0.0.1:8089") {
    console.error("ERRO: FIRESTORE_EMULATOR_HOST inválido ou ausente.");
    process.exit(1);
  }

  const projectEnv =
    process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectEnv || projectEnv !== "demo-career-tracker-integration") {
    console.error("ERRO: Project ID inválido ou ausente.");
    process.exit(1);
  }

  assertSafeEnvironment();

  const isDryRun = process.argv.includes("--dry-run");

  console.log(`Iniciando Migration 7B... (Dry Run: ${isDryRun})`);

  // Obter todos os usuários via REST API, fixtures.json e Auth emulator
  const uidsSet = new Set();
  try {
    const usersRes = await request("users?pageSize=1000");
    if (usersRes.documents) {
      for (const doc of usersRes.documents) {
        uidsSet.add(doc.name.split("/").pop());
      }
    }
  } catch {}

  try {
    const fixturesPath = resolve(".test-tools/performance/fixtures.json");
    if (existsSync(fixturesPath)) {
      const fixtures = JSON.parse(readFileSync(fixturesPath, "utf-8"));
      for (const f of fixtures) {
        if (f.uid) uidsSet.add(f.uid);
      }
    }
  } catch {}

  try {
    const authRes = await fetch(
      `http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/projects/${project}/accounts`,
    );
    if (authRes.ok) {
      const authData = await authRes.json();
      if (authData.users) {
        for (const u of authData.users) {
          if (u.localId) uidsSet.add(u.localId);
        }
      }
    }
  } catch {}

  let migratedMatches = 0;
  let alreadyMigrated = 0;

  for (const uid of uidsSet) {
    try {
      loadGuard().assertUid(uid);
    } catch (e) {
      if (e.message === "PROTECTED_USER_PATH") {
        console.log("Skipping protected UID");
        continue;
      }
      throw e;
    }

    // Autenticar como o usuário atual usando o backdoor do emulador
    await signInWithCustomToken(auth, JSON.stringify({ uid }));

    const userRef = doc(db, "users", uid);
    const careersSnap = await getDocs(collection(userRef, "careers"));

    for (const careerDoc of careersSnap.docs) {
      const seasonsSnap = await getDocs(collection(careerDoc.ref, "seasons"));
      for (const seasonDoc of seasonsSnap.docs) {
        const matchesSnap = await getDocs(collection(seasonDoc.ref, "matches"));
        await Promise.all(
          matchesSnap.docs.map(async (matchDoc) => {
            const matchData = matchDoc.data();
            if (matchData._playerStatsVersion === 1) {
              alreadyMigrated++;
              return;
            }

            const statsSnap = await getDocs(
              collection(matchDoc.ref, "playerStats"),
            );
            const statsMap = new Map();
            if (matchData.playerStats && Array.isArray(matchData.playerStats)) {
              for (const stat of matchData.playerStats) {
                statsMap.set(stat.playerId, stat);
              }
            }
            for (const statDoc of statsSnap.docs) {
              statsMap.set(statDoc.id, statDoc.data());
            }

            if (!isDryRun) {
              await updateDoc(matchDoc.ref, {
                playerStats: Array.from(statsMap.values()),
                _playerStatsVersion: 1,
              });
            }
            migratedMatches++;
          }),
        );
      }
    }
  }

  console.log(
    `Concluído. Migrados (ou seriam): ${migratedMatches}. Ignorados: ${alreadyMigrated}.`,
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erro:", err);
    process.exit(1);
  });
