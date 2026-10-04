// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FormSegmentedControl from '../components/FormSegmentedControl';
import { getMatchFormFields } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/constants/MatchFormFields';
import { buildMatchData } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/helpers/buildMatchData';
import { useMatchActions } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/hooks/useMatchActions';
import { useAddMatchesContext } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/contexts/context';
import { ServiceMatches } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches';
import { ServiceCareer } from '../common/services/ServiceCareer';
import { useAddDetails } from '../pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/useAddDetails';
import { career, season, match } from './factories/domain';
import { formatKnockoutStage } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/components/MatchCard/helpers/buildCopyText/helpers/formatKnockoutStage';
import type { Field } from '../components/FormSection';

vi.mock('../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/contexts/context', () => ({
  useAddMatchesContext: vi.fn(),
}));

vi.mock('../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches', () => ({
  ServiceMatches: {
    addMatchToSeason: vi.fn().mockResolvedValue(undefined),
    updateMatchInSeason: vi.fn().mockResolvedValue(undefined),
    addTeamToSeason: vi.fn().mockResolvedValue(undefined),
    updateSeasonTeams: vi.fn().mockResolvedValue(undefined),
    saveStadium: vi.fn().mockResolvedValue(undefined),
    getStadiumsByCareerOrGroup: vi.fn().mockResolvedValue([]),
    getAllTeamsAcrossUserCareers: vi.fn().mockResolvedValue([]),
    findTeamAcrossUserCareers: vi.fn().mockResolvedValue(null),
    updateMatchDetailsInSeason: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../common/services/ServiceCareer', () => ({
  ServiceCareer: {
    saveClubTrophies: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/helpers/buildTeamData', () => ({
  buildTeamData: vi.fn(),
}));

afterEach(cleanup);

describe('FormSegmentedControl com suporte multi-opções', () => {
  it('renderiza opções personalizadas Casa, Neutro e Fora e responde a cliques', () => {
    const handleOptionChange = vi.fn();
    render(
      <FormSegmentedControl
        name="matchVenue"
        clubColor="#007bff"
        options={['Casa', 'Neutro', 'Fora']}
        value="Casa"
        onOptionChange={handleOptionChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Casa' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Neutro' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Fora' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Neutro' }));
    expect(handleOptionChange).toHaveBeenCalledWith('Neutro');

    fireEvent.click(screen.getByRole('button', { name: 'Fora' }));
    expect(handleOptionChange).toHaveBeenCalledWith('Fora');
  });

  it('mantém retrocompatibilidade binária Não / Sim quando nenhuma opção é fornecida', () => {
    const handleChange = vi.fn();
    render(
      <FormSegmentedControl
        name="isKnockout"
        clubColor="#007bff"
        value={false}
        onChange={handleChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Não' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sim' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));
    expect(handleChange).toHaveBeenCalledWith(true);
  });
});

describe('getMatchFormFields', () => {
  it('gera campo Mandante e não exibe Estádio se venue for Casa', () => {
    const sections = getMatchFormFields(
      ['Liga Argentina'],
      'Tudo',
      ['Boca Juniors'],
      ['La Bombonera'],
      ['Final'],
      'Casa',
      false,
    );

    const scheduleSection = sections.find((s) => s.title === 'Agendar partida');
    expect(scheduleSection).toBeDefined();
    const allFields = scheduleSection!.fields.flat();

    const mandanteField = allFields.find((f) => f.id === 'matchVenue');
    expect(mandanteField).toBeDefined();
    expect(mandanteField?.name).toBe('Mandante');
    expect(mandanteField?.options).toEqual(['Casa', 'Neutro', 'Fora']);

    const stadiumField = allFields.find((f) => f.id === 'stadium');
    expect(stadiumField).toBeUndefined();

    const knockoutField = allFields.find((f) => f.id === 'isKnockout');
    expect(knockoutField).toBeDefined();
    expect(knockoutField?.name).toBe('É eliminatório?');

    const stageField = allFields.find((f) => f.id === 'stage');
    expect(stageField).toBeUndefined();
  });

  it('exibe Estádio e Mandante oficial quando venue for Neutro', () => {
    const sections = getMatchFormFields(
      ['Liga Argentina'],
      'Tudo',
      ['Boca Juniors'],
      ['Estadio Monumental', 'La Bombonera'],
      ['Final'],
      'Neutro',
      false,
    );

    const scheduleSection = sections.find((s) => s.title === 'Agendar partida');
    const allFields = scheduleSection!.fields.flat();

    const neutralHostField = allFields.find((f) => f.id === 'neutralHost');
    expect(neutralHostField).toBeDefined();
    expect(neutralHostField?.name).toBe('Mandante oficial');
    expect(neutralHostField?.options).toEqual(['Meu clube', 'Adversário']);

    const stadiumField = allFields.find((f) => f.id === 'stadium');
    expect(stadiumField).toBeDefined();
    expect(stadiumField?.name).toBe('Estádio');
    expect(stadiumField?.options).toEqual(['Estadio Monumental', 'La Bombonera']);
  });

  it('exibe Fase quando isKnockout for true', () => {
    const sections = getMatchFormFields(
      ['Liga Argentina'],
      'Tudo',
      ['Boca Juniors'],
      [],
      ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'],
      'Casa',
      true,
    );

    const scheduleSection = sections.find((s) => s.title === 'Agendar partida');
    const allFields = scheduleSection!.fields.flat();

    const stageField = allFields.find((f) => f.id === 'stage');
    expect(stageField).toBeDefined();
    expect(stageField?.name).toBe('Fase');
    expect(stageField?.options).toEqual([
      'Oitavas de Final',
      'Quartas de Final',
      'Semifinal',
      'Final',
    ]);

    const returnMatchField = allFields.find((f) => f.id === 'isReturnMatch');
    expect(returnMatchField).toBeUndefined();
  });

  it('exibe É jogo de volta? quando showReturnMatch for true', () => {
    const sections = getMatchFormFields(
      ['Champions League'],
      'Tudo',
      ['Arsenal'],
      [],
      ['Semifinal'],
      'Fora',
      true,
      true,
    );

    const scheduleSection = sections.find((s) => s.title === 'Agendar partida');
    const allFields = scheduleSection!.fields.flat();

    const returnMatchField = allFields.find((f) => f.id === 'isReturnMatch');
    expect(returnMatchField).toBeDefined();
    expect(returnMatchField?.name).toBe('É jogo de volta?');
    expect(returnMatchField?.checkbox).toBe(true);
  });
});

describe('buildMatchData', () => {
  const dummyCareer = career({ clubName: 'Meu Clube' });
  const dummySeason = season();

  it('define homeTeam e awayTeam corretamente para Casa', () => {
    const result = buildMatchData({
      date: '10/05',
      league: 'Torneo Apertura',
      opponentTeam: 'River Plate',
      matchVenue: 'Casa',
      career: dummyCareer,
      season: dummySeason,
    });

    expect(result.homeTeam).toBe('Meu Clube');
    expect(result.awayTeam).toBe('River Plate');
    expect(result.isNeutral).toBe(false);
    expect(result.stadium).toBeUndefined();
  });

  it('define homeTeam e awayTeam corretamente para Fora', () => {
    const result = buildMatchData({
      date: '10/05',
      league: 'Torneo Apertura',
      opponentTeam: 'River Plate',
      matchVenue: 'Fora',
      career: dummyCareer,
      season: dummySeason,
    });

    expect(result.homeTeam).toBe('River Plate');
    expect(result.awayTeam).toBe('Meu Clube');
    expect(result.isNeutral).toBe(false);
  });

  it('define isNeutral true e salva estádio para Neutro com mandante Meu clube', () => {
    const result = buildMatchData({
      date: '10/05',
      league: 'Torneo Apertura',
      opponentTeam: 'River Plate',
      matchVenue: 'Neutro',
      neutralHost: 'Meu clube',
      stadium: 'Maracanã',
      career: dummyCareer,
      season: dummySeason,
    });

    expect(result.homeTeam).toBe('Meu Clube');
    expect(result.awayTeam).toBe('River Plate');
    expect(result.isNeutral).toBe(true);
    expect(result.stadium).toBe('Maracanã');
  });

  it('define adversário como homeTeam quando venue for Neutro e neutralHost for Adversário', () => {
    const result = buildMatchData({
      date: '10/05',
      league: 'Champions League',
      opponentTeam: 'Real Madrid',
      matchVenue: 'Neutro',
      neutralHost: 'Adversário',
      stadium: 'Estádio Metropolitano',
      career: dummyCareer,
      season: dummySeason,
    });

    expect(result.homeTeam).toBe('Real Madrid');
    expect(result.awayTeam).toBe('Meu Clube');
    expect(result.isNeutral).toBe(true);
    expect(result.stadium).toBe('Estádio Metropolitano');
  });

  it('define isKnockout e stage quando fornecidos', () => {
    const result = buildMatchData({
      date: '10/05',
      league: 'Copa Nacional',
      opponentTeam: 'River Plate',
      matchVenue: 'Neutro',
      isKnockout: true,
      stage: 'Final',
      career: dummyCareer,
      season: dummySeason,
    });

    expect(result.isKnockout).toBe(true);
    expect(result.stage).toBe('Final');
  });

  it('detecta partida de ida em season.matches e popula firstLegScore no jogo de volta', () => {
    const leg1 = match({
      matchesId: 'leg1-match',
      date: '10/04/2025',
      league: 'Champions League',
      stage: 'Semifinal',
      homeTeam: 'Meu Clube',
      awayTeam: 'Arsenal',
      homeScore: 3,
      awayScore: 0,
      status: 'FINISHED',
    });

    const seasonWithLeg1 = season({
      matches: [leg1],
    });

    const result = buildMatchData({
      date: '20/04',
      league: 'Champions League',
      opponentTeam: 'Arsenal',
      matchVenue: 'Fora',
      isKnockout: true,
      stage: 'Semifinal',
      isReturnMatch: true,
      career: dummyCareer,
      season: seasonWithLeg1,
    });

    expect(result.isReturnMatch).toBe(true);
    expect(result.firstLegScore).toEqual({
      userScore: 3,
      opponentScore: 0,
    });
  });

  it('não inclui propriedades com valor undefined no objeto final para compatibilidade com o Firestore', () => {
    const result = buildMatchData({
      date: '10/05',
      league: 'Torneo Apertura',
      opponentTeam: 'River Plate',
      matchVenue: 'Casa',
      career: dummyCareer,
      season: dummySeason,
    });

    for (const [key, value] of Object.entries(result)) {
      expect(value, `Campo "${key}" não pode ser undefined para o Firestore`).not.toBeUndefined();
    }
    expect('stadium' in result).toBe(false);
    expect('stage' in result).toBe(false);
  });
});


describe('formatKnockoutStage', () => {
  it('aplica prefixos gramaticais corretos em português para jogos de volta', () => {
    expect(formatKnockoutStage('Semifinal', true)).toBe('Volta da Semifinal');
    expect(formatKnockoutStage('Final', true)).toBe('Volta da Final');
    expect(formatKnockoutStage('Quartas de Final', true)).toBe('Volta das Quartas de Final');
    expect(formatKnockoutStage('Oitavas de Final', true)).toBe('Volta das Oitavas de Final');
    expect(formatKnockoutStage('Playoffs', true)).toBe('Volta dos Playoffs');
    expect(formatKnockoutStage('Playoff', true)).toBe('Volta do Playoff');
    expect(formatKnockoutStage('Fase Preliminar', true)).toBe('Volta da Fase Preliminar');
  });

  it('mantém o nome da fase inalterado quando não for jogo de volta', () => {
    expect(formatKnockoutStage('Semifinal', false)).toBe('Semifinal');
    expect(formatKnockoutStage('Final', false)).toBe('Final');
    expect(formatKnockoutStage('Quartas de Final', false)).toBe('Quartas de Final');
  });

  it('não duplica prefixo se a fase já contiver Volta', () => {
    expect(formatKnockoutStage('Volta da Semifinal', true)).toBe('Volta da Semifinal');
  });
});

describe('useMatchActions - Salvamento de estádio e troféu automático na final', () => {
  const dummyCareer = career({ id: 'c1', clubName: 'Meu Clube', nation: 'Argentina' });
  const dummySeason = season({ id: 's1', seasonNumber: 1 });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('salva estádio no banco quando a partida for Neutro e tiver estádio', async () => {
    const onClose = vi.fn();
    vi.mocked(useAddMatchesContext).mockReturnValue({
      career: dummyCareer,
      season: dummySeason,
      formValues: {
        date: '15/06',
        league: 'Copa Sul-Americana',
        opponentTeam: 'Flamengo',
        matchVenue: 'Neutro',
        stadium: 'Centenario',
      },
      booleanValues: {},
      onClose,
      setFormValues: vi.fn(),
      handleInputChange: vi.fn(),
      handleKeyDown: vi.fn(),
      handleKeyUp: vi.fn(),
      handleBooleanChange: vi.fn(),
      handleSigningChange: vi.fn(),
      handleCaptainChange: vi.fn(),
    });

    const { result } = renderHook(() => useMatchActions());
    await act(async () => {
      await result.current.saveMatch();
    });

    expect(ServiceMatches.saveStadium).toHaveBeenCalledWith(
      'c1',
      'Centenario',
      dummyCareer.groupId,
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('adiciona troféu silenciosamente se a partida for Final e tiver vitória', async () => {
    const existingFinalMatch = match({
      matchesId: 'm-final',
      stage: 'Final',
      result: 'V',
      status: 'FINISHED',
      league: 'Copa Libertadores',
    });
    const seasonWithMatch = season({
      id: 's1',
      seasonNumber: 1,
      matches: [existingFinalMatch],
    });

    const onClose = vi.fn();
    vi.mocked(useAddMatchesContext).mockReturnValue({
      career: dummyCareer,
      season: seasonWithMatch,
      matchesId: 'm-final',
      formValues: {
        date: '15/06',
        league: 'Copa Libertadores',
        opponentTeam: 'Palmeiras',
        matchVenue: 'Neutro',
        stage: 'Final',
      },
      booleanValues: { isKnockout: true },
      onClose,
      setFormValues: vi.fn(),
      handleInputChange: vi.fn(),
      handleKeyDown: vi.fn(),
      handleKeyUp: vi.fn(),
      handleBooleanChange: vi.fn(),
      handleSigningChange: vi.fn(),
      handleCaptainChange: vi.fn(),
    });

    const { result } = renderHook(() => useMatchActions());
    await act(async () => {
      await result.current.saveMatch();
    });

    expect(ServiceCareer.saveClubTrophies).toHaveBeenCalledWith(
      'c1',
      ['Copa Libertadores'],
      expect.any(Array),
    );
  });

  it('NÃO adiciona troféu se for Final mas o resultado for Derrota', async () => {
    const existingFinalMatch = match({
      matchesId: 'm-final-loss',
      stage: 'Final',
      result: 'D',
      status: 'FINISHED',
      league: 'Copa Libertadores',
    });
    const seasonWithMatch = season({
      id: 's1',
      seasonNumber: 1,
      matches: [existingFinalMatch],
    });

    const onClose = vi.fn();
    vi.mocked(useAddMatchesContext).mockReturnValue({
      career: dummyCareer,
      season: seasonWithMatch,
      matchesId: 'm-final-loss',
      formValues: {
        date: '15/06',
        league: 'Copa Libertadores',
        opponentTeam: 'Palmeiras',
        matchVenue: 'Neutro',
        stage: 'Final',
      },
      booleanValues: { isKnockout: true },
      onClose,
      setFormValues: vi.fn(),
      handleInputChange: vi.fn(),
      handleKeyDown: vi.fn(),
      handleKeyUp: vi.fn(),
      handleBooleanChange: vi.fn(),
      handleSigningChange: vi.fn(),
      handleCaptainChange: vi.fn(),
    });

    const { result } = renderHook(() => useMatchActions());
    await act(async () => {
      await result.current.saveMatch();
    });

    expect(ServiceCareer.saveClubTrophies).not.toHaveBeenCalled();
  });
});

describe('useAddDetails - Troféu automático ao finalizar partida na Final com vitória', () => {
  const dummyCareer = career({ id: 'c1', clubName: 'Meu Clube', nation: 'Argentina' });
  const dummySeason = season({ id: 's1', seasonNumber: 1 });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama saveClubTrophies se a partida for Final e o resultado for vitória (V)', async () => {
    const scheduledFinal = match({
      matchesId: 'm1',
      homeTeam: 'Meu Clube',
      awayTeam: 'Boca Juniors',
      stage: 'Final',
      status: 'SCHEDULED',
      result: '?',
      league: 'Copa Argentina',
    });

    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useAddDetails({
        career: dummyCareer,
        season: dummySeason,
        match: scheduledFinal,
        onClose,
      }),
    );

    const dummyField = (id: string): Field => ({
      id,
      name: id,
      icon: null,
    });
    const createChangeEvent = (
      name: string,
      value: string,
    ): React.ChangeEvent<HTMLInputElement> =>
      ({
        target: { name, value },
      }) as unknown as React.ChangeEvent<HTMLInputElement>;

    // Simulate winning 2x1
    act(() => {
      // homeScore: 2, awayScore: 1
      result.current.handleInputChange(
        createChangeEvent('homeScore', '2'),
        dummyField('homeScore'),
      );
      result.current.handleInputChange(
        createChangeEvent('awayScore', '1'),
        dummyField('awayScore'),
      );
    });

    await act(async () => {
      await result.current.saveDetails();
    });

    expect(ServiceCareer.saveClubTrophies).toHaveBeenCalledWith(
      'c1',
      ['Copa Argentina'],
      expect.any(Array),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('NÃO chama saveClubTrophies se a partida for Final e o usuário perder (D)', async () => {
    const scheduledFinal = match({
      matchesId: 'm1',
      homeTeam: 'Meu Clube',
      awayTeam: 'Boca Juniors',
      stage: 'Final',
      status: 'SCHEDULED',
      result: '?',
      league: 'Copa Argentina',
    });

    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useAddDetails({
        career: dummyCareer,
        season: dummySeason,
        match: scheduledFinal,
        onClose,
      }),
    );

    const dummyField = (id: string): Field => ({
      id,
      name: id,
      icon: null,
    });
    const createChangeEvent = (
      name: string,
      value: string,
    ): React.ChangeEvent<HTMLInputElement> =>
      ({
        target: { name, value },
      }) as unknown as React.ChangeEvent<HTMLInputElement>;

    // Simulate losing 0x2
    act(() => {
      result.current.handleInputChange(
        createChangeEvent('homeScore', '0'),
        dummyField('homeScore'),
      );
      result.current.handleInputChange(
        createChangeEvent('awayScore', '2'),
        dummyField('awayScore'),
      );
    });

    await act(async () => {
      await result.current.saveDetails();
    });

    expect(ServiceCareer.saveClubTrophies).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
