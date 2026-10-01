import { expect, it } from 'vitest';
import { collectionGroup, deleteDoc, doc, documentId, getDocsFromServer, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebaseClient';
import { careerPath, list, matchPath, put, read, seasonPath, seedCareer } from './helpers';

it('[B12] perder documento e ID da temporada oculta o pai, mas preserva descendente no servidor', async () => {
  await seedCareer();
  await put(seasonPath(), { id: 's1' });
  const child = seasonPath() + '/players/p1';
  await put(child, { id: 'p1', marker: 'recoverable-by-known-path' });
  expect((await list(careerPath() + '/seasons')).map(d => d._documentId)).toEqual(['s1']);
  await deleteDoc(doc(db, seasonPath()));
  await updateDoc(doc(db, careerPath()), { clubData: [] });
  expect(await read(seasonPath())).toBeUndefined();
  expect(await read(careerPath())).toMatchObject({ clubData: [] });
  expect(await list(careerPath() + '/seasons')).toEqual([]);
  expect(await read(child)).toEqual({ id: 'p1', marker: 'recoverable-by-known-path' });
  // This query deliberately knows s1: it proves reachability, not discovery.
  expect((await list(seasonPath() + '/players')).map(d => d._documentId)).toEqual(['p1']);
});

it('[B12] ID nos metadados permite enumerar filhos mesmo sem documento da temporada', async () => {
  await seedCareer();
  await put(seasonPath() + '/academyPlayers/a1', { id: 'a1' });
  expect(await read(seasonPath())).toBeUndefined();
  expect(await list(careerPath() + '/seasons')).toEqual([]);
  const stored = (await read(careerPath()))!;
  const discovered: string[] = [];
  for (const season of stored.clubData) {
    const children = await list(`${careerPath()}/seasons/${season.id}/academyPlayers`);
    discovered.push(...children.map(d => d._documentId));
  }
  expect(discovered).toEqual(['a1']);
});

it('[B12] stats sobrevivem à perda da partida e desaparecem da enumeração de matches', async () => {
  await seedCareer();
  await put(matchPath(), { id: 'm1' });
  await put(matchPath() + '/playerStats/p1', { id: 'p1', goals: 2 });
  await deleteDoc(doc(db, matchPath()));
  expect(await list(seasonPath() + '/matches')).toEqual([]);
  expect(await read(matchPath())).toBeUndefined();
  expect(await read(matchPath() + '/playerStats/p1')).toEqual({ id: 'p1', goals: 2 });
});

it('[B12] regras sintéticas atuais recusam consulta de grupo mesmo limitada por caminho', async () => {
  await seedCareer();
  await put(seasonPath('orphan') + '/players/p1', { id: 'p1' });
  await put(careerPath('c10') + '/seasons/orphan/players/p2', { id: 'p2' });
  const attempt = getDocsFromServer(query(collectionGroup(db, 'players'),
    where(documentId(), '>=', doc(db, careerPath())),
    where(documentId(), '<', doc(db, careerPath() + '\u0000')),
  ));
  await expect(attempt).rejects.toMatchObject({ code: 'permission-denied' });
});
