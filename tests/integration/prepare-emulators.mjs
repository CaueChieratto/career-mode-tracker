// Download-only preparation. Not a test runner; never loads Firebase credentials.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const infoPath = path.join(root, 'tests/emulator-tools/node_modules/firebase-tools/lib/emulator/downloadableEmulatorInfo.json');
if (!existsSync(infoPath)) throw new Error('Run npm ci --prefix tests/emulator-tools');
const info = JSON.parse(readFileSync(infoPath)).firestore;
if (!info.remoteUrl.startsWith('https://storage.googleapis.com/firebase-preview-drop/emulator/')) throw new Error('UNEXPECTED_EMULATOR_DOWNLOAD_URL');
const dir = path.join(root, '.test-tools/emulators'); mkdirSync(dir, { recursive: true });
const target = path.join(dir, path.basename(info.downloadPathRelativeToCacheDir));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (!existsSync(target) || hash(readFileSync(target)) !== info.expectedChecksumSHA256) {
  const response = await fetch(info.remoteUrl, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`EMULATOR_DOWNLOAD_FAILED:${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== info.expectedChecksumSHA256) throw new Error('EMULATOR_CHECKSUM_MISMATCH');
  writeFileSync(target, bytes);
}
console.log(`Verified Firestore Emulator ${info.version}. Java 21+ must be on PATH or in .test-tools/java/<jre>/bin.`);
