// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, renderHook, cleanup, act } from "@testing-library/react";
import { NavigateFunction } from "react-router-dom";
import { ServiceFinance } from "../common/services/ServiceFinance";
import { BudgetDonutChart } from "../layout/SectionView/features/ClubTabs/FinanceTab/components/BudgetDonutChart";
import { BudgetOverviewCard } from "../layout/SectionView/features/ClubTabs/FinanceTab/components/BudgetOverviewCard";
import FinanceTab from "../layout/SectionView/features/ClubTabs/FinanceTab";
import GeneralTab from "../layout/SectionView/features/ClubTabs/GeneralTab";
import AddFinancialEntry from "../layout/SectionView/features/ClubTabs/FinanceTab/views/AddFinancialEntry";
import { useFinancialEntryForm } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/AddFinancialEntry/hooks/useFinancialEntryForm";
import { getSeasonTabsConfig } from "../common/config/seasonTabsConfig";
import { useTabView } from "../common/hooks/UseTabView";
import { FinancialEntry } from "../common/interfaces/finance";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Season/season-1" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ seasonId: "season-1" }),
  };
});

// Mock do SeasonThemeContext para renderizar botões com segurança
vi.mock("../contexts/SeasonThemeContext", () => ({
  SeasonThemeContext: {
    Consumer: ({
      children,
    }: {
      children: (value: {
        activeStyle: Record<string, string>;
      }) => React.ReactNode;
    }) =>
      children({
        activeStyle: {
          darkClubColor: "#111",
          color: "#fff",
          fontWeight: "bold",
          border: "none",
        },
      }),
  },
  useSeasonTheme: () => ({
    clubColor: "#00ff00",
    darkClubColor: "#003300",
  }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#00ff00",
    darkClubColor: "#003300",
  }),
}));

const mockCareer: Career = {
  id: "test-career-1",
  managerName: "Treinador Teste",
  clubName: "Clube Teste",
  teamBadge: "badge.png",
  nation: "Inglaterra",
  currency: "GBP",
  trophies: [],
  createdAt: new Date("2026-01-01"),
  colorsTeams: ["#000000", "#ffffff"],
  clubData: [
    {
      id: "season-1",
      seasonNumber: 1,
      players: [],
      matches: [],
    },
    {
      id: "season-2",
      seasonNumber: 2,
      players: [],
      matches: [],
    },
  ],
};

const mockSeason: ClubData = {
  id: "season-1",
  seasonNumber: 1,
  players: [],
  matches: [],
};

