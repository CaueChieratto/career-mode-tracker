// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { ServiceFinance } from "../common/services/ServiceFinance";
import AddFinancialEntry from "../layout/SectionView/features/ClubTabs/FinanceTab/views/AddFinancialEntry";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Match } from "../common/interfaces/Match";
import { FinancialEntry } from "../common/interfaces/finance";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Career/fcb_career_1/Season/season_fcb_1" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "fcb_career_1", seasonId: "season_fcb_1" }),
  };
});

vi.mock("../contexts/SeasonThemeContext", () => ({
  SeasonThemeContext: {
    Consumer: ({
      children,
    }: {
      children: (value: { activeStyle: Record<string, string> }) => React.ReactNode;
    }) =>
      children({
        activeStyle: {
          darkClubColor: "#004d98",
          color: "#edbb00",
          fontWeight: "bold",
          border: "none",
        },
      }),
  },
  useSeasonTheme: () => ({
    clubColor: "#a50044",
    darkClubColor: "#004d98",
  }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#a50044",
    darkClubColor: "#004d98",
  }),
}));

function createPlayer(overrides: Partial<Players>): Players {
  return {
    id: overrides.id || "p_default",
    name: overrides.name || "Test Player",
    position: overrides.position || "MC",
    sector: overrides.sector || "Meio-Campo",
    age: overrides.age ?? 22,
    nation: overrides.nation || "ESP",
    overall: overrides.overall ?? 85,
    shirtNumber: overrides.shirtNumber || "8",
    ballonDor: overrides.ballonDor ?? 0,
    buy: overrides.buy ?? false,
    captain: overrides.captain ?? false,
    sell: overrides.sell ?? false,
    contract: overrides.contract || [],
    statsLeagues: overrides.statsLeagues || [],
    ...overrides,
  };
}

function createMatch(overrides: Partial<Match>): Match {
  return {
    matchesId: overrides.matchesId || `m_${Math.random().toString(36).substring(2, 7)}`,
    date: overrides.date || "14/08/2026",
    league: overrides.league || "La Liga",
    homeTeam: overrides.homeTeam || "FC Barcelona",
    awayTeam: overrides.awayTeam || "Valencia CF",
    homeScore: overrides.homeScore ?? 2,
    awayScore: overrides.awayScore ?? 0,
    result: overrides.result || "V",
    status: overrides.status || "FINISHED",
    ...overrides,
  };
}

