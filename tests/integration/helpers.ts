import { FirebaseError } from 'firebase/app';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { collection, doc, getDocFromServer, getDocsFromServer, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseClient';
import { boundary, type Operation } from './firestoreBoundary';
import { career, season } from '../../src/test/factories/domain';
import { assertSafeEnvironment, assertSafePath, loadGuard } from './protected-user-guard.cjs';
import { resetFixtureUsers } from './reset-fixtures';
import type { Career } from '../../src/common/interfaces/Career';

export const users = { a: '', b: '' };
export async function login(who: 'a' | 'b' = 'a') {
  assertSafeEnvironment();
  const uid = `emulator-fixture-${who}`;
  loadGuard().assertUid(uid);
  if (auth.currentUser?.uid === uid) { users[who] = uid; return uid; }
  await signOut(auth);
  // Strict JSON custom tokens are supported only by the Auth Emulator.
  const credential = await signInWithCustomToken(auth, JSON.stringify({ uid }));
  if (credential.user.uid !== uid) throw new Error('FIXTURE_UID_MISMATCH');
  users[who] = credential.user.uid;
  return credential.user.uid;
}
export const careerPath = (id = 'c1', uid = auth.currentUser!.uid) => `users/${uid}/careers/${id}`;
export const seasonPath = (id = 's1') => `${careerPath()}/seasons/${id}`;
export const matchPath = (id = 'm1') => `${seasonPath()}/matches/${id}`;
export const groupPath = () => `users/${auth.currentUser!.uid}/careerGroups/g1`;
export async function put(path: string, data: object) { assertSafePath(path); await setDoc(doc(db, path), data); }
export async function read(path: string) { const snapshot = await getDocFromServer(doc(db, path)); return snapshot.exists() ? snapshot.data() : undefined; }
export async function list<T extends object = Record<string, unknown>>(path: string): Promise<(T & { _documentId: string })[]> { return (await getDocsFromServer(collection(db, path))).docs.map(d => ({ ...d.data(), _documentId: d.id }) as T & { _documentId: string }); }
export async function seedCareer(input: Career = career({ clubData: [season()] })) { await put(careerPath(input.id), input); return input; }
export async function resetData() {
  assertSafeEnvironment();
  await resetFixtureUsers();
}

export function failOnce(operation: Operation, suffix: string, phase: 'before' | 'after' = 'before', code = 'unavailable') {
  let fired = false;
  boundary.hook = call => {
    if (!fired && call.operation === operation && call.path.endsWith(suffix) && call.phase === phase) { fired = true; throw new FirebaseError(code, `Injected ${operation} ${phase}: ${suffix}`); }
  };
}
export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}