describe("Bloco 1: Arquitetura Financeira e Interface da Aba Finanças", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("1. Cálculo de Saldo Líquido e Totais Financeiros", () => {
    it("valida com precisão: Saldo = Total Receitas - Total Despesas", () => {
      const entries: FinancialEntry[] = [
        {
          id: "1",
          type: "revenue",
          category: "Ingressos",
          amount: 30000000,
        },
        {
          id: "2",
          type: "revenue",
          category: "Sócio Torcedor",
          amount: 24000000,
        },
        {
          id: "3",
          type: "expense",
          category: "Salários de atletas",
          amount: 20000000,
        },
        {
          id: "4",
          type: "expense",
          category: "Manutenção estádio",
          amount: 5000000,
        },
      ];

      const totals = ServiceFinance.calculateTotals(entries);

      expect(totals.totalRevenue).toBe(54000000);
      expect(totals.totalExpense).toBe(25000000);
      expect(totals.netBalance).toBe(29000000);
      expect(totals.totalMovement).toBe(79000000);

      // Proporções percentuais
      const expectedRevenuePerc = (54000000 / 79000000) * 100;
      const expectedExpensePerc = (25000000 / 79000000) * 100;
      expect(totals.revenuePercentage).toBeCloseTo(expectedRevenuePerc, 4);
      expect(totals.expensePercentage).toBeCloseTo(expectedExpensePerc, 4);
    });

    it("trata lista vazia de lançamentos com saldo zero e percentuais zerados", () => {
      const totals = ServiceFinance.calculateTotals([]);
      expect(totals.totalRevenue).toBe(0);
      expect(totals.totalExpense).toBe(0);
      expect(totals.netBalance).toBe(0);
      expect(totals.totalMovement).toBe(0);
      expect(totals.revenuePercentage).toBe(0);
      expect(totals.expensePercentage).toBe(0);
    });

    it("calcula saldo deficitário (prejuízo) corretamente", () => {
      const entries: FinancialEntry[] = [
        { id: "1", type: "revenue", category: "Ingressos", amount: 10000 },
        { id: "2", type: "expense", category: "Salários", amount: 50000 },
      ];
      const totals = ServiceFinance.calculateTotals(entries);
      expect(totals.netBalance).toBe(-40000);
    });
  });

  describe("2. Renderização do Donut Chart (SVG Ring)", () => {
    it("renderiza os arcos com as proporções corretas de receitas (#0bb32a) e despesas (#c81419)", () => {
      const radius = 68;
      const circumference = 2 * Math.PI * radius;
      const totalRev = 54000000;
      const totalExp = 25000000;
      const totalMov = totalRev + totalExp;

      render(
        <BudgetDonutChart
          totalRevenue={totalRev}
          totalExpense={totalExp}
          netBalance={29000000}
          currency="GBP"
          subtext="Temporada 1"
        />,
      );

      const revenueArc = screen.getByTestId("donut-revenue-arc");
      const expenseArc = screen.getByTestId("donut-expense-arc");

      expect(revenueArc).toBeTruthy();
      expect(expenseArc).toBeTruthy();

      expect(revenueArc.getAttribute("stroke")).toBe("#0bb32a");
      expect(expenseArc.getAttribute("stroke")).toBe("#c81419");

      const expectedRevenueLength = (totalRev / totalMov) * circumference;
      const expectedExpenseLength = (totalExp / totalMov) * circumference;

      const revenueDash = revenueArc.getAttribute("stroke-dasharray");
      const expenseDash = expenseArc.getAttribute("stroke-dasharray");

      expect(revenueDash).toContain(expectedRevenueLength.toString());
      expect(expenseDash).toContain(expectedExpenseLength.toString());

      // Saldo central formatado
      const balanceEl = screen.getByTestId("donut-net-balance");
      expect(balanceEl).toBeTruthy();
      expect(balanceEl.textContent).toContain("£29M");
    });

    it("renderiza saldo deficitário com prefixo negativo", () => {
      render(
        <BudgetDonutChart
          totalRevenue={1000000}
          totalExpense={5000000}
          netBalance={-4000000}
          currency="GBP"
        />,
      );
      const balanceEl = screen.getByTestId("donut-net-balance");
      expect(balanceEl.textContent).toBe("-£4M");
    });
  });

  describe("3. Lançamentos e Categorias Customizadas com Escopo por Carreira", () => {
    it("salva categorias customizadas exclusivamente no escopo da carreira", async () => {
      const careerId = "carreira-exclusiva";
      await ServiceFinance.saveCustomCategory(
        careerId,
        "revenue",
        "Venda de Direitos de TV",
      );
      await ServiceFinance.saveCustomCategory(
        careerId,
        "expense",
        "Patrocínio Master da Camisa",
      );

      const categories = await ServiceFinance.getCustomCategories(careerId);
      expect(categories.revenues).toContain("Venda de Direitos de TV");
      expect(categories.expenses).toContain("Patrocínio Master da Camisa");

      // Garante isolamento: outra carreira não deve ver essas categorias
      const otherCategories =
        await ServiceFinance.getCustomCategories("outra-carreira");
      expect(otherCategories.revenues).not.toContain("Venda de Direitos de TV");
      expect(otherCategories.expenses).not.toContain(
        "Patrocínio Master da Camisa",
      );
    });

    it("adiciona lançamento financeiro com categoria customizada e persiste no relatório", async () => {
      const careerId = "career-teste";
      const seasonId = "season-1";

      const created = await ServiceFinance.addEntry(careerId, seasonId, {
        type: "revenue",
        category: "Patrocínio Especial",
        amount: 1500000,
        date: "10/08",
        description: "Contrato assinado",
      });

      expect(created.id).toBeDefined();
      expect(created.amount).toBe(1500000);
      expect(created.category).toBe("Patrocínio Especial");

      // Categoria foi adicionada automaticamente às customCategories
      const customCats = await ServiceFinance.getCustomCategories(careerId);
      expect(customCats.revenues).toContain("Patrocínio Especial");

      // Relatório recuperado contém o lançamento
      const report = await ServiceFinance.getReportBySeason(careerId, seasonId);
      expect(report.entries).toHaveLength(1);
      expect(report.entries[0].category).toBe("Patrocínio Especial");
    });
  });

  describe("4. Bloqueio Estrito de Edição (Read-Only Total) na Página Geral", () => {
    it("BudgetOverviewCard oculta estritamente o botão de adicionar na visualização Geral (notSeason === true)", () => {
      const mockEntries: FinancialEntry[] = [
        { id: "e1", type: "revenue", category: "Ingressos", amount: 1000 },
      ];

      // Modo temporada: botão DEVE existir
      const { unmount } = render(
        <BudgetOverviewCard
          career={mockCareer}
          season={mockSeason}
          notSeason={false}
          initialEntries={mockEntries}
        />,
      );
      expect(screen.getByTestId("btn-add-financial-entry")).toBeTruthy();
      unmount();

      // Modo Geral: botão NÃO PODE existir
      render(
        <BudgetOverviewCard
          career={mockCareer}
          season={mockSeason}
          notSeason={true}
          initialEntries={mockEntries}
        />,
      );
      expect(screen.queryByTestId("btn-add-financial-entry")).toBeNull();
    });

    it("ServiceFinance rejeita qualquer mutação de escrita quando notSeason === true", async () => {
      const careerId = "carreira-ro";
      const seasonId = "season-ro";

      await expect(
        ServiceFinance.addEntry(
          careerId,
          seasonId,
          { type: "revenue", category: "Ingressos", amount: 100 },
          true, // notSeason = true
        ),
      ).rejects.toThrow(
        "Mutações financeiras não são permitidas no modo somente leitura (Geral).",
      );

      await expect(
        ServiceFinance.deleteEntry(careerId, seasonId, "id-1", true),
      ).rejects.toThrow(
        "Mutações financeiras não são permitidas no modo somente leitura (Geral).",
      );

      await expect(
        ServiceFinance.saveCustomCategory(
          careerId,
          "revenue",
          "Nova Cat",
          true,
        ),
      ).rejects.toThrow(
        "Mutações financeiras não são permitidas no modo somente leitura (Geral).",
      );
    });

    it("ServiceFinance agrega corretamente relatórios multi-temporadas em getConsolidatedReport", async () => {
      const careerMulti: Career = {
        ...mockCareer,
        id: "career-multi",
        clubData: [
          {
            id: "s1",
            seasonNumber: 1,
            players: [],
            financialReport: {
              seasonId: "s1",
              seasonNumber: 1,
              entries: [
                {
                  id: "1",
                  type: "revenue",
                  category: "Ingressos",
                  amount: 1000,
                },
              ],
            },
          },
          {
            id: "s2",
            seasonNumber: 2,
            players: [],
            financialReport: {
              seasonId: "s2",
              seasonNumber: 2,
              entries: [
                { id: "2", type: "expense", category: "Salários", amount: 400 },
              ],
            },
          },
        ],
      };

      const consolidated =
        await ServiceFinance.getConsolidatedReport(careerMulti);
      expect(consolidated.seasonId).toBe("geral");
      expect(consolidated.entries).toHaveLength(2);

      const totals = ServiceFinance.calculateTotals(consolidated.entries);
      expect(totals.totalRevenue).toBe(1000);
      expect(totals.totalExpense).toBe(400);
      expect(totals.netBalance).toBe(600);
    });
  });

  describe("5. Navegação, Ordem das Abas e Tab Padrão Inicial", () => {
    it("posiciona a aba Finanças na posição 1 (índice 0) antes de Elenco para clubes", () => {
      const fakeNavigate = vi.fn();
      const tabs = getSeasonTabsConfig(
        mockCareer,
        "season-1",
        fakeNavigate as unknown as NavigateFunction,
        false, // isPlayer = false (carreira de clube)
      );

      expect(tabs[0].title).toBe("Finanças");
      expect(tabs[1].title).toBe("Elenco");
      expect(tabs[2].title).toBe("Partidas");
      expect(tabs[3].title).toBe("Classificação");
    });

    it("no primeiro acesso à temporada (sem savedIndex), useTabView inicializa na aba Elenco (índice 0)", () => {
      const storageKey = `season-tab-${mockCareer.id}-season-1`;

      const { result } = renderHook(() => useTabView(storageKey));

      // Deve iniciar no índice 0 (Elenco)
      expect(result.current.activeIndex).toBe(0);
    });

    it("quando houver savedIndex no sessionStorage, useTabView respeita a preferência do usuário", () => {
      const storageKey = `season-tab-${mockCareer.id}-season-1`;
      sessionStorage.setItem(storageKey, "0"); // Usuário estava na aba Finanças

      const { result } = renderHook(() => useTabView(storageKey));

      expect(result.current.activeIndex).toBe(0);
    });

    it("para chaves que não sejam season-tab- (ex: match-tab-), inicializa com 0 por padrão", () => {
      const matchStorageKey = "match-tab-career-match-1";

      const { result } = renderHook(() => useTabView(matchStorageKey));

      expect(result.current.activeIndex).toBe(0);
    });
  });

  describe("6. Remoção de Cards Antigos no GeneralTab e Integração no FinanceTab", () => {
    it("FinanceTab renderiza o Relatório Financeiro e o TransfersCardSummary", () => {
      render(
        <FinanceTab
          career={mockCareer}
          season={mockSeason}
          notSeason={false}
          onOpenTransfers={vi.fn()}
        />,
      );

      expect(screen.getByTestId("budget-overview-card")).toBeTruthy();
      expect(screen.getByText("Relatório Financeiro")).toBeTruthy();
      expect(screen.getByText("Transferências")).toBeTruthy();
    });

    it("GeneralTab renderiza sem os antigos TransferCardBalance e TransfersCardSummary", () => {
      render(<GeneralTab season={mockSeason} career={mockCareer} />);

      expect(screen.getByText("Resumo da equipe")).toBeTruthy();
      // Não deve renderizar "Transferências" nem "Balanço de transferências"
      expect(screen.queryByText("Transferências")).toBeNull();
      expect(screen.queryByText("Balanço de transferências")).toBeNull();
    });
  });

  describe("7. Tela AddFinancialEntry (Design Padrão do Projeto e Campos Refatorados)", () => {
    it("HeaderSeason exibe apenas 2 itens (nome do clube e título da tela) sem número da temporada", () => {
      render(
        <AddFinancialEntry
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      // 1. Clube Teste (h1)
      expect(
        screen.getByRole("heading", { level: 1 }).textContent,
      ).toContain("Clube Teste");
      // 2. Novo Lançamento Financeiro (título da tela)
      expect(screen.getByText("Novo Lançamento Financeiro")).toBeTruthy();
      // Não deve exibir "Temporada 1" no Header
      expect(screen.queryByText("Temporada 1")).toBeNull();
    });

    it("não renderiza os inputs removidos de Data do Lançamento e Descrição", () => {
      render(
        <AddFinancialEntry
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText(/Data do Lançamento/i)).toBeNull();
      expect(screen.queryByText(/Descrição/i)).toBeNull();
      expect(screen.queryByPlaceholderText(/Ex: 15\/08/i)).toBeNull();
      expect(screen.queryByPlaceholderText(/Ex: Premiação por vitória/i)).toBeNull();
    });

    it("renderiza a seção e campos no padrão FormSection (Tipo, Categoria, Valor)", () => {
      render(
        <AddFinancialEntry
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("Dados do Lançamento")).toBeTruthy();
      expect(screen.getByText("Tipo de Lançamento")).toBeTruthy();
      expect(screen.getByText("Categoria")).toBeTruthy();
      expect(screen.getByText("Valor (GBP)")).toBeTruthy();
      expect(screen.getByText("Receita")).toBeTruthy();
      expect(screen.getByText("Despesa")).toBeTruthy();
    });
  });

  describe("8. Detalhamento de Categorias no Card e Preservação de Estado na Tela de Lançamentos", () => {
    it("BudgetOverviewCard exibe o botão com o texto '+ Nova Movimentação' e lista categorias de entradas e saídas", () => {
      const mockEntries: FinancialEntry[] = [
        { id: "e1", type: "revenue", category: "Premiações La Liga", amount: 25000000 },
        { id: "e2", type: "revenue", category: "Venda de Camisas", amount: 12000000 },
        { id: "e3", type: "expense", category: "Folha Salarial", amount: 15000000 },
      ];

      render(
        <BudgetOverviewCard
          career={mockCareer}
          season={mockSeason}
          notSeason={false}
          initialEntries={mockEntries}
        />,
      );

      // Botão com texto leigo
      const addBtn = screen.getByTestId("btn-add-financial-entry");
      expect(addBtn.textContent).toContain("+ Nova Movimentação");

      // Seções de categorias
      expect(screen.getByText(/Receitas por Categoria|Entradas por Categoria/i)).toBeTruthy();
      expect(screen.getByText(/Despesas por Categoria|Saídas por Categoria/i)).toBeTruthy();

      // Nomes das categorias presentes
      expect(screen.getByText("Premiações La Liga")).toBeTruthy();
      expect(screen.getByText("Venda de Camisas")).toBeTruthy();
      expect(screen.getByText("Folha Salarial")).toBeTruthy();
    });

    it("useFinancialEntryForm preserva o tipo selecionado (Despesa) ao executar resetForm", () => {
      const { result } = renderHook(() =>
        useFinancialEntryForm({ career: mockCareer, notSeason: false }),
      );

      // Inicialmente é receita
      expect(result.current.type).toBe("revenue");

      // Altera para despesa
      act(() => {
        result.current.setType("expense");
        result.current.setCategory("Manutenção");
        result.current.setAmountStr("100k");
      });

      expect(result.current.type).toBe("expense");

      // Executa resetForm
      act(() => {
        result.current.resetForm();
      });

      // Categoria e valor limpos, mas tipo 'expense' preservado!
      expect(result.current.type).toBe("expense");
      expect(result.current.category).toBe("");
      expect(result.current.amountStr).toBe("");
    });

    it("AddFinancialEntry renderiza o card com data-category para busca e navegação", async () => {
      vi.spyOn(ServiceFinance, "getReportBySeason").mockResolvedValue({
        seasonId: "season-1",
        seasonNumber: 1,
        entries: [
          { id: "e1", type: "revenue", category: "Premiações La Liga", amount: 1000 },
        ],
      });

      render(
        <AddFinancialEntry
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
        />,
      );

      // Card existente deve estar no DOM com data-category
      const card = await screen.findByTestId("financial-entry-card-e1");
      expect(card.getAttribute("data-category")).toBe("Premiações La Liga");
    });
  });
});
