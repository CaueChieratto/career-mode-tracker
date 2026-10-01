const net = require("node:net");
const tls = require("node:tls");
const {
  loadGuard,
  assertSafeEnvironment,
} = require("./protected-user-guard.cjs");

const protection = loadGuard();
for (const uid of ["emulator-fixture-a", "emulator-fixture-b", "test-user"]) {
  protection.assertUid(uid);
}

// Canonical ports for emulator environment:
// 8089: Firestore
// 9098: Auth
// 5002: Functions
// 4410: Emulator Hub
// 4510: Logging
const allowedPorts = new Set([8089, 9098, 5002, 4410, 4510]);
const allowedHosts = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "::ffff:127.0.0.1",
]);

const deny = () => {
  throw new Error("EXTERNAL_NETWORK_BLOCKED: emulator-only test process");
};

const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...input) {
  const args = Array.isArray(input[0]) ? input[0] : input;
  const options =
    typeof args[0] === "object"
      ? args[0]
      : {
          port: args[0],
          host: typeof args[1] === "string" ? args[1] : "localhost",
        };

  const host = options.host || "localhost";
  if (!allowedHosts.has(host)) {
    deny();
  }

  // Inside test processes, strictly lock down to authorized ports
  if (process.env.VITEST === "true") {
    if (options.path || !allowedPorts.has(Number(options.port))) {
      deny();
    }
  }

  return connect.apply(this, input);
};

tls.connect = function (...input) {
  deny();
};

const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );

  if (
    url.protocol !== "http:" ||
    !allowedHosts.has(url.hostname) ||
    !allowedPorts.has(Number(url.port || 80))
  ) {
    if (process.env.VITEST !== "true") {
      return Promise.reject(new Error("fetch failed ECONNREFUSED"));
    }
    deny();
  }

  try {
    assertSafeEnvironment();
    protection.assertPath(url.pathname);
    if (typeof init?.body === "string") protection.assertRequestText(init.body);
    if (init?.method === "DELETE" && url.pathname.endsWith("/documents")) {
      throw new Error("UNSCOPED_TEST_DELETE_BLOCKED");
    }
  } catch (err) {
    return Promise.reject(err);
  }

  return originalFetch(input, init);
};

globalThis.__EMULATOR_NETWORK_GUARD__ = true;
assertSafeEnvironment();
