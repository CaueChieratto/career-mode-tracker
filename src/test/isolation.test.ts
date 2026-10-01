import { describe, expect, it } from 'vitest';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { statSync } from 'node:fs';
import { loadEnv } from 'vite';
import config, { resolveTestFirebaseId } from '../../vitest.config';
import { requireEmulators } from './emulatorGuard';
import { auth, db } from '../common/services/Firebase';
import { getDoc, setDoc } from './mocks/firestore';

describe('barreiras contra Firebase e rede reais', () => {
  it('busca de env aponta para arquivo regular, sem possibilidade de carregar .env.local', () => {
    const options = config as { envDir: string; envPrefix: string };
    expect(statSync(options.envDir).isFile()).toBe(true);
    expect(loadEnv('test', options.envDir, 'NONEXISTENT_TEST_PREFIX_')).toEqual({});
  });
  it('resolver recusa SDK Firebase real e entradas alternativas antes de carregar código', () => {
    for (const source of ['firebase/app', 'firebase/compat/app', '@firebase/firestore']) {
      expect(() => resolveTestFirebaseId(source)).toThrow('REAL_FIREBASE_BLOCKED');
    }
  });
  it('cliente de produção é substituído pelo projeto demo em memória', () => {
    expect(db).toEqual({ projectId: 'demo-career-tracker' });
    expect(auth.currentUser?.uid).toBe('test-user');
    expect(import.meta.env.VITE_FIREBASE_API_KEY).toBe('test-only-not-a-real-key');
  });
  it('operação Firebase sem resposta configurada falha fechada', () => {
    expect(() => getDoc({ path: 'unexpected' })).toThrow('UNCONFIGURED_FIRESTORE_OPERATION');
    expect(() => setDoc({ path: 'unexpected' }, {})).toThrow('UNCONFIGURED_FIRESTORE_OPERATION');
  });
  it('bloqueia fetch, HTTP, HTTPS, socket e WebSocket inclusive em localhost', () => {
    expect(() => fetch('https://firestore.googleapis.com')).toThrow('TEST_NETWORK_BLOCKED');
    expect(() => http.get('http://localhost:8080')).toThrow('TEST_NETWORK_BLOCKED');
    expect(() => https.request('https://example.invalid')).toThrow('TEST_NETWORK_BLOCKED');
    expect(() => new net.Socket().connect(8080, '127.0.0.1')).toThrow('TEST_NETWORK_BLOCKED');
    expect(() => new WebSocket('ws://localhost:8080')).toThrow('TEST_NETWORK_BLOCKED');
  });
  it.each([
    {},
    { GCLOUD_PROJECT: 'production' },
    { GCLOUD_PROJECT: 'demo-test' },
    { GCLOUD_PROJECT: 'demo-test', FIRESTORE_EMULATOR_HOST: 'remote.example:8080', FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099' },
    { GCLOUD_PROJECT: 'demo-test', FIRESTORE_EMULATOR_HOST: 'localhost:0', FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099' },
    { GCLOUD_PROJECT: 'demo-test', FIRESTORE_EMULATOR_HOST: 'localhost:8080', FIREBASE_AUTH_EMULATOR_HOST: 'localhost:99999' },
  ])('integração recusa ambiente ausente/inseguro (%#)', env => {
    expect(() => requireEmulators(env)).toThrow('EMULATOR_REQUIRED');
  });
  it('guard aceita apenas configuração explícita demo e loopback (não abre rede)', () => {
    expect(() => requireEmulators({ GCLOUD_PROJECT: 'demo-test', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '[::1]:9099' })).not.toThrow();
  });
});
