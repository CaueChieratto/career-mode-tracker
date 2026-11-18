// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  buildBudgetCopyText,
  formatFinanceCopyValue,
} from "../layout/SectionView/features/ClubTabs/FinanceTab/components/BudgetOverviewCard/helpers/buildBudgetCopyText";
import { BudgetOverviewCard } from "../layout/SectionView/features/ClubTabs/FinanceTab/components/BudgetOverviewCard";
import { Copy } from "../common/utils/Copy";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { FinancialEntry } from "../common/interfaces/finance";

vi.mock("../common/utils/Copy", () => ({
  Copy: vi.fn().mockResolvedValue(true),
}));

const mockCareer: Career = {
  id: "career-barcelona",
  managerName: "Hansi Flick",
  clubName: "FC Barcelona",
  teamBadge: "barcelona.png",
  nation: "Espanha",
  currency: "EUR",
  trophies: [],
  createdAt: new Date("2025-07-01"),
  colorsTeams: ["#004D98", "#A50044"],
  clubData: [
    {
      id: "season-1",
      seasonNumber: 1,
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

describe("buildBudgetCopyText e cópia no BudgetOverviewCard", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("formata valores corretamente com duas casas decimais, vírgula e unidade", () => {
    expect(formatFinanceCopyValue(77_560_000)).toBe("77,56 Milhões");
    expect(formatFinanceCopyValue(15_900_000)).toBe("15,90 Milhões");
    expect(formatFinanceCopyValue(57_000_000)).toBe("57,00 Milhões");
    expect(formatFinanceCopyValue(1_810_000)).toBe("1,81 Milhões");
    expect(formatFinanceCopyValue(1_000_000)).toBe("1,00 Milhão");
    expect(formatFinanceCopyValue(374_890)).toBe("374,89 Mil");
    expect(formatFinanceCopyValue(842_000)).toBe("842,00 Mil");
    expect(formatFinanceCopyValue(10_410)).toBe("10,41 Mil");
    expect(formatFinanceCopyValue(1_000_000_000)).toBe("1,00 Bilhão");
    expect(formatFinanceCopyValue(2_350_000_000)).toBe("2,35 Bilhões");
    expect(formatFinanceCopyValue(500)).toBe("500");
    expect(formatFinanceCopyValue(0)).toBe("0");
  });

  it("gera o texto no formato exato de Receitas e Despesas", () => {
    const text = buildBudgetCopyText({
      totalRevenue: 77_560_000,
      totalExpense: 44_290_000,
      revenueCategories: [
        { category: "Transferências", amount: 15_900_000 },
        { category: "Produtos", amount: 4_270_000 },
        { category: "Ingressos", amount: 374_890 },
        { category: "Sócio Torcedor", amount: 10_410 },
        { category: "Prêmios em dinheiro", amount: 57_000_000 },
      ],
      expenseCategories: [
        { category: "Rede de obs.", amount: 4_060_000 },
        { category: "Salários de atletas", amount: 34_490_000 },
        { category: "Salários Aux.Técnicos", amount: 2_480_000 },
        { category: "Transferências", amount: 1_810_000 },
        { category: "Custos de viagens", amount: 842_000 },
        { category: "Instalações da base", amount: 480_000 },
        { category: "Despesas de auxiliares", amount: 70_130 },
        { category: "Manutenção estádio", amount: 61_320 },
      ],
    });

    expect(text).toBe(
      [
        "Receitas:",
        "Total - 77,56 Milhões",
        "Transferências - 15,90 Milhões",
        "Produtos - 4,27 Milhões",
        "Ingressos - 374,89 Mil",
        "Sócio Torcedor - 10,41 Mil",
        "Prêmios em dinheiro - 57,00 Milhões",
        "Despesas:",
        "Total - 44,29 Milhões",
        "Rede de obs. - 4,06 Milhões",
        "Salários de atletas - 34,49 Milhões",
        "Salários Aux.Técnicos - 2,48 Milhões",
        "Transferências - 1,81 Milhões",
        "Custos de viagens - 842,00 Mil",
        "Instalações da base - 480,00 Mil",
        "Despesas de auxiliares - 70,13 Mil",
        "Manutenção estádio - 61,32 Mil",
      ].join("\n"),
    );
  });

  it("ao clicar no botão de copiar no BudgetOverviewCard, chama Copy com o relatório formatado", () => {
    const entries: FinancialEntry[] = [
      { id: "r1", type: "revenue", category: "Prêmios em dinheiro", amount: 57_000_000 },
      { id: "r2", type: "revenue", category: "Transferências", amount: 15_900_000 },
      { id: "r3", type: "revenue", category: "Ingressos", amount: 374_890 },
      { id: "e1", type: "expense", category: "Salários de atletas", amount: 34_490_000 },
      { id: "e2", type: "expense", category: "Instalações da base", amount: 480_000 },
    ];

    render(
      <BudgetOverviewCard
        career={mockCareer}
        season={mockSeason}
        notSeason={false}
        initialEntries={entries}
      />,
    );

    const copyButton = screen.getByTestId("btn-copy-budget-report");
    fireEvent.click(copyButton);

    const expectedText = [
      "Receitas:",
      "Total - 73,27 Milhões",
      "Prêmios em dinheiro - 57,00 Milhões",
      "Transferências - 15,90 Milhões",
      "Ingressos - 374,89 Mil",
      "Despesas:",
      "Total - 34,97 Milhões",
      "Salários de atletas - 34,49 Milhões",
      "Instalações da base - 480,00 Mil",
    ].join("\n");

    expect(Copy).toHaveBeenCalledTimes(1);
    expect(Copy).toHaveBeenCalledWith(
      expectedText,
      "Relatório financeiro copiado com sucesso!",
    );
  });
});
