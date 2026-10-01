const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGuard, parseGuard, loadGuard } = require('./protected-user-guard.cjs');
const guard = createGuard('synthetic-protected-for-guard-test');
const env = { GCLOUD_PROJECT: 'demo-career-tracker-integration', GOOGLE_CLOUD_PROJECT: 'demo-career-tracker-integration', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8089', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9098', TEST_EMULATOR_ENABLED: '1' };
for (const key of Object.keys(env)) {
  test(`missing ${key} aborts before SDK`, () => {
    let called = false;
    assert.throws(() => { guard.assertEnvironment({ ...env, [key]: undefined }, true); called = true; }, /GUARD_REQUIRED/);
    assert.equal(called, false);
  });
  test(`wrong ${key} aborts`, () => assert.throws(() => guard.assertEnvironment({ ...env, [key]: 'wrong' }, true), /GUARD_REQUIRED/));
}
test('preload missing aborts', () => assert.throws(() => guard.assertEnvironment(env, false), /GUARD_REQUIRED/));
test('guard missing or empty aborts', () => {
  for (const read of [() => { throw Error(); }, () => '', () => 'PROTECTED_USER_UID=']) assert.throws(() => parseGuard(read), /TEST_GUARD_REQUIRED/);
});
test('protected user and descendants abort before SDK without disclosing UID', () => {
  for (const suffix of ['', '/careers/c1/seasons/s1']) {
    let called = false;
    assert.throws(() => { guard.assertEnvironment(env, true); guard.assertPath('users/synthetic-protected-for-guard-test' + suffix); called = true; }, { message: 'PROTECTED_USER_PATH' });
    assert.equal(called, false);
  }
});
test('different synthetic UID allowed', () => {
  guard.assertEnvironment(env, true); guard.assertUid('emulator-fixture-a'); guard.assertPath('users/emulator-fixture-a/careers/c1');
});
test('local guard exists; all predetermined fixture UIDs are permitted', () => {
  const local = loadGuard();
  for (const uid of ['emulator-fixture-a', 'emulator-fixture-b', 'test-user']) local.assertUid(uid);
});
