import { afterEach, beforeEach, vi } from 'vitest';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import { loadGuard } from '../../tests/integration/protected-user-guard.cjs';
loadGuard().assertUid('test-user');

const blocked = (): never => { throw new Error('TEST_NETWORK_BLOCKED: tests must use explicit in-memory mocks'); };

const blockNetwork = () => {
  // All network is blocked in this suite, including localhost. No emulator fallback.
  vi.stubGlobal('fetch', vi.fn(blocked));
  vi.stubGlobal('WebSocket', class { constructor() { blocked(); } });
  vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(blocked);
  vi.spyOn(tls, 'connect').mockImplementation(blocked);
  vi.spyOn(http, 'request').mockImplementation(blocked);
  vi.spyOn(http, 'get').mockImplementation(blocked);
  vi.spyOn(https, 'request').mockImplementation(blocked);
  vi.spyOn(https, 'get').mockImplementation(blocked);
  if (typeof XMLHttpRequest !== 'undefined') {
    vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(blocked);
  }
};

// Also guard module evaluation, before any test body or beforeEach runs.
blockNetwork();
beforeEach(blockNetwork);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
