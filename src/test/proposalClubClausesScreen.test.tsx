// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { ProposalClubClauses } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ProposalClubClauses";
import { buildSaleClausesSections } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import { resolveContractPlayerClauses } from "../common/helpers/contractPlayerClauses";
import { ServiceProposals } from "../common/services/ServiceProposals";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";

// Mock dependencies
vi.mock("../common/services/Firebase", () => ({
  auth: { currentUser: { uid: "user_barca_123" } },
  db: {},
}));

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

const emptyToasts: unknown[] = [];

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    warning: vi.fn(),
    info: vi.fn(),
  },
  toastStore: {
    subscribe: vi.fn(() => vi.fn()),
    getSnapshot: vi.fn(() => emptyToasts),
  },
  useToast: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    getProposalById: vi.fn(),
    updateProposal: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    activeStyle: {
      color: "#ffffff",
      darkClubColor: "#a50044",
      backgroundColor: "#004d98",
      primaryColor: "#004d98",
    },
  }),
}));

vi.mock("../common/hooks/Colors/UseClubColors", () => ({
  useClubColors: () => ({
    clubColor: "#004d98",
    activeStyle: {
      color: "#ffffff",
      darkClubColor: "#a50044",
      backgroundColor: "#004d98",
      primaryColor: "#004d98",
    },
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/Career/c_barca/Season/s_2024_2025" }),
  };
});

describe("Frente 5: Tela Dedicada 'Cláusulas do Clube' (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockCareer: Career = {
    id: "c_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "https://example.com/barca.png",
    currency: "EUR",
    nation: "ESP",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    createdAt: new Date("2024-07-01"),
    updatedAt: Date.now(),
    clubData: [],
  };

  const mockSeason: ClubData = {
    id: "s_2024_2025",
    seasonNumber: 1,
    players: [
      {
        id: "p_gavi",
        name: "Gavi",
        position: "MC",
        sector: "Meio-Campo",
        overall: 84,
        age: 20,
        playerValue: 90000000,
        nation: "ESP",
        shirtNumber: "6",
        captain: false,
        buy: false,
        sell: false,
        ballonDor: 0,
        contract: [],
        statsLeagues: [],
      },
      {
        id: "p_ferran",
        name: "Ferran Torres",
        position: "ATA",
        sector: "Ataque",
        overall: 81,
        age: 24,
        playerValue: 35000000,
        nation: "ESP",
        shirtNumber: "7",
        captain: false,
        buy: false,
        sell: false,
        ballonDor: 0,
        contract: [],
        statsLeagues: [],
      },
    ],
    matches: [],
  };

  const barcaPurchaseProposal: TransferProposal = {
    id: "prop_dani_olmo_purchase",
    careerId: "c_barca",
    seasonId: "s_2024_2025",
    type: "compra",
    overallStatus: "em_andamento",
    playerId: "p_olmo",
    playerName: "Dani Olmo",
    shirtNumber: "20",
    playerPosition: "MEI",
    playerSector: "Meio-Campo",
    playerOverall: 84,
    playerAge: 26,
    playerNation: "ESP",
    timing: "Imediata",
    clubNegotiation: {
      status: "em_negociacao",
      partnerClub: "RB Leipzig",
      transferFee: 55000000,
    },
    playerNegotiation: {
      status: "aceita",
      weeklyWage: 180000,
      durationYears: 5,
      squadRole: "Crucial",
    },
  };

  const barcaProposal: TransferProposal = {
    id: "prop_pedri_transfer",
    careerId: "c_barca",
    seasonId: "s_2024_2025",
    type: "venda",
    overallStatus: "em_andamento",
    playerId: "p_pedri",
    playerName: "Pedri",
    shirtNumber: "8",
    playerPosition: "MC",
    playerSector: "Meio-Campo",
    playerOverall: 89,
    playerAge: 22,
    playerNation: "ESP",
    timing: "Imediata",
    clubNegotiation: {
      status: "em_negociacao",
      partnerClub: "Las Palmas",
      transferFee: 60000000,
      sellOnPercentage: 15,
      bonuses: [
        {
          id: "b_1",
          direction: "receivable",
          category: "performance",
          name: "20 Jogos",
          value: 5000000,
          status: "pending",
        },
      ],
    },
    playerNegotiation: {
      status: "aceita",
      weeklyWage: 200000,
      durationYears: 5,
      squadRole: "Crucial",
    },
  };

  it("deve carregar a proposta, renderizar cabeçalho e módulos de clube sem exibir módulos do atleta", async () => {
    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(
      barcaProposal,
    );

    render(
      <ProposalClubClauses
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_pedri_transfer"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Cláusulas do Clube")).not.toBeNull();
    });

    expect(screen.getByText("1. Parcelamento")).not.toBeNull();
    expect(screen.getByText("2. Atleta de Troca")).not.toBeNull();
    expect(screen.getByText(/3\. Bônus/i)).not.toBeNull();
    expect(screen.getByText(/4\. Cláusulas Especiais/i)).not.toBeNull();

    expect(screen.queryByText("Multa Rescisória")).toBeNull();
    expect(screen.queryByText("Salário e Luvas")).toBeNull();
    expect(screen.queryByText("Ajuste Salarial")).toBeNull();
  });

  it("ao salvar cláusulas, deve atualizar clubNegotiation.status para 'aceita' e chamar onClose", async () => {
    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(
      barcaProposal,
    );
    const mockOnClose = vi.fn();

    render(
      <ProposalClubClauses
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_pedri_transfer"
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Salvar Cláusulas")).not.toBeNull();
    });

    const saveBtn = screen.getByText("Salvar Cláusulas");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
        "c_barca",
        "s_2024_2025",
        "prop_pedri_transfer",
        expect.objectContaining({
          clubNegotiation: expect.objectContaining({
            status: "aceita",
          }),
        }),
      );
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Cláusulas do clube salvas com sucesso!",
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("em compras, o drawer de Atleta de Troca deve exibir searchableSelect apenas com atletas do clube e atualizar o card localmente ao Concluir sem persistir na API", async () => {
    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(
      barcaPurchaseProposal,
    );

    render(
      <ProposalClubClauses
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_dani_olmo_purchase"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("2. Atleta de Troca")).not.toBeNull();
    });

    // Inicialmente card mostra "Nenhum"
    expect(screen.getAllByText("Nenhum").length).toBeGreaterThan(0);

    // Clica para abrir o Drawer de Atleta de Troca
    const swapCardBtn = screen.getByText("Gerenciar Jogador");
    fireEvent.click(swapCardBtn);

    // O Drawer deve estar aberto com título apropriado
    await waitFor(() => {
      expect(screen.getByText("Atleta de Troca (Do seu Clube)")).not.toBeNull();
    });

    // Deve ter SearchableSelect com placeholder de atleta do elenco
    const selectInput = screen.getByPlaceholderText(
      "Selecione um atleta do elenco...",
    );
    expect(selectInput).not.toBeNull();

    // NÃO deve permitir digitação de nome arbitrário, nem campos de valor, setor ou posição editáveis
    expect(screen.queryByPlaceholderText("Ex: Gabriel Silva")).toBeNull();
    expect(screen.queryByPlaceholderText("Ex: 20M, 500k")).toBeNull();

    // Digita "Ferran" e seleciona a opção
    fireEvent.focus(selectInput);
    fireEvent.change(selectInput, { target: { value: "Ferran" } });

    await waitFor(() => {
      expect(screen.getByText("Ferran Torres")).not.toBeNull();
    });

    const optionItem = screen.getByText("Ferran Torres");
    fireEvent.mouseDown(optionItem);

    // O card de resumo do atleta selecionado deve ser exibido com botão de remover
    await waitFor(() => {
      expect(screen.getByText("Remover Atleta da Troca")).not.toBeNull();
      expect(screen.getAllByText(/35M/i).length).toBeGreaterThan(0);
    });

    // Clica em Concluir no Drawer (deve salvar no estado local e fechar o drawer)
    const concludeBtn = screen.getByRole("button", { name: "Concluir" });
    fireEvent.click(concludeBtn);

    // O drawer fecha e o Card 2 atualiza para "1 Atleta"
    await waitFor(() => {
      expect(screen.getByText("1 Atleta")).not.toBeNull();
      expect(screen.getByText("Ferran Torres")).not.toBeNull();
    });

    // NENHUMA persistência na API deve ter ocorrido ainda
    expect(ServiceProposals.updateProposal).not.toHaveBeenCalled();

    // Agora clica no botão oficial de Salvar Cláusulas no Navbar
    const saveNavbarBtn = screen.getByText("Salvar Cláusulas");
    fireEvent.click(saveNavbarBtn);

    await waitFor(() => {
      expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
        "c_barca",
        "s_2024_2025",
        "prop_dani_olmo_purchase",
        expect.objectContaining({
          clubNegotiation: expect.objectContaining({
            status: "aceita",
            swapPlayer: expect.objectContaining({
              playerName: "Ferran Torres",
              playerValue: 35000000,
            }),
          }),
        }),
      );
    });
  });

  it("ao configurar Parcelamento no drawer e clicar em Concluir, atualiza o card de Parcelamento no estado local sem chamar updateProposal", async () => {
    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(
      barcaPurchaseProposal,
    );

    render(
      <ProposalClubClauses
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_dani_olmo_purchase"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("1. Parcelamento")).not.toBeNull();
    });

    // Abre Drawer de Parcelamento
    const configInstBtn = screen.getByText("Configurar Parcelamento");
    fireEvent.click(configInstBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Parcelamento Financeiro (Clube Vendedor)"),
      ).not.toBeNull();
    });

    // Seleciona "20% do total" no CustomSelect de Porcentagem
    const triggers = screen.getAllByRole("combobox");
    fireEvent.mouseDown(triggers[0]);
    const opt20 = screen.getByRole("option", { name: "20% do total" });
    fireEvent.mouseDown(opt20);

    // Clica em Concluir
    const concludeBtn = screen.getAllByText("Concluir")[0];
    fireEvent.click(concludeBtn);

    // O card de Parcelamento deve atualizar com o badge de ativo
    await waitFor(() => {
      expect(screen.getByText(/20% Ativo/i)).not.toBeNull();
    });

    // Nenhuma chamada ao Firestore
    expect(ServiceProposals.updateProposal).not.toHaveBeenCalled();
  });

  it("ao cancelar/fechar o drawer sem concluir, descarta as alterações restaurando o snapshot anterior", async () => {
    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(
      barcaPurchaseProposal,
    );

    render(
      <ProposalClubClauses
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_dani_olmo_purchase"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("2. Atleta de Troca")).not.toBeNull();
    });

    // Abre Drawer de Atleta de Troca
    const swapCardBtn = screen.getByText("Gerenciar Jogador");
    fireEvent.click(swapCardBtn);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Selecione um atleta do elenco..."),
      ).not.toBeNull();
    });

    const selectInput = screen.getByPlaceholderText(
      "Selecione um atleta do elenco...",
    );
    fireEvent.focus(selectInput);
    fireEvent.change(selectInput, { target: { value: "Gavi" } });

    await waitFor(() => {
      expect(screen.getAllByText("Gavi").length).toBeGreaterThan(0);
    });

    const gaviOption = screen.getAllByText("Gavi")[0];
    fireEvent.mouseDown(gaviOption);

    // O card de resumo é exibido
    await waitFor(() => {
      expect(screen.getByText("Remover Atleta da Troca")).not.toBeNull();
    });

    // Clica em Fechar (cancelar)
    const cancelBtn = screen.getAllByRole("button", { name: "Fechar" })[0];
    fireEvent.click(cancelBtn);

    // O card no grid deve continuar como Nenhum (não foi comitado)
    await waitFor(() => {
      expect(screen.queryByText("1 Atleta")).toBeNull();
    });
  });

  it("ao selecionar 'Sem parcelas' no drawer e concluir, desativa o parcelamento e remove as parcelas ao salvar", async () => {
    const proposalWithInstallments: TransferProposal = {
      ...barcaPurchaseProposal,
      clubNegotiation: {
        ...barcaPurchaseProposal.clubNegotiation!,
        status: "em_negociacao" as const,
        installments: {
          id: "inst_test_1",
          direction: "payable",
          status: "pending",
          percentage: 20,
          totalInstallments: 2,
          remainingInstallments: 2,
          annualInstallmentValue: 5500000,
          upfrontValue: 44000000,
          firstPaymentSeasonNumber: 1,
          partnerClub: "RB Leipzig",
        },
      },
      formState: {
        formValues: {
          installmentsPercentage: "20% do total",
          installmentsYears: "2",
        },
        booleanValues: {
          hasInstallments: true,
        },
      },
    };

    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(
      proposalWithInstallments,
    );

    render(
      <ProposalClubClauses
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_dani_olmo_purchase"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("1. Parcelamento")).not.toBeNull();
      expect(screen.getByText(/20% Ativo/i)).not.toBeNull();
    });

    // Abre Drawer de Parcelamento
    const editInstBtn = screen.getByText("Configurar Parcelamento");
    fireEvent.click(editInstBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Parcelamento Financeiro (Clube Vendedor)"),
      ).not.toBeNull();
    });

    // O valor atual é "20% do total"; selecionamos "Nenhum" no CustomSelect de Porcentagem
    const pctTrigger = screen.getByText("20% do total");
    fireEvent.mouseDown(pctTrigger);
    const noneOption = screen.getByRole("option", { name: "Nenhum" });
    fireEvent.mouseDown(noneOption);

    // Clica em Concluir
    const concludeBtn = screen.getAllByText("Concluir")[0];
    fireEvent.click(concludeBtn);

    // O card de Parcelamento deve mostrar "Inativo"
    await waitFor(() => {
      expect(screen.getByText("Inativo")).not.toBeNull();
    });

    // Salva no Navbar
    const saveNavbarBtn = screen.getByText("Salvar Cláusulas");
    fireEvent.click(saveNavbarBtn);

    await waitFor(() => {
      expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
        "c_barca",
        "s_2024_2025",
        "prop_dani_olmo_purchase",
        expect.objectContaining({
          clubNegotiation: expect.objectContaining({
            installments: undefined,
          }),
        }),
      );
    });
  });

  it("as options do customSelect de parcelamento seguem estritamente 'X% do total' e 'X Parcelas'", () => {
    const sections = buildSaleClausesSections(
      {} as Parameters<typeof buildSaleClausesSections>[0],
      { sellValue: "10M" },
    );

    expect(sections.percentageOptions).toEqual([
      "Nenhum",
      "20% do total",
      "40% do total",
      "60% do total",
      "80% do total",
      "100% do total",
    ]);

    expect(sections.seasonsOptions).toEqual([
      "Nenhum",
      "1 Parcela",
      "2 Parcelas",
      "3 Parcelas",
      "4 Parcelas",
      "5 Parcelas",
      "6 Parcelas",
      "7 Parcelas",
    ]);
  });

  it("quando isArrivals é true, não inclui 'Parcelas já liquidadas / pagas' nem 'Status do bônus'", () => {
    const arrivalSections = buildSaleClausesSections(
      {} as Parameters<typeof buildSaleClausesSections>[0],
      { sellValue: "10M" },
      undefined,
      [],
      null,
      true, // isArrivals
    );

    const hasPaidInstallments = arrivalSections.installmentsSection.fields.some(
      (row) => row.some((field) => field.id === "paidInstallments"),
    );
    expect(hasPaidInstallments).toBe(false);

    const hasBonusStatus = arrivalSections.bonusSection.fields.some((row) =>
      row.some((field) => field.id === "bonusStatus"),
    );
    expect(hasBonusStatus).toBe(false);

    const exitSections = buildSaleClausesSections(
      {} as Parameters<typeof buildSaleClausesSections>[0],
      { sellValue: "10M" },
      undefined,
      [],
      null,
      false, // isExit (isArrivals = false)
    );

    const exitHasPaidInstallments =
      exitSections.installmentsSection.fields.some((row) =>
        row.some((field) => field.id === "paidInstallments"),
      );
    expect(exitHasPaidInstallments).toBe(true);

    const exitHasBonusStatus = exitSections.bonusSection.fields.some((row) =>
      row.some((field) => field.id === "bonusStatus"),
    );
    expect(exitHasBonusStatus).toBe(true);

    const proposalExitSections = buildSaleClausesSections(
      {} as Parameters<typeof buildSaleClausesSections>[0],
      { sellValue: "10M" },
      undefined,
      [],
      null,
      false, // isArrivals = false
      undefined,
      true, // isProposal = true
    );
    expect(
      proposalExitSections.installmentsSection.fields.some((row) =>
        row.some((field) => field.id === "paidInstallments"),
      ),
    ).toBe(false);
    expect(
      proposalExitSections.bonusSection.fields.some((row) =>
        row.some((field) => field.id === "bonusStatus"),
      ),
    ).toBe(false);
  });

  it("ao adicionar bônus de desempenho em cláusulas do clube, salva a contagem de partidas (targetCount e metricTarget) e exibe '10 Partidas'", async () => {
    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(
      barcaPurchaseProposal,
    );

    render(
      <ProposalClubClauses
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_dani_olmo_purchase"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("3. Bônus & Metas")).not.toBeNull();
    });

    // Abre Drawer de Bônus
    const bonusBtn = screen.getByText("Adicionar / Editar Bônus");
    fireEvent.click(bonusBtn);

    await waitFor(() => {
      expect(screen.getByText("Objetivo atingido")).not.toBeNull();
    });

    // Seleciona Categoria: Desempenho no CustomSelect
    const catTrigger = screen.getByText("Objetivo atingido");
    fireEvent.mouseDown(catTrigger);
    const perfOption = screen.getByRole("option", { name: "Desempenho" });
    fireEvent.mouseDown(perfOption);

    // Seleciona Objetivo: Partidas no SearchableSelect
    const objInput = screen.getByPlaceholderText(
      "Selecione ou digite o objetivo",
    );
    fireEvent.focus(objInput);
    fireEvent.change(objInput, { target: { value: "Partidas" } });
    const partOption = screen.getByText("Partidas");
    fireEvent.mouseDown(partOption);

    // Preenche Contagem: 10
    const countInput = screen.getByPlaceholderText("Ex: 10, 25");
    fireEvent.change(countInput, { target: { value: "10" } });

    // Preenche Valor: 1M
    const valInput = screen.getByPlaceholderText("Ex: 285k, 1.2M");
    fireEvent.change(valInput, { target: { value: "1M" } });

    // Clica em "Salvar Bônus"
    const addBtn = screen.getByText("Salvar Bônus");
    fireEvent.click(addBtn);

    // Deve exibir o card com "10 Partidas"
    await waitFor(() => {
      expect(screen.getByText(/Meta: 10 Partidas/i)).not.toBeNull();
    });

    // Conclui o drawer
    const concludeBtn = screen.getByRole("button", { name: "Concluir" });
    fireEvent.click(concludeBtn);

    // O card 3 no grid deve mostrar 1 Meta Ativa
    await waitFor(() => {
      expect(screen.getByText("1 Meta Ativa")).not.toBeNull();
    });

    // Salva no Navbar
    const saveNavbarBtn = screen.getByText("Salvar Cláusulas");
    fireEvent.click(saveNavbarBtn);

    await waitFor(() => {
      expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
        "c_barca",
        "s_2024_2025",
        "prop_dani_olmo_purchase",
        expect.objectContaining({
          clubNegotiation: expect.objectContaining({
            bonuses: expect.arrayContaining([
              expect.objectContaining({
                category: "performance",
                bonusCategory: "Desempenho",
                name: "Partidas",
                metric: "matches",
                metricTarget: 10,
                targetCount: 10,
                value: 1000000,
                bonusOrigin: "club",
              }),
            ]),
          }),
        }),
      );
    });
  });

  it("bônus de desempenho do clube não é classificado como bônus do atleta em resolveContractPlayerClauses", () => {
    const clubPerformanceBonus = {
      id: "b_matches_10",
      direction: "payable" as const,
      category: "performance" as const,
      bonusCategory: "Desempenho" as const,
      name: "Partidas",
      targetCount: 10,
      metricTarget: 10,
      metric: "matches" as const,
      value: 1000000,
      status: "pending" as const,
      partnerClub: "RB Leipzig",
      bonusOrigin: "club" as const,
    };

    const contract = {
      fromClub: "RB Leipzig",
      bonuses: [clubPerformanceBonus],
    };

    const resolved = resolveContractPlayerClauses(
      contract as unknown as Parameters<typeof resolveContractPlayerClauses>[0],
    );
    expect(resolved.clubBonuses).toHaveLength(1);
    expect(resolved.playerBonuses).toHaveLength(0);
    expect(resolved.hasAnyPlayerClauses).toBe(false);
  });

  it("no drawer de Outros Acordos Especiais, o botão de Direito de Preferência alterna entre Sim e Não e salva corretamente na proposta", async () => {
    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(
      barcaProposal,
    );

    render(
      <ProposalClubClauses
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_pedri_transfer"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/4\. Cláusulas Especiais/i)).not.toBeNull();
    });

    // Abre Drawer de Outros Acordos Especiais
    const configBtn = screen.getByText("Configurar Acordos do Clube");
    fireEvent.click(configBtn);

    await waitFor(() => {
      expect(screen.getByText("Outros Acordos Especiais")).not.toBeNull();
    });

    // Encontra o grupo do Direito de preferência
    const label = screen.getByText("Direito de preferência");
    expect(label).not.toBeNull();

    // Localiza o input hidden e os botões Sim e Não associados
    const hiddenInput = document.querySelector(
      'input[name="firstRefusal"]',
    ) as HTMLInputElement;
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput.value).toBe("false");

    const segmentedContainer = hiddenInput.closest("div");
    expect(segmentedContainer).not.toBeNull();

    const buttons = segmentedContainer!.querySelectorAll("button");
    const noBtn = Array.from(buttons).find((b) => b.textContent?.trim() === "Não");
    const yesBtn = Array.from(buttons).find((b) => b.textContent?.trim() === "Sim");
    expect(noBtn).toBeDefined();
    expect(yesBtn).toBeDefined();

    // Inicialmente "Não" está ativo
    expect(noBtn!.className).toContain("active");
    expect(yesBtn!.className).not.toContain("active");

    // Clica em "Sim" para alternar
    fireEvent.click(yesBtn!);

    // Agora "Sim" deve estar ativo e hiddenInput deve ter valor "true"
    expect(hiddenInput.value).toBe("true");
    expect(yesBtn!.className).toContain("active");
    expect(noBtn!.className).not.toContain("active");

    // Clica em "Concluir" no drawer
    const concludeBtn = screen.getByRole("button", { name: "Concluir" });
    fireEvent.click(concludeBtn);

    // No grid modular, o card de acordos especiais agora deve listar "Preferência"
    await waitFor(() => {
      expect(screen.getByText(/Preferência/i)).not.toBeNull();
    });

    // Salva no Navbar
    const saveNavbarBtn = screen.getByText("Salvar Cláusulas");
    fireEvent.click(saveNavbarBtn);

    await waitFor(() => {
      expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
        "c_barca",
        "s_2024_2025",
        "prop_pedri_transfer",
        expect.objectContaining({
          clubNegotiation: expect.objectContaining({
            firstRefusal: true,
          }),
          formState: expect.objectContaining({
            booleanValues: expect.objectContaining({
              firstRefusal: true,
            }),
            formValues: expect.objectContaining({
              firstRefusal: "true",
            }),
          }),
        }),
      );
    });
  });

  it("no drawer de Card 0 (Data de Saída & Taxa), altera taxa de transferência e timing e salva na proposta", async () => {
    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(
      barcaProposal,
    );

    render(
      <ProposalClubClauses
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_pedri_transfer"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/0\. Data de Saída & Taxa de Transferência/i),
      ).not.toBeNull();
    });

    // Abre Drawer do Card 0
    const adjustBtn = screen.getByText("Ajustar Data & Taxa");
    fireEvent.click(adjustBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ex: 150k, 50M")).not.toBeNull();
    });

    // Altera a taxa de transferência para 75M
    const feeInput = screen.getByPlaceholderText("Ex: 150k, 50M");
    fireEvent.change(feeInput, { target: { value: "75M" } });

    // Clica em "Concluir" no drawer
    const concludeBtn = screen.getByRole("button", { name: "Concluir" });
    fireEvent.click(concludeBtn);

    // Salva no Navbar
    const saveNavbarBtn = screen.getByText("Salvar Cláusulas");
    fireEvent.click(saveNavbarBtn);

    await waitFor(() => {
      expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
        "c_barca",
        "s_2024_2025",
        "prop_pedri_transfer",
        expect.objectContaining({
          clubNegotiation: expect.objectContaining({
            transferFee: 75000000,
          }),
          formState: expect.objectContaining({
            formValues: expect.objectContaining({
              sellValue: "75M",
            }),
          }),
        }),
      );
    });
  });
});
