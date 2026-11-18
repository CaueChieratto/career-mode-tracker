// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { buildSaleClausesSections } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import { buildRenewalBonusSection } from "../layout/SectionView/features/ClubTabs/SquadTab/views/RenewPlayer/constants/buildRenewalFormSections";
import { RenewalFormValues } from "../layout/SectionView/features/ClubTabs/SquadTab/views/RenewPlayer/types";
import { useTransferBonusesForm } from "../layout/SectionView/hooks/useTransferBonusesForm";
import { validateTransfer } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/validators/transferValidator";
import { reconcileSeasonFinancialEntries } from "../common/services/ServiceFinance/reconciliation";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Career } from "../common/interfaces/Career";
import { TransferBonus } from "../common/interfaces/playersInfo/transferTerms";
import { Match } from "../common/interfaces/Match";

// Mocks do Firebase
vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "barca-user" } },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn(),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(),
}));

const barcaCareer: Career = {
  id: "career-fc-barcelona",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  createdAt: new Date("2024-07-01"),
  teamBadge: "",
  nation: "ESP",
  currency: "EUR",
  colorsTeams: ["#004d98", "#a50044"],
  trophies: [],
  customBonusObjectives: {},
  clubData: [],
};

describe("1. Bônus & Metas - Seleção Única de Objetivos de Desempenho", () => {
  it("buildSaleClausesSections filtra objetivos de desempenho já adicionados", () => {
    const existingBonuses: TransferBonus[] = [
      {
        id: "bonus-1",
        direction: "receivable",
        category: "performance",
        bonusCategory: "Desempenho",
        name: "Gols marcados",
        bonusTarget: "Gols marcados",
        value: 1000000,
        status: "pending",
      },
    ];

    const result = buildSaleClausesSections(
      {
        hasBonus: true,
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasOtherClauses: false,
        firstRefusal: false,
        hasBuyOption: false,
      },
      { bonusCategory: "Desempenho" },
      {},
      existingBonuses,
      null,
    );

    // "Gols marcados" não deve estar nas opções
    expect(result.objectiveOptions).not.toContain("Gols marcados");
    // Mas os outros objetivos de desempenho devem continuar disponíveis
    expect(result.objectiveOptions).toContain("Assistências");
    expect(result.objectiveOptions).toContain("Partidas");
    expect(result.objectiveOptions).toContain("Partidas sem sofrer gols");
  });

  it("buildSaleClausesSections mantém o objetivo disponível quando em edição (editingBonusIndex)", () => {
    const existingBonuses: TransferBonus[] = [
      {
        id: "bonus-1",
        direction: "receivable",
        category: "performance",
        bonusCategory: "Desempenho",
        name: "Gols marcados",
        bonusTarget: "Gols marcados",
        value: 1000000,
        status: "pending",
      },
      {
        id: "bonus-2",
        direction: "receivable",
        category: "performance",
        bonusCategory: "Desempenho",
        name: "Assistências",
        bonusTarget: "Assistências",
        value: 500000,
        status: "pending",
      },
    ];

    // Editando o bônus de índice 0 ("Gols marcados")
    const result = buildSaleClausesSections(
      {
        hasBonus: true,
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasOtherClauses: false,
        firstRefusal: false,
        hasBuyOption: false,
      },
      { bonusCategory: "Desempenho" },
      {},
      existingBonuses,
      0,
    );

    // "Gols marcados" deve permanecer disponível porque é o que está sendo editado
    expect(result.objectiveOptions).toContain("Gols marcados");
    // "Assistências" deve continuar excluído porque pertence ao outro bônus (índice 1)
    expect(result.objectiveOptions).not.toContain("Assistências");
  });

  it("buildRenewalBonusSection filtra objetivos de desempenho já adicionados em renovações/chegadas", () => {
    const bonuses: TransferBonus[] = [
      {
        id: "b-pedri-1",
        direction: "payable",
        category: "performance",
        bonusCategory: "Desempenho",
        name: "Assistências",
        bonusTarget: "Assistências",
        value: 800000,
        status: "pending",
      },
    ];

    const section = buildRenewalBonusSection(
      bonuses,
      null,
      { bonusCategory: "Desempenho" } as unknown as RenewalFormValues,
    );

    expect(section.objectiveOptions).not.toContain("Assistências");
    expect(section.objectiveOptions).toContain("Gols marcados");
    expect(section.objectiveOptions).toContain("Partidas");
  });

  it("useTransferBonusesForm impede adicionar objetivo de desempenho duplicado", () => {
    const { result } = renderHook(() => useTransferBonusesForm());

    const bonus1: TransferBonus = {
      id: "b1",
      direction: "receivable",
      category: "performance",
      bonusCategory: "Desempenho",
      name: "Gols marcados",
      bonusTarget: "Gols marcados",
      value: 1000000,
      status: "pending",
    };

    const bonusDuplicate: TransferBonus = {
      id: "b2",
      direction: "receivable",
      category: "performance",
      bonusCategory: "Desempenho",
      name: "Gols marcados",
      bonusTarget: "Gols marcados",
      value: 2000000,
      status: "pending",
    };

    let addedFirst = false;
    let addedDuplicate = false;

    act(() => {
      addedFirst = result.current.handleAddOrEditBonus(bonus1);
    });
    expect(addedFirst).toBe(true);
    expect(result.current.bonuses).toHaveLength(1);

    act(() => {
      addedDuplicate = result.current.handleAddOrEditBonus(bonusDuplicate);
    });
    expect(addedDuplicate).toBe(false);
    expect(result.current.bonuses).toHaveLength(1);
  });

  it("validateTransfer rejeita bônus de desempenho duplicados em draftedBonuses", () => {
    const duplicateBonuses: TransferBonus[] = [
      {
        id: "b1",
        direction: "receivable",
        category: "performance",
        bonusCategory: "Desempenho",
        name: "Gols marcados",
        bonusTarget: "Gols marcados",
        value: 1000000,
        status: "pending",
      },
      {
        id: "b2",
        direction: "receivable",
        category: "performance",
        bonusCategory: "Desempenho",
        name: "Gols marcados",
        bonusTarget: "Gols marcados",
        value: 1500000,
        status: "pending",
      },
    ];

    const validation = validateTransfer(
      {
        sellValue: "50M",
        toClub: "PSG",
        dateExit: "10/08",
      },
      {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: true,
        hasOtherClauses: false,
        firstRefusal: false,
        hasBuyOption: false,
      },
      1,
      duplicateBonuses,
    );

    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain("já foi selecionado");
  });
});

