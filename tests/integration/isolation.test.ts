import { expect, it } from 'vitest';
import { doc, getDocFromServer } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebaseClient';
import { careerPath, login, put, read, seedCareer, users } from './helpers';
import { ServiceSeasons } from '../../src/common/services/ServiceSeasons';
import { career } from '../../src/test/factories/domain';

it('persiste e relê no emulador com usuário autenticado', async () => {
  await seedCareer();
  expect(await read(careerPath())).toMatchObject({ id: 'c1', clubName: 'Clube' });
});
it('usuários A/B têm caminhos separados e regras de TESTE negam acesso cruzado', async () => {
  await seedCareer(); const pathA = careerPath();
  await login('b');
  await expect(getDocFromServer(doc(db, pathA))).rejects.toMatchObject({ code: 'permission-denied' });
  await put(careerPath(), { id: 'c1', clubName: 'Clube B' });
  expect(await read(careerPath())).toMatchObject({ clubName: 'Clube B' });
  await login('a');
  expect(auth.currentUser!.uid).toBe(users.a);
  expect(await read(pathA)).toMatchObject({ clubName: 'Clube' });
});
it('logout bloqueia serviço antes de gravar e SDK recebe permission-denied', async () => {
  await seedCareer(); const path = careerPath(); await signOut(auth);
  await expect(ServiceSeasons.addSeason(career())).rejects.toThrow('Usuário não autenticado');
  await expect(getDocFromServer(doc(db, path))).rejects.toMatchObject({ code: 'permission-denied' });
});
it('rede externa é recusada antes de abrir conexão', () => {
  expect(() => fetch('https://firestore.googleapis.com')).toThrow('EXTERNAL_NETWORK_BLOCKED');
});