describe("Cenários 12 e 13 da Seção 11 de PLANEJAMENTO_SALARIOS.md (Padrão FC Barcelona)", () => {
  const barcaCareer: Career = {
    id: "fcb_career_1",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "fcb.png",
    nation: "ESP",
    currency: "EUR",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    clubData: [],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Cenário 12 — Edição Manual (10M -> 12M), Persistência pós Reload e Soma Futura (12M + 1M = 13M)", () => {
    it("Fluxo de Serviço: Usuário corrige de 10M para 12M, recarrega e nova partida subsequente incrementa para 13M", async () => {
      // Frenkie de Jong: 700.000/sem (100.000/dia)
      const frenkie = createPlayer({
        id: "frenkie_21",
        name: "Frenkie de Jong",
        salary: 700000,
        contract: [
          {
            salary: 700000,
            buyValue: 0,
            sellValue: 0,
            fromClub: "FC Barcelona",
            leftClub: "",
            dataArrival: new Date("2026-07-01"),
          },
        ],
      });

      // Partida 1 finalizada após exatamente 100 dias (01/07/2026 a 09/10/2026 -> 100 dias = 10.000.000)
      const match1 = createMatch({
        matchesId: "match_fcb_p1",
        date: "09/10/2026",
        status: "FINISHED",
      });

      const season1: ClubData = {
        id: "season_fcb_1",
        seasonNumber: 1,
        players: [frenkie],
        matches: [match1],
      };

      // 1. Obter relatório inicial reconciliado
      const reportP1 = await ServiceFinance.getReportBySeason(
        barcaCareer.id,
        season1.id,
        1,
        season1,
        barcaCareer,
      );

      const salaryEntryP1 = reportP1.entries.find(
        (e) => e.source === "salary" && e.id === `salary_season_${season1.id}`,
      );
      expect(salaryEntryP1).toBeDefined();
      expect(salaryEntryP1?.amount).toBe(10000000);
      expect(salaryEntryP1?.calculatedAmount).toBe(10000000);
      expect(salaryEntryP1?.manualAdjustment).toBeUndefined();

      // Salva no storage para simular persistência
      await ServiceFinance.syncReconciledReport(
        barcaCareer.id,
        season1.id,
        season1,
        false,
        barcaCareer,
      );

      // 2. Usuário corrige manualmente o valor total de 10M para 12M (+2M de manualAdjustment)
      const updatedSalary = await ServiceFinance.updateEntry(
        barcaCareer.id,
        season1.id,
        `salary_season_${season1.id}`,
        { amount: 12000000 },
      );

      expect(updatedSalary.amount).toBe(12000000);
      expect(updatedSalary.calculatedAmount).toBe(10000000);
      expect(updatedSalary.manualAdjustment).toBe(2000000);
      expect(updatedSalary.source).toBe("salary");
      expect(updatedSalary.isAutomatic).toBe(true);

      // 3. Simula Reload / Reabertura do app com as mesmas partidas
      const reportReload = await ServiceFinance.getReportBySeason(
        barcaCareer.id,
        season1.id,
        1,
        season1,
        barcaCareer,
      );

      const salaryReload = reportReload.entries.find(
        (e) => e.id === `salary_season_${season1.id}`,
      );
      expect(salaryReload?.amount).toBe(12000000);
      expect(salaryReload?.calculatedAmount).toBe(10000000);
      expect(salaryReload?.manualAdjustment).toBe(2000000);

      // 4. Nova partida finalizada 10 dias depois (19/10/2026 -> +1.000.000 calculado)
      const match2 = createMatch({
        matchesId: "match_fcb_p2",
        date: "19/10/2026",
        status: "FINISHED",
      });

      const seasonWithMatch2: ClubData = {
        ...season1,
        matches: [match1, match2],
      };

      const reportAfterMatch2 = await ServiceFinance.getReportBySeason(
        barcaCareer.id,
        season1.id,
        1,
        seasonWithMatch2,
        barcaCareer,
      );

      const salaryAfterMatch2 = reportAfterMatch2.entries.find(
        (e) => e.id === `salary_season_${season1.id}`,
      );
      // calculatedAmount: 11.000.000, manualAdjustment: +2.000.000 -> amount = 13.000.000
      expect(salaryAfterMatch2?.calculatedAmount).toBe(11000000);
      expect(salaryAfterMatch2?.manualAdjustment).toBe(2000000);
      expect(salaryAfterMatch2?.amount).toBe(13000000);
      expect(salaryAfterMatch2?.lastProcessedDate).toBe("19/10");
    });
  });

  describe("Cenário 13 — Bloqueio Absoluto de Exclusão da Despesa de Salários no Serviço", () => {
    it("ServiceFinance.deleteEntry rejeita categoricamente tentativa de exclusão do lançamento de salários", async () => {
      const seasonId = "season_fcb_del_test";
      const salaryEntry: FinancialEntry = {
        id: `salary_season_${seasonId}`,
        type: "expense",
        category: "Salários de atletas",
        amount: 10000000,
        calculatedAmount: 10000000,
        isAutomatic: true,
        source: "salary",
      };

      const initialReport = {
        seasonId,
        seasonNumber: 1,
        entries: [salaryEntry],
      };
      localStorage.setItem(
        `finance_report_${barcaCareer.id}_${seasonId}`,
        JSON.stringify(initialReport),
      );

      await expect(
        ServiceFinance.deleteEntry(
          barcaCareer.id,
          seasonId,
          `salary_season_${seasonId}`,
        ),
      ).rejects.toThrow("A despesa automática de salários não pode ser excluída.");

      // Confere que a entrada permanece intacta no relatório persistido
      const report = await ServiceFinance.getReportBySeason(
        barcaCareer.id,
        seasonId,
        1,
      );
      expect(report.entries).toHaveLength(1);
      expect(report.entries[0].id).toBe(`salary_season_${seasonId}`);
    });
  });

  describe("UI Interativa em AddFinancialEntry (Cenários 12 e 13 integrados)", () => {
    it("Exibe botão Editar e oculta botão Excluir no card de salários; permite corrigir para 12M e atualiza a interface", async () => {
      const frenkie = createPlayer({
        id: "frenkie_21",
        name: "Frenkie de Jong",
        salary: 700000,
        contract: [
          {
            salary: 700000,
            buyValue: 0,
            sellValue: 0,
            fromClub: "FC Barcelona",
            leftClub: "",
            dataArrival: new Date("2026-07-01"),
          },
        ],
      });

      const match1 = createMatch({
        matchesId: "match_fcb_p1",
        date: "09/10/2026",
        status: "FINISHED",
      });

      const season: ClubData = {
        id: "season_fcb_1",
        seasonNumber: 1,
        players: [frenkie],
        matches: [match1],
      };

      const salaryId = `salary_season_${season.id}`;
      const initialReport = {
        seasonId: season.id,
        seasonNumber: 1,
        entries: [
          {
            id: salaryId,
            type: "expense" as const,
            category: "Salários de atletas",
            amount: 10000000,
            calculatedAmount: 10000000,
            isAutomatic: true,
            source: "salary" as const,
            description: "Salários de atletas (01/07 a 09/10)",
            lastProcessedDate: "09/10",
          },
        ],
      };

      localStorage.setItem(
        `finance_report_${barcaCareer.id}_${season.id}`,
        JSON.stringify(initialReport),
      );

      render(
        <AddFinancialEntry
          career={barcaCareer}
          season={season}
          onClose={vi.fn()}
        />,
      );

      // Aguarda carregamento inicial da lista
      await waitFor(() => {
        expect(screen.getByTestId("financial-entries-list")).toBeTruthy();
      });

      // Alterna o segmented control para "Despesa"
      const expenseSegmentBtn = screen.getByRole("button", { name: "Despesa" });
      fireEvent.click(expenseSegmentBtn);

      await waitFor(() => {
        expect(screen.getByText("Despesas da Temporada")).toBeTruthy();
      });

      // Localiza o card da despesa de salários
      const salaryCard = screen.getByTestId(`financial-entry-card-${salaryId}`);
      expect(salaryCard).toBeTruthy();

      // REGRA 13: Botão Editar DEVE estar presente
      const editBtn = within(salaryCard).getByRole("button", {
        name: /Editar lançamento Salários de atletas/i,
      });
      expect(editBtn).toBeTruthy();

      // REGRA 13: Botão Excluir NUNCA deve existir no card de salários
      expect(
        within(salaryCard).queryByRole("button", {
          name: /Excluir lançamento Salários de atletas/i,
        }),
      ).toBeNull();

      // Clica no botão Editar
      fireEvent.click(editBtn);

      // Entra em modo de edição
      await waitFor(() => {
        expect(screen.getByText("Editar Lançamento Financeiro")).toBeTruthy();
        expect(
          screen.getByText("Cancelar edição deste lançamento?"),
        ).toBeTruthy();
      });

      // Altera o valor no input para "12M"
      const amountInput = screen.getByPlaceholderText(/150k, 2.5M, 1B/i);
      fireEvent.change(amountInput, { target: { value: "12M" } });

      // Clica em "Salvar Alterações" na Navbar
      const saveBtn = screen.getByText("Salvar Alterações");
      fireEvent.click(saveBtn);

      // Card atualizado volta a aparecer na lista com o valor 12M
      await waitFor(() => {
        const updatedSalaryCard = screen.getByTestId(
          `financial-entry-card-${salaryId}`,
        );
        expect(updatedSalaryCard).toBeTruthy();
        expect(within(updatedSalaryCard).getByText(/-.*12M/i)).toBeTruthy();
      });

      // Verifica persistência no storage
      const savedData = JSON.parse(
        localStorage.getItem(`finance_report_${barcaCareer.id}_${season.id}`) ||
          "{}",
      );
      const savedSalary = savedData.entries.find((e: FinancialEntry) => e.id === salaryId);
      expect(savedSalary.amount).toBe(12000000);
      expect(savedSalary.calculatedAmount).toBe(10000000);
      expect(savedSalary.manualAdjustment).toBe(2000000);
    });
  });
});