describe("2. Transferências do tipo Próxima Janela no Relatório Financeiro", () => {
  it("NÃO entra como receita no relatório financeiro se a janela não abriu e o jogador não saiu", () => {
    const pedri: Players = {
      id: "p_pedri",
      name: "Pedri",
      overall: 89,
      position: "MC",
      sector: "Meio-Campo",
      age: 22,
      shirtNumber: "8",
      nation: "ESP",
      buy: false,
      sell: false, // Ainda no clube (não saiu)
      captain: false,
      ballonDor: 0,
      statsLeagues: [],
      contract: [
        {
          buyValue: 0,
          fromClub: "FC Barcelona",
          dataArrival: null,
          leftClub: "Manchester City",
          sellValue: 100000000,
          timing: "Proxima Janela",
          dataExit: new Date("2024-07-15"), // Acordo em julho
        },
      ],
    };

    // Temporada sem partidas finalizadas em dezembro que abram a janela de janeiro
    const season: ClubData = {
      id: "s_2024_2025",
      seasonNumber: 1,
      players: [pedri],
      matches: [
        {
          id: "m_1",
          adversary: "Real Madrid",
          date: "10/08/2024",
          status: "FINISHED",
        } as unknown as Match,
      ],
    };

    const entries = reconcileSeasonFinancialEntries(season, [], barcaCareer);

    // Não deve conter a entrada de receita de venda do Pedri
    const saleEntry = entries.find((e) => e.id === "transfer_sell_p_pedri_0");
    expect(saleEntry).toBeUndefined();
  });

  it("remove entrada automática prévia de venda com Próxima Janela se a janela ainda não abriu nem o jogador saiu", () => {
    const pedri: Players = {
      id: "p_pedri",
      name: "Pedri",
      overall: 89,
      position: "MC",
      sector: "Meio-Campo",
      age: 22,
      shirtNumber: "8",
      nation: "ESP",
      buy: false,
      sell: false,
      captain: false,
      ballonDor: 0,
      statsLeagues: [],
      contract: [
        {
          buyValue: 0,
          fromClub: "FC Barcelona",
          dataArrival: null,
          leftClub: "Manchester City",
          sellValue: 100000000,
          timing: "Proxima Janela",
          dataExit: new Date("2024-07-15"),
        },
      ],
    };

    const season: ClubData = {
      id: "s_2024_2025",
      seasonNumber: 1,
      players: [pedri],
      matches: [],
    };

    // Simulando que existia uma entrada anterior salva prematuramente
    const existingEntries = [
      {
        id: "transfer_sell_p_pedri_0",
        type: "revenue" as const,
        category: "Transferências (vendas de atletas)",
        amount: 100000000,
        isAutomatic: true,
        source: "transfer" as const,
      },
    ];

    const entries = reconcileSeasonFinancialEntries(season, existingEntries, barcaCareer);
    const saleEntry = entries.find((e) => e.id === "transfer_sell_p_pedri_0");
    expect(saleEntry).toBeUndefined();
  });

  it("ENTRA como receita no relatório financeiro quando o jogador já saiu (player.sell = true)", () => {
    const pedri: Players = {
      id: "p_pedri",
      name: "Pedri",
      overall: 89,
      position: "MC",
      sector: "Meio-Campo",
      age: 22,
      shirtNumber: "8",
      nation: "ESP",
      buy: false,
      sell: true, // Jogador já saiu
      captain: false,
      ballonDor: 0,
      statsLeagues: [],
      contract: [
        {
          buyValue: 0,
          fromClub: "FC Barcelona",
          dataArrival: null,
          leftClub: "Manchester City",
          sellValue: 100000000,
          timing: "Proxima Janela",
          dataExit: new Date("2024-07-15"),
        },
      ],
    };

    const season: ClubData = {
      id: "s_2024_2025",
      seasonNumber: 1,
      players: [pedri],
      matches: [],
    };

    const entries = reconcileSeasonFinancialEntries(season, [], barcaCareer);
    const saleEntry = entries.find((e) => e.id === "transfer_sell_p_pedri_0");
    expect(saleEntry).toBeDefined();
    expect(saleEntry?.amount).toBe(100000000);
    expect(saleEntry?.type).toBe("revenue");
  });

  it("ENTRA como receita no relatório financeiro quando a janela abre através das partidas (shouldPlayerLeaveOnNextWindow)", () => {
    const gavi: Players = {
      id: "p_gavi",
      name: "Gavi",
      overall: 88,
      position: "MC",
      sector: "Meio-Campo",
      age: 20,
      shirtNumber: "6",
      nation: "ESP",
      buy: false,
      sell: false, // Ainda marcado como false, mas calendário avançou para a janela
      captain: false,
      ballonDor: 0,
      statsLeagues: [],
      contract: [
        {
          buyValue: 0,
          fromClub: "FC Barcelona",
          dataArrival: null,
          leftClub: "Bayern München",
          sellValue: 90000000,
          timing: "Proxima Janela",
          dataExit: new Date("2024-07-20"), // Acordo no verão
        },
      ],
    };

    // Acordo feito em julho/2024. A janela de inverno abre quando o mês antecedente (dezembro)
    // tem sua última partida FINISHED e há avanço no calendário (jogo em janeiro).
    const season: ClubData = {
      id: "s_2024_2025",
      seasonNumber: 1,
      players: [gavi],
      matches: [
        {
          id: "m_dec",
          adversary: "Sevilla",
          date: "31/12/2024",
          status: "FINISHED",
        } as unknown as Match,
        {
          id: "m_jan",
          adversary: "Athletic Club",
          date: "04/01/2025",
          status: "SCHEDULED",
        } as unknown as Match,
      ],
    };

    const entries = reconcileSeasonFinancialEntries(season, [], barcaCareer);
    const saleEntry = entries.find((e) => e.id === "transfer_sell_p_gavi_0");
    expect(saleEntry).toBeDefined();
    expect(saleEntry?.amount).toBe(90000000);
    expect(saleEntry?.type).toBe("revenue");
  });
});
