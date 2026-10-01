import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceCareerGroup } from '../pages/GroupCareerPage/services/ServiceCareerGroup';
import { getCareerById } from '../common/helpers/Getters';
import { auth } from './mocks/firebaseClient';
import { documentSnapshot, getDoc, updateDoc } from './mocks/firestore';
import { career } from './factories/domain';

vi.mock('../common/helpers/Getters', () => ({ getCareerById: vi.fn() }));
beforeEach(() => {
  auth.currentUser = { uid: 'test-user' };
  getDoc.mockReset().mockResolvedValue(documentSnapshot('group', { careerIds: ['c1'], managerName: 'Treinador', createdAt: '2024-07-01' }));
  updateDoc.mockReset().mockResolvedValue(undefined);
  vi.mocked(getCareerById).mockReset().mockResolvedValue(career());
});
describe('grupos', () => {
  it('carrega carreira e metadados sem escrita quando todos os IDs existem', async () => {
    expect(await ServiceCareerGroup.getById('group')).toMatchObject({ id: 'group', careerIds: ['c1'], careers: [career()] });
    expect(updateDoc).not.toHaveBeenCalled();
  });
  it('grupo inexistente retorna null', async () => {
    getDoc.mockResolvedValue(documentSnapshot('group', {}, false));
    expect(await ServiceCareerGroup.getById('group')).toBeNull();
  });
  it('grupo sem carreiras não hidrata nem escreve', async () => {
    getDoc.mockResolvedValue(documentSnapshot('group', { createdAt: '2024-07-01' }));
    expect(await ServiceCareerGroup.getById('group')).toMatchObject({ careers: [], careerIds: [] });
    expect(getCareerById).not.toHaveBeenCalled();
  });
  it('sem autenticação rejeita antes de consultar', async () => {
    auth.currentUser = null;
    await expect(ServiceCareerGroup.getById('group')).rejects.toThrow('Usuário não autenticado');
    expect(getDoc).not.toHaveBeenCalled();
  });
  it.each(['permission-denied', 'unavailable', 'deadline-exceeded', 'unexpected', 'Carreira não encontrada'])('[B09] propaga %s sem limpar IDs', async message => {
    const error = new Error(message);
    vi.mocked(getCareerById).mockRejectedValue(error);
    await expect(ServiceCareerGroup.getById('group')).rejects.toBe(error);
    expect(updateDoc).not.toHaveBeenCalled();
  });
  it('[B09] somente ausência comprovada permite limpeza', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(getCareerById).mockRejectedValue(Object.assign(new Error('missing'), { code: 'career/not-found' }));
    expect(await ServiceCareerGroup.getById('group')).toMatchObject({ careers: [] });
    expect(updateDoc).toHaveBeenCalledWith({ path: 'users/test-user/careerGroups/group' }, { careerIds: [] });
  });
  it('[B09] ausência apenas no cache não permite limpeza', async () => {
    const error = Object.assign(new Error('missing'), { code: 'career/unavailable' });
    vi.mocked(getCareerById).mockRejectedValue(error);
    await expect(ServiceCareerGroup.getById('group')).rejects.toBe(error);
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
