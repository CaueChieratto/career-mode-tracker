import { expect, it, vi } from 'vitest';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db, projectId } from './firebaseClient';
import { boundary } from './firestoreBoundary';
import { ServiceCareerGroup } from '../../src/pages/GroupCareerPage/services/ServiceCareerGroup';
import { career } from '../../src/test/factories/domain';
import { careerPath, failOnce, groupPath, put, read, seedCareer } from './helpers';

async function group(ids: string[]) { await put(groupPath(), { careerIds: ids, managerName: 'Treinador', createdAt: new Date('2024-07-01') }); }
it('grupo com várias carreiras válidas conserva IDs e não grava limpeza', async () => {
  await seedCareer(); await seedCareer(career({ id: 'c2' })); await group(['c1', 'c2']);
  const result = await ServiceCareerGroup.getById('g1');
  expect(result!.careers.map(c => c.id)).toEqual(['c1', 'c2']);
  expect(await read(groupPath())).toMatchObject({ careerIds: ['c1', 'c2'] });
});
it('[B09] grupo parcialmente válido limpa carreira inexistente e retorna lista antiga de IDs', async () => {
  await seedCareer(); await group(['c1', 'missing']); vi.spyOn(console, 'warn').mockImplementation(() => {});
  const result = await ServiceCareerGroup.getById('g1');
  expect(result!.careers).toHaveLength(1); expect(result!.careerIds).toEqual(['c1', 'missing']);
  expect(await read(groupPath())).toMatchObject({ careerIds: ['c1'] });
});
it('[B09] permission-denied REAL preserva o grupo parcialmente válido', async () => {
  await seedCareer(); await group(['c1', 'denied']);
  await expect(ServiceCareerGroup.getById('g1')).rejects.toMatchObject({ code: 'permission-denied' });
  expect(await read(groupPath())).toMatchObject({ careerIds: ['c1', 'denied'] });
  expect(boundary.calls.some(c => c.operation === 'updateDoc')).toBe(false);
});
it.each(['unavailable', 'deadline-exceeded'])('[B09] falha de transporte %s preserva IDs e propaga erro', async code => {
  await seedCareer(); await group(['c1']); failOnce('getDoc', '/careers/c1', 'before', code);
  await expect(ServiceCareerGroup.getById('g1')).rejects.toMatchObject({ code });
  expect(await read(careerPath())).toBeDefined();
  expect(await read(groupPath())).toMatchObject({ careerIds: ['c1'] });
  expect(boundary.calls.some(c => c.operation === 'updateDoc')).toBe(false);
});
it('[B09] erro inesperado com carreira válida e inexistente não permite limpeza parcial', async () => {
  await seedCareer(); await seedCareer(career({ id: 'c2' })); await group(['c1', 'missing', 'c2']);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const error = new Error('Injected unexpected failure');
  boundary.hook = c => { if (c.operation === 'getDoc' && c.path === careerPath('c2')) throw error; };
  await expect(ServiceCareerGroup.getById('g1')).rejects.toBe(error);
  expect(await read(groupPath())).toMatchObject({ careerIds: ['c1', 'missing', 'c2'] });
  expect(boundary.calls.some(c => c.operation === 'updateDoc')).toBe(false);
});
it('[B09] falha da limpeza preserva IDs persistidos; resposta omite apenas carreira inexistente', async () => {
  await seedCareer(); await group(['c1', 'missing']); vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {}); failOnce('updateDoc', '/careerGroups/g1');
  const result = await ServiceCareerGroup.getById('g1'); expect(result!.careers).toHaveLength(1);
  expect(await read(groupPath())).toMatchObject({ careerIds: ['c1', 'missing'] });
});
it('erro de rede antes de ler grupo rejeita e não altera seus membros', async () => {
  await seedCareer(); await group(['c1']); failOnce('getDoc', '/careerGroups/g1');
  await expect(ServiceCareerGroup.getById('g1')).rejects.toMatchObject({ code: 'unavailable' });
  expect(await read(groupPath())).toMatchObject({ careerIds: ['c1'] });
});
it('[B09] indisponibilidade REAL do SDK preserva membro após reconectar', async () => {
  // REST seed bypasses only the emulator's test rules and does not fill SDK cache.
  const id = 'uncached-network-career';
  const response = await fetch(`http://127.0.0.1:8089/v1/projects/${projectId}/databases/(default)/documents/${careerPath(id)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: { id: { stringValue: id }, clubName: { stringValue: 'Clube' }, createdAt: { timestampValue: '2024-07-01T00:00:00Z' }, clubData: { arrayValue: { values: [] } } } }),
  });
  expect(response.ok).toBe(true);
  await group([id]);
  await disableNetwork(db);
  try { await expect(ServiceCareerGroup.getById('g1')).rejects.toMatchObject({ code: 'unavailable' }); }
  finally { await enableNetwork(db); }
  expect(boundary.calls.some(c => c.operation === 'updateDoc')).toBe(false);
  expect(await read(careerPath(id))).toMatchObject({ id });
  expect(await read(groupPath())).toMatchObject({ careerIds: [id] });
});
