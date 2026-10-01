// Loaded before Firebase CLI / Vitest / SDK. Only fixed emulator ports and the isolated static server.
const net = require('node:net');
const tls = require('node:tls');
const allowedPorts = new Set([8089, 9098, 4410, 4510, 4179, 4180]);
const allowedHosts = new Set(['127.0.0.1', 'localhost', '::1', '::ffff:127.0.0.1']);
const deny = () => { throw new Error('EXTERNAL_NETWORK_BLOCKED: emulator-only test process'); };
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...input) {
  const args = Array.isArray(input[0]) ? input[0] : input;
  const options = typeof args[0] === 'object' ? args[0] : { port: args[0], host: typeof args[1] === 'string' ? args[1] : 'localhost' };
  if (options.path || !allowedPorts.has(Number(options.port)) || !allowedHosts.has(options.host || 'localhost')) deny();
  return connect.apply(this, input);
};
tls.connect = deny;
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.protocol !== 'http:' || !allowedHosts.has(url.hostname) || !allowedPorts.has(Number(url.port))) deny();
  return originalFetch(input, init);
};
globalThis.__EMULATOR_NETWORK_GUARD__ = true;
