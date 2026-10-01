const { test } = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const tls = require("node:tls");

// Ensure environment is set up so network-guard initializes properly
process.env.GCLOUD_PROJECT = "demo-career-tracker-integration";
process.env.GOOGLE_CLOUD_PROJECT = "demo-career-tracker-integration";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8089";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9098";
process.env.TEST_EMULATOR_ENABLED = "1";
process.env.VITEST = "true";

require("./network-guard.cjs");

test("BLOQUEADO: firestore.googleapis.com via fetch", () => {
  assert.throws(
    () => fetch("https://firestore.googleapis.com/v1/projects"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
});

test("BLOQUEADO: googleapis.com externo via fetch", () => {
  assert.throws(
    () => fetch("https://identitytoolkit.googleapis.com/v1/accounts"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
});

test("BLOQUEADO: endereço HTTPS externo genérico via fetch", () => {
  assert.throws(
    () => fetch("https://example.com/api"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
});

test("BLOQUEADO: host não-local via fetch", () => {
  assert.throws(
    () => fetch("http://192.168.1.1:8089/test"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
  assert.throws(
    () => fetch("http://169.254.169.254/computeMetadata/v1/"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
});

test("BLOQUEADO: porta local não autorizada via fetch", () => {
  assert.throws(
    () => fetch("http://127.0.0.1:9999/test"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
  assert.throws(
    () => fetch("http://127.0.0.1:8080/test"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
});

test("BLOQUEADO: qualquer chamada via tls.connect", () => {
  assert.throws(
    () => tls.connect(443, "firestore.googleapis.com"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
  assert.throws(
    () => tls.connect(443, "127.0.0.1"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
});

test("BLOQUEADO: host não-local via net.Socket.prototype.connect", () => {
  const socket = new net.Socket();
  assert.throws(
    () => socket.connect(80, "google.com"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
  assert.throws(
    () => socket.connect(80, "169.254.169.254"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
});

test("BLOQUEADO: porta local não autorizada via net.Socket.prototype.connect", () => {
  const socket = new net.Socket();
  assert.throws(
    () => socket.connect(9999, "127.0.0.1"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
  assert.throws(
    () => socket.connect(8080, "127.0.0.1"),
    /EXTERNAL_NETWORK_BLOCKED/,
  );
});

test("PERMITIDO: portas canônicas em 127.0.0.1 não lançam EXTERNAL_NETWORK_BLOCKED", () => {
  const canonicalPorts = [8089, 9098, 5002, 4410, 4510];

  for (const port of canonicalPorts) {
    const socket = new net.Socket();
    let blocked = false;
    try {
      socket.connect(port, "127.0.0.1");
    } catch (err) {
      if (err.message.includes("EXTERNAL_NETWORK_BLOCKED")) {
        blocked = true;
      }
    } finally {
      socket.destroy();
    }
    assert.equal(blocked, false, `Port ${port} should be allowed by guard`);
  }
});
