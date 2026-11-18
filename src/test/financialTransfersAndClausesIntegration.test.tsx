// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { ServiceFinance } from "../common/services/ServiceFinance";
import AddFinancialEntry from "../layout/SectionView/features/ClubTabs/FinanceTab/views/AddFinancialEntry";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import * as firestoreMocks from "./mocks/firestore";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Career/barca-1/Season/season-1" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "barca-1", seasonId: "season-1" }),
  };
});

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

const mockBarcelonaCareer: Career = {
  id: "barca-career-1",
  managerName: "Hansi Flick",
  clubName: "FC Barcelona",
  teamBadge: "fc-barcelona-badge.png",
  nation: "Espanha",
  currency: "EUR",
  trophies: [],
  createdAt: new Date("2024-07-01"),
  colorsTeams: ["#004d98", "#a50044"],
  clubData: [],
};

const createMockSeason = (players: Players[] = []): ClubData => ({
  id: "season-2024-2025",
  seasonNumber: 1,
  players,
  matches: [],
});

describe("Integração Financeira: Transferências, Cláusulas e Adicionar Lançamento (Padrão FC Barcelona)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    firestoreMocks.getDoc.mockResolvedValue(
      firestoreMocks.documentSnapshot("doc-1", {}, false),
    );
    firestoreMocks.setDoc.mockResolvedValue(undefined);
    firestoreMocks.deleteDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("1. Compra de Atleta no FC Barcelona", () => {
    it("deve contabilizar automaticamente uma Despesa de € 70.000.000 ao comprar Pedri", async () => {
      const season = createMockSeason();
      const pedriPlayer: Players = {
        id: "pedri-8",
        name: "Pedri",
        overall: 88,
        sector: "Meio-Campo",
        position: "MC",
        age: 21,
        salary: 150000,
        nation: "Espanha",
        shirtNumber: "8",
        playerValue: 70000000,
        buy: true,
        captain: false,
        sell: false,
        loan: false,
        contractTime: 5,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 70000000,
            sellValue: 0,
            fromClub: "UD Las Palmas",
            leftClub: "",
            dataArrival: new Date("2024-07-15"),
            dataExit: null,
          },
        ],
      };

      season.players = [pedriPlayer];

      // Reconciliação do relatório
      const report = await ServiceFinance.getReportBySeason(
        mockBarcelonaCareer.id,
        season.id,
        season.seasonNumber,
        season,
      );

      const transferEntry = report.entries.find(
        (e) => e.id === "transfer_buy_pedri-8_0",
      );
      expect(transferEntry).toBeDefined();
      expect(transferEntry?.type).toBe("expense");
      expect(transferEntry?.amount).toBe(70000000);
      expect(transferEntry?.category).toBe("Transferências (compras de atletas)");
      expect(transferEntry?.source).toBe("transfer");
      expect(transferEntry?.transferDirection).toBe("arrivals");
      expect(transferEntry?.description).toContain("Pedri");
      expect(transferEntry?.description).toContain("UD Las Palmas");

      const totals = ServiceFinance.calculateTotals(report.entries);
      expect(totals.totalExpense).toBe(70000000);
      expect(totals.netBalance).toBe(-70000000);
    });
  });

  describe("2. Venda de Atleta com Parcelamento no FC Barcelona", () => {
    it("deve contabilizar como Receita imediata apenas a entrada à vista (€ 40.000.000) de uma venda parcelada", async () => {
      const season = createMockSeason();
      const playerSold: Players = {
        id: "player-sold-1",
        name: "Atleta Vendido",
        overall: 80,
        sector: "Ataque",
        position: "PD",
        age: 24,
        salary: 80000,
        nation: "Espanha",
        shirtNumber: "17",
        playerValue: 100000000,
        buy: false,
        captain: false,
        sell: true,
        loan: false,
        contractTime: 0,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            sellValue: 100000000,
            fromClub: "",
            leftClub: "Paris Saint-Germain",
            dataArrival: null,
            dataExit: new Date("2024-08-01"),
            installments: {
              id: "inst-sale-1",
              percentage: 60,
              firstPaymentSeasonNumber: 2,
              totalInstallments: 3,
              remainingInstallments: 3,
              annualInstallmentValue: 20000000,
              upfrontValue: 40000000,
              direction: "receivable",
              partnerClub: "Paris Saint-Germain",
              status: "pending",
            },
          },
        ],
      };

      season.players = [playerSold];

      const report = await ServiceFinance.getReportBySeason(
        mockBarcelonaCareer.id,
        season.id,
        season.seasonNumber,
        season,
      );

      const saleEntry = report.entries.find(
        (e) => e.id === "transfer_sell_player-sold-1_0",
      );
      expect(saleEntry).toBeDefined();
      expect(saleEntry?.type).toBe("revenue");
      expect(saleEntry?.amount).toBe(40000000); // Upfront de 40M e não os 100M totais
      expect(saleEntry?.category).toBe("Transferências (vendas de atletas)");
      expect(saleEntry?.source).toBe("transfer");
      expect(saleEntry?.transferDirection).toBe("exit");
      expect(saleEntry?.description).toContain("Paris Saint-Germain");

      const totals = ServiceFinance.calculateTotals(report.entries);
      expect(totals.totalRevenue).toBe(40000000);
      expect(totals.netBalance).toBe(40000000);
    });
  });

  describe("3. Liquidação de Cláusula de Bônus", () => {
    it("deve registrar Despesa de € 5.000.000 com source: 'clause' ao quitar bônus de Gavi", async () => {
      const season = createMockSeason();
      const gaviPlayer: Players = {
        id: "gavi-6",
        name: "Gavi",
        overall: 87,
        sector: "Meio-Campo",
        position: "MC",
        age: 20,
        salary: 120000,
        nation: "Espanha",
        shirtNumber: "6",
        playerValue: 80000000,
        buy: false,
        captain: false,
        sell: false,
        loan: false,
        contractTime: 5,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "",
            leftClub: "",
            dataArrival: new Date("2023-07-01"),
            dataExit: null,
            bonuses: [
              {
                id: "bonus-gavi-titulos",
                name: "Conquista da Champions",
                category: "award",
                value: 5000000,
                direction: "payable",
                status: "paid",
                paid: true,
                paidSeasonId: season.id,
                paidSeasonNumber: 1,
              },
            ],
          },
        ],
      };

      season.players = [gaviPlayer];

      const report = await ServiceFinance.getReportBySeason(
        mockBarcelonaCareer.id,
        season.id,
        season.seasonNumber,
        season,
      );

      const bonusEntry = report.entries.find(
        (e) => e.id === "bonus_bonus-gavi-titulos",
      );
      expect(bonusEntry).toBeDefined();
      expect(bonusEntry?.type).toBe("expense");
      expect(bonusEntry?.amount).toBe(5000000);
      expect(bonusEntry?.source).toBe("clause");
      expect(bonusEntry?.clauseType).toBe("bonus");
      expect(bonusEntry?.description).toContain("Gavi");
      expect(bonusEntry?.description).toContain("Conquista da Champions");
    });
  });

  describe("4. Proteção de Edição e Exclusão em Cards Automáticos na Tela AddFinancialEntry", () => {
    it("não deve exibir botões de editar/excluir para transferências e cláusulas, permitindo redirecionamento", async () => {
      const season = createMockSeason();
      const onOpenTransfers = vi.fn();
      const onOpenScreen = vi.fn();

      // Inserir lançamentos manuais e automáticos no storage para a temporada
      const initialReport = {
        seasonId: season.id,
        seasonNumber: 1,
        entries: [
          {
            id: "manual-entry-1",
            type: "revenue" as const,
            category: "Ingressos",
            amount: 1500000,
            source: "manual" as const,
            isAutomatic: false,
            description: "Bilheteria Camp Nou",
          },
          {
            id: "transfer_buy_yamal-19_0",
            type: "expense" as const,
            category: "Transferências (compras de atletas)",
            amount: 60000000,
            source: "transfer" as const,
            isAutomatic: true,
            transferDirection: "arrivals" as const,
            description: "Compra de Lamine Yamal",
          },
          {
            id: "bonus_bonus-iniesta-1",
            type: "expense" as const,
            category: "Bônus de conquista",
            amount: 2000000,
            source: "clause" as const,
            isAutomatic: true,
            clauseType: "bonus" as const,
            description: "Bônus de Desempenho",
          },
        ],
      };

      localStorage.setItem(
        `finance_report_${mockBarcelonaCareer.id}_${season.id}`,
        JSON.stringify(initialReport),
      );

      const onClose = vi.fn();
      render(
        <AddFinancialEntry
          career={mockBarcelonaCareer}
          season={season}
          onClose={onClose}
          onOpenTransfers={onOpenTransfers}
          onOpenScreen={onOpenScreen}
        />,
      );

      // Espera carregar a lista
      await waitFor(() => {
        expect(screen.getByTestId("financial-entries-list")).toBeTruthy();
      });

      // Como o Tipo de Lançamento inicial é "Receita", apenas receitas aparecem
      expect(screen.getByText("Receitas da Temporada")).toBeTruthy();
      const manualCard = screen.getByTestId("financial-entry-card-manual-entry-1");
      expect(manualCard).toBeTruthy();
      expect(within(manualCard).getByRole("button", { name: /editar/i })).toBeTruthy();
      expect(within(manualCard).getByRole("button", { name: /excluir/i })).toBeTruthy();

      // Despesas não devem estar visíveis com a opção Receita ativa
      expect(screen.queryByTestId("financial-entry-card-transfer_buy_yamal-19_0")).toBeNull();
      expect(screen.queryByTestId("financial-entry-card-bonus_bonus-iniesta-1")).toBeNull();

      // Alterna o Tipo de Lançamento para "Despesa"
      const expenseSegmentBtn = screen.getByRole("button", { name: "Despesa" });
      fireEvent.click(expenseSegmentBtn);

      await waitFor(() => {
        expect(screen.getByText("Despesas da Temporada")).toBeTruthy();
      });

      // Agora as despesas devem estar visíveis e a receita oculta
      expect(screen.queryByTestId("financial-entry-card-manual-entry-1")).toBeNull();

      // Card de Transferência: NÃO deve ter Editar nem Excluir, mas sim "Ver em Transferências"
      const transferCard = screen.getByTestId(
        "financial-entry-card-transfer_buy_yamal-19_0",
      );
      expect(transferCard).toBeTruthy();
      expect(within(transferCard).queryByRole("button", { name: /editar/i })).toBeNull();
      expect(within(transferCard).queryByRole("button", { name: /excluir/i })).toBeNull();

      const transferRedirectBtn = within(transferCard).getByRole("button", {
        name: /ver lançamento em transferências/i,
      });
      expect(transferRedirectBtn).toBeTruthy();
      fireEvent.click(transferRedirectBtn);
      expect(onClose).toHaveBeenCalled();
      expect(onOpenTransfers).toHaveBeenCalledWith("arrivals");

      // Card de Cláusula: NÃO deve ter Editar nem Excluir, mas sim "Ver em Cláusulas"
      const clauseCard = screen.getByTestId(
        "financial-entry-card-bonus_bonus-iniesta-1",
      );
      expect(clauseCard).toBeTruthy();
      expect(within(clauseCard).queryByRole("button", { name: /editar/i })).toBeNull();
      expect(within(clauseCard).queryByRole("button", { name: /excluir/i })).toBeNull();

      const clauseRedirectBtn = within(clauseCard).getByRole("button", {
        name: /ver lançamento em cláusulas/i,
      });
      expect(clauseRedirectBtn).toBeTruthy();
      fireEvent.click(clauseRedirectBtn);
      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "manageClauses",
        initialTab: "arrivals",
      });
    });
  });

  describe("5. Edição e Exclusão de Lançamentos Manuais", () => {
    it("deve carregar dados no formulário, atualizar sem duplicar e excluir com modal de confirmação", async () => {
      const season = createMockSeason();

      // Começa com 1 lançamento manual
      const initialReport = {
        seasonId: season.id,
        seasonNumber: 1,
        entries: [
          {
            id: "manual-entry-tickets",
            type: "revenue" as const,
            category: "Ingressos",
            amount: 1500000,
            source: "manual" as const,
            isAutomatic: false,
          },
        ],
      };

      localStorage.setItem(
        `finance_report_${mockBarcelonaCareer.id}_${season.id}`,
        JSON.stringify(initialReport),
      );

      render(
        <AddFinancialEntry
          career={mockBarcelonaCareer}
          season={season}
          onClose={vi.fn()}
        />,
      );

      // Aguarda lista carregar com o item inicial
      await waitFor(() => {
        expect(
          screen.getByTestId("financial-entry-card-manual-entry-tickets"),
        ).toBeTruthy();
      });

      // 1. Clicar em Editar
      const card = screen.getByTestId("financial-entry-card-manual-entry-tickets");
      const editBtn = within(card).getByRole("button", { name: /editar/i });
      fireEvent.click(editBtn);

      // Deve entrar no modo edição: título muda, card some da lista e surge opção de cancelar no form
      await waitFor(() => {
        expect(screen.getByText("Editar Lançamento Financeiro")).toBeTruthy();
        expect(
          screen.getByText("Cancelar edição deste lançamento?"),
        ).toBeTruthy();
        expect(
          screen.queryByTestId("financial-entry-card-manual-entry-tickets"),
        ).toBeNull();
      });

      // 2. Alterar valor para € 2.000.000
      const amountInput = screen.getByPlaceholderText(/150k, 2.5M, 1B/i);
      fireEvent.change(amountInput, { target: { value: "2M" } });

      // 3. Clicar em Salvar Alterações no Navbar
      const saveBtn = screen.getByText("Salvar Alterações");
      fireEvent.click(saveBtn);

      // Card deve ser atualizado para 2.000.000 sem duplicar (permanece 1 lançamento)
      await waitFor(() => {
        const updatedList = screen.getByTestId("financial-entries-list");
        expect(within(updatedList).getAllByTestId(/financial-entry-card-/).length).toBe(1);
        expect(screen.getByText(/\+.*2M/i)).toBeTruthy();
      });

      // 4. Clicar em Excluir
      const updatedCard = screen.getByTestId(
        "financial-entry-card-manual-entry-tickets",
      );
      const deleteBtn = within(updatedCard).getByRole("button", {
        name: /excluir/i,
      });
      fireEvent.click(deleteBtn);

      // Modal de confirmação surge
      await waitFor(() => {
        expect(screen.getByText("Excluir Lançamento Financeiro?")).toBeTruthy();
      });

      // Clicar em Confirmar no modal
      const confirmBtn = screen.getByRole("button", { name: "Confirmar" });
      fireEvent.click(confirmBtn);

      // Item é removido da lista
      await waitFor(() => {
        expect(
          screen.queryByTestId("financial-entry-card-manual-entry-tickets"),
        ).toBeNull();
        expect(
          screen.getByText("Nenhuma receita registrada nesta temporada."),
        ).toBeTruthy();
      });
    });
  });

  describe("6. Bloqueio de Edição Direta de Lançamentos de Transferências e Cláusulas no ServiceFinance", () => {
    it("deve lançar erro caso tente chamar updateEntry em lançamentos automáticos de transferências ou cláusulas", async () => {
      const season = createMockSeason();
      const initialReport = {
        seasonId: season.id,
        seasonNumber: 1,
        entries: [
          {
            id: "transfer_buy_pedri_0",
            type: "expense" as const,
            category: "Transferências (compras de atletas)",
            amount: 70000000,
            source: "transfer" as const,
            isAutomatic: true,
          },
        ],
      };

      localStorage.setItem(
        `finance_report_${mockBarcelonaCareer.id}_${season.id}`,
        JSON.stringify(initialReport),
      );

      await expect(
        ServiceFinance.updateEntry(
          mockBarcelonaCareer.id,
          season.id,
          "transfer_buy_pedri_0",
          { amount: 80000000 },
        ),
      ).rejects.toThrow(
        "Lançamentos de transferências e cláusulas só podem ser editados em suas respectivas telas operacionais.",
      );
    });
  });

  describe("7. Filtragem por Tipo de Lançamento (Receita vs Despesa) e Redirecionamento de Parcelas", () => {
    it("deve alternar a visibilidade estrita de receitas e despesas ao mudar o Tipo de Lançamento e redirecionar parcela para manageClauses", async () => {
      const season = createMockSeason();
      const onOpenTransfers = vi.fn();
      const onOpenScreen = vi.fn();
      const onClose = vi.fn();

      const initialReport = {
        seasonId: season.id,
        seasonNumber: 1,
        entries: [
          {
            id: "rev-sponsorship",
            type: "revenue" as const,
            category: "Patrocínios",
            amount: 50000000,
            source: "manual" as const,
            isAutomatic: false,
          },
          {
            id: "rev-tickets",
            type: "revenue" as const,
            category: "Ingressos",
            amount: 15000000,
            source: "manual" as const,
            isAutomatic: false,
          },
          {
            id: "inst_pedri_0_season-1",
            type: "expense" as const,
            category: "Transferências (compras de atletas)",
            amount: 20000000,
            source: "clause" as const,
            isAutomatic: true,
            clauseType: "installment" as const,
            transferDirection: "arrivals" as const,
            description: "Pagamento de parcela referente a Pedri",
          },
        ],
      };

      localStorage.setItem(
        `finance_report_${mockBarcelonaCareer.id}_${season.id}`,
        JSON.stringify(initialReport),
      );

      render(
        <AddFinancialEntry
          career={mockBarcelonaCareer}
          season={season}
          onClose={onClose}
          onOpenTransfers={onOpenTransfers}
          onOpenScreen={onOpenScreen}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("financial-entries-list")).toBeTruthy();
      });

      // 1. Inicialmente no botão "Receita": mostra apenas as 2 receitas
      expect(screen.getByText("Receitas da Temporada")).toBeTruthy();
      expect(screen.getByText("2 receitas")).toBeTruthy();
      expect(screen.getByTestId("financial-entry-card-rev-sponsorship")).toBeTruthy();
      expect(screen.getByTestId("financial-entry-card-rev-tickets")).toBeTruthy();
      expect(screen.queryByTestId("financial-entry-card-inst_pedri_0_season-1")).toBeNull();

      // 2. Alterna para "Despesa"
      const expenseBtn = screen.getByRole("button", { name: "Despesa" });
      fireEvent.click(expenseBtn);

      await waitFor(() => {
        expect(screen.getByText("Despesas da Temporada")).toBeTruthy();
        expect(screen.getByText("1 despesa")).toBeTruthy();
      });

      expect(screen.queryByTestId("financial-entry-card-rev-sponsorship")).toBeNull();
      expect(screen.queryByTestId("financial-entry-card-rev-tickets")).toBeNull();

      const instCard = screen.getByTestId("financial-entry-card-inst_pedri_0_season-1");
      expect(instCard).toBeTruthy();

      // Parcela é cláusula: deve ter botão "Ver em Cláusulas"
      const instRedirectBtn = within(instCard).getByRole("button", {
        name: /ver lançamento em cláusulas/i,
      });
      expect(instRedirectBtn).toBeTruthy();

      fireEvent.click(instRedirectBtn);
      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "manageClauses",
        initialTab: "arrivals",
      });

      // 3. Volta para "Receita"
      const revenueBtn = screen.getByRole("button", { name: "Receita" });
      fireEvent.click(revenueBtn);

      await waitFor(() => {
        expect(screen.getByText("Receitas da Temporada")).toBeTruthy();
        expect(screen.getByText("2 receitas")).toBeTruthy();
      });
      expect(screen.getByTestId("financial-entry-card-rev-sponsorship")).toBeTruthy();
      expect(screen.queryByTestId("financial-entry-card-inst_pedri_0_season-1")).toBeNull();
    });
  });

  describe("8. Categoria totalmente sob controle do usuário e persistência com suporte a Group Careers", () => {
    it("deve permitir adicionar qualquer categoria e persistir no escopo da carreira e do grupo", async () => {
      const careerWithGroup: Career = {
        ...mockBarcelonaCareer,
        id: "barca-group-career",
        groupId: "save-group-barca-legends",
      };

      // Limpa dados prévios no localStorage
      localStorage.clear();

      render(
        <AddFinancialEntry
          career={careerWithGroup}
          season={createMockSeason()}
          onClose={vi.fn()}
        />,
      );

      // Não deve ter opções padrão pré-carregadas (usuário tem controle total)
      const categoryInput = screen.getByPlaceholderText(
        "Pesquise ou digite uma categoria...",
      );
      expect(categoryInput).toBeTruthy();

      // Digita uma nova categoria personalizada
      fireEvent.change(categoryInput, {
        target: { value: "Tour pelo Camp Nou" },
      });

      // Digita valor monetário com precisão decimal: 3.45m
      const amountInput = screen.getByPlaceholderText("Ex: 150k, 2.5M, 1B");
      fireEvent.change(amountInput, { target: { value: "3.45m" } });

      // Garante que a nota "Equivalente a:" NÃO é exibida
      expect(screen.queryByText(/equivalente a:/i)).toBeNull();

      // Salva o lançamento
      const saveBtn = screen.getByText("Salvar");
      fireEvent.click(saveBtn);

      // Deve persistir localmente e nas chaves de carreira e de grupo
      await waitFor(() => {
        const savedCareerCats = localStorage.getItem(
          "finance_categories_barca-group-career",
        );
        expect(savedCareerCats).toContain("Tour pelo Camp Nou");

        const savedGroupCats = localStorage.getItem(
          "finance_categories_group_save-group-barca-legends",
        );
        expect(savedGroupCats).toContain("Tour pelo Camp Nou");
      });
    });
  });

  describe("9. Fluxo de Edição, desaparecimento temporário do card e precisão decimal no Valor", () => {
    it("deve carregar 3.45M sem arredondar, sumir com o card em edição e cancelar pelo form", async () => {
      const season = createMockSeason();
      const initialEntry = {
        id: "entry-camp-nou",
        type: "revenue" as const,
        category: "Tour pelo Camp Nou",
        amount: 3450000,
        isAutomatic: false,
        source: "manual" as const,
      };

      localStorage.setItem(
        `finance_report_${mockBarcelonaCareer.id}_${season.id}`,
        JSON.stringify({
          seasonId: season.id,
          seasonNumber: 1,
          entries: [initialEntry],
        }),
      );

      render(
        <AddFinancialEntry
          career={mockBarcelonaCareer}
          season={season}
          onClose={vi.fn()}
        />,
      );

      // Aguarda o card renderizar exibindo valor formatado sem arredondar para 3.4M ou 3.5M
      await waitFor(() => {
        expect(
          screen.getByTestId("financial-entry-card-entry-camp-nou"),
        ).toBeTruthy();
        expect(screen.getByText(/\+.*3\.45M/i)).toBeTruthy();
      });

      // Clica em Editar
      const card = screen.getByTestId("financial-entry-card-entry-camp-nou");
      const editBtn = within(card).getByRole("button", { name: /editar/i });
      fireEvent.click(editBtn);

      // O card sendo editado DEVE sumir da lista abaixo durante a edição
      await waitFor(() => {
        expect(screen.getByText("Editar Lançamento Financeiro")).toBeTruthy();
        expect(
          screen.queryByTestId("financial-entry-card-entry-camp-nou"),
        ).toBeNull();
      });

      // O input de valor deve estar com formatação compacta '3.45M', não o número bruto '3450000'
      const amountInput = screen.getByPlaceholderText(
        "Ex: 150k, 2.5M, 1B",
      ) as HTMLInputElement;
      expect(amountInput.value).toBe("3.45M");

      // O botão de cancelar edição deve estar dentro da seção de dados de lançamento como última opção
      const cancelOption = screen.getByText(
        "Cancelar edição deste lançamento?",
      );
      expect(cancelOption).toBeTruthy();

      // Clica no botão 'Sim' associado à opção de cancelar
      const cancelSection = cancelOption.closest("div");
      const cancelBtn = within(cancelSection!).getByRole("button", {
        name: "Sim",
      });
      fireEvent.click(cancelBtn);

      // Ao cancelar, o card deve reaparecer na lista e o formulário volta a 'Novo Lançamento'
      await waitFor(() => {
        expect(
          screen.getByTestId("financial-entry-card-entry-camp-nou"),
        ).toBeTruthy();
        expect(screen.getByText("Novo Lançamento Financeiro")).toBeTruthy();
        expect(
          screen.queryByText("Cancelar edição deste lançamento?"),
        ).toBeNull();
      });
    });
  });
});
