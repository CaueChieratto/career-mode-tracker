import { assertSafeEnvironment, assertSafePath, loadGuard } from './protected-user-guard.cjs';

const root = 'http://127.0.0.1:8089/v1/projects/demo-career-tracker-integration/databases/(default)/documents/';
const fixtureUids = ['emulator-fixture-a', 'emulator-fixture-b'];

async function request(path: string, method: string, body?: object) {
  assertSafeEnvironment();
  assertSafePath(path);
  if (!fixtureUids.some(uid => path === `users/${uid}` || path.startsWith(`users/${uid}/`) || path.startsWith(`users/${uid}:`))) throw new Error('UNSCOPED_TEST_DELETE_BLOCKED');
  const response = await fetch(root + path, {
    method, headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error('FIXTURE_RESET_FAILED');
  return response.json();
}

async function clearDocument(path: string): Promise<void> {
  let pageToken: string | undefined;
  do {
    const page = await request(path + ':listCollectionIds', 'POST', { pageSize: 100, ...(pageToken ? { pageToken } : {}) });
    for (const collectionId of page.collectionIds || []) {
      let next: string | undefined;
      do {
        const children = await request(`${path}/${collectionId}?showMissing=true&pageSize=100${next ? '&pageToken=' + encodeURIComponent(next) : ''}`, 'GET');
        for (const child of children.documents || []) {
          const childPath = child.name.split('/documents/')[1];
          if (!childPath?.startsWith(path + '/')) throw new Error('UNSCOPED_TEST_DELETE_BLOCKED');
          await clearDocument(childPath);
        }
        next = children.nextPageToken;
      } while (next);
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  await request(path, 'DELETE');
}

export async function resetFixtureUsers() {
  assertSafeEnvironment();
  for (const uid of fixtureUids) {
    loadGuard().assertUid(uid);
    await clearDocument(`users/${uid}`);
  }
}
