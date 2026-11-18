// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ProposalConfirmationModal from "../ui/modals/ProposalConfirmationModal";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { career, season } from "./factories/domain";
import { toast } from "../common/services/ToastService";

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("ProposalConfirmationModal (Opção C - Painel Tático de Mercado)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockCareer: Career = career({
    id: "barca_career_1",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    currency: "€",
    nation: "ESP",
    createdAt: new Date("2026-08-01"),
    clubData: [],
  });

  const mockSeason: ClubData = season({
    id: "season_2026_27",
    seasonNumber: 1,
    players: [],
    matches: [],
  });

  const baseBarcelonaProposal: TransferProposal = {
    id: "prop_pedri_123",
    careerId: "barca_career_1",
    seasonId: "season_2026_27",
    type: "compra",
    overallStatus: "aguardando_confirmacao",
    playerId: "pedri_gonzalez",
    playerName: "Pedri",
    playerPosition: "MC",
    playerSector: "Meio-Campo",
    playerNation: "Espanha",
    playerOverall: 89,
    playerAge: 23,
    playerValue: 100000000,
    shirtNumber: "8",
    timing: "Imediata",
    clubNegotiation: {
      partnerClub: "UD Las Palmas",
      status: "aceita",
      transferFee: 60000000,
      sellOnPercentage: 15,
      firstRefusal: true,
      buybackValue: 90000000,
    },
    playerNegotiation: {
      status: "aceita",
      weeklyWage: 250000,
      durationYears: 5,
      contractUntil: "30/06/2031",
      squadRole: "Crucial",
      signingBonus: 10000000,
      agentFee: 5000000,
      releaseClause: 1000000000,
      wageAdjustment: {
        enabled: true,
        direction: "Aumentar",
        percentage: 10,
        targetObjective: "Conquistar a UEFA Champions League",
        status: "pending",
      },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it("não deve renderizar quando isOpen for false", () => {
    const { container } = render(
      <ProposalConfirmationModal
        isOpen={false}
        proposal={baseBarcelonaProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("deve renderizar os blocos táticos da Opção C com ícone neutro no PlayerCircle e sem número 89 no badge", () => {
    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={baseBarcelonaProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Confirmação de Contratação Definitiva")).toBeTruthy();
    expect(screen.getByText("Pedri")).toBeTruthy();
    expect(screen.getByText(/Meio-Campo/i)).toBeTruthy();

    // PlayerCircle usa o ícone neutro (não renderiza badge de overall 89 ou 75)
    expect(screen.queryByText("89")).toBeNull();

    // Grid tático 2x2
    expect(screen.getByText("Valor da Operação")).toBeTruthy();
    expect(screen.getByText("€ 60M")).toBeTruthy();

    expect(screen.getByText("Custo Semanal")).toBeTruthy();
    expect(screen.getByText("€ 250k /sem")).toBeTruthy();

    expect(screen.getByText("Vínculo")).toBeTruthy();
    expect(screen.getByText("5 Anos")).toBeTruthy();

    expect(screen.getByText("Janela de Efetivação")).toBeTruthy();
    expect(screen.getByText("Imediata")).toBeTruthy();

    // Campo de Data do Acordo (DD/MM)
    expect(screen.getByText(/Data do Acordo \(DD\/MM\)/i)).toBeTruthy();
  });

  it("VETO ABSOLUTO EM RENOVAÇÕES: não deve renderizar taxa de agente se o tipo for renovacao", () => {
    const renewalProposal: TransferProposal = {
      id: "prop_yamal_renew",
      careerId: "barca_career_1",
      seasonId: "season_2026_27",
      type: "renovacao",
      overallStatus: "aguardando_confirmacao",
      playerId: "lamine_yamal",
      playerName: "Lamine Yamal",
      playerPosition: "PD",
      playerSector: "Ataque",
      playerNation: "Espanha",
      playerOverall: 87,
      playerAge: 19,
      shirtNumber: "19",
      timing: "Imediata",
      clubNegotiation: undefined,
      playerNegotiation: {
        status: "aceita",
        weeklyWage: 200000,
        durationYears: 6,
        contractUntil: "30/06/2032",
        squadRole: "Crucial",
        signingBonus: 15000000,
        agentFee: 9999999, // Deve ser vetado terminantemente
        releaseClause: 1000000000,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={renewalProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Confirmação de Renovação Contratual")).toBeTruthy();
    expect(screen.getByText("Lamine Yamal")).toBeTruthy();
    expect(screen.queryByText(/Agência:/i)).toBeNull();
    expect(screen.queryByText(/Taxa de Intermediação/i)).toBeNull();
  });

  it("deve disparar onClose ao clicar em 'Voltar'", () => {
    const handleClose = vi.fn();
    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={baseBarcelonaProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={handleClose}
        onConfirm={vi.fn()}
      />,
    );

    const backButton = screen.getByRole("button", {
      name: /Voltar/i,
    });
    fireEvent.click(backButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("exibe aviso se tentar finalizar sem preencher a data do acordo (DD/MM)", () => {
    const handleConfirm = vi.fn();
    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={baseBarcelonaProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />,
    );

    const finalizeButton = screen.getByRole("button", {
      name: /Finalizar Transferência/i,
    });
    fireEvent.click(finalizeButton);

    expect(toast.warning).toHaveBeenCalledWith(
      "Por favor, informe a data do acordo no formato DD/MM (ex: 15/08).",
    );
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("preenche data DD/MM, resolve para o calendário europeu e dispara onConfirm com a data canônica", () => {
    const handleConfirm = vi.fn();
    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={baseBarcelonaProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />,
    );

    const dateInput = screen.getByPlaceholderText("DD/MM (Ex: 15/08)");
    fireEvent.change(dateInput, { target: { value: "15/08" } });

    // Em calendário europeu (ESP, temporada 1 iniciada em 01/08/2026), 15/08 é 15/08/2026
    const finalizeButton = screen.getByRole("button", {
      name: /Finalizar Transferência/i,
    });
    fireEvent.click(finalizeButton);

    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prop_pedri_123",
        agreementDate: "15/08/2026",
      }),
    );
  });

  it("resolve corretamente a virada de ano no calendário europeu (ex: janeiro ➔ ano seguinte)", () => {
    const handleConfirm = vi.fn();
    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={baseBarcelonaProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />,
    );

    const dateInput = screen.getByPlaceholderText("DD/MM (Ex: 15/08)");
    fireEvent.change(dateInput, { target: { value: "10/01" } });

    // Na temporada europeia 2026/2027, janeiro é no ano 2027!
    const finalizeButton = screen.getByRole("button", {
      name: /Finalizar Transferência/i,
    });
    fireEvent.click(finalizeButton);

    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prop_pedri_123",
        agreementDate: "10/01/2027",
      }),
    );
  });

  it("renderiza modal específico para empréstimo com divisão salarial, opção de compra e botão 'Finalizar Empréstimo'", () => {
    const handleConfirm = vi.fn();
    const loanBarcelonaProposal: TransferProposal = {
      id: "prop_pau_victor_modal",
      careerId: "barca_career_1",
      seasonId: "season_2026_27",
      type: "emprestimo_entrada",
      overallStatus: "aguardando_confirmacao",
      playerId: "p_pau_victor",
      playerName: "Pau Víctor",
      playerPosition: "ATA",
      playerSector: "Ataque",
      playerNation: "Espanha",
      playerAge: 24,
      timing: "Imediata",
      clubNegotiation: {
        partnerClub: "Girona FC",
        status: "aceita",
        loanTerms: {
          durationYears: 1,
          ourWagePercentage: 60,
          theirWagePercentage: 40,
          hasBuyOption: true,
          buyOptionFee: 3000000,
          sellOnPercentage: 15,
          partnerClub: "Girona FC",
        },
      },
      playerNegotiation: {
        status: "aceita",
        weeklyWage: 30000,
        durationYears: 1,
        squadRole: "Rodízio",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={loanBarcelonaProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />,
    );

    // Título da operação
    expect(screen.getByText("Confirmação de Empréstimo de Entrada")).toBeDefined();

    // Painel tático
    expect(screen.getByText("Opção de Compra")).toBeDefined();
    expect(screen.getByText("€ 3M")).toBeDefined();
    expect(screen.getByText("Origem: Girona FC")).toBeDefined();

    // Custo Semanal (60% de 30k = 18k)
    expect(screen.getByText("€ 18k /sem")).toBeDefined();
    expect(screen.getByText(/60% pago por nós/i)).toBeDefined();

    // Duração
    expect(screen.getByText("1 Ano")).toBeDefined();
    expect(screen.getByText("Período de Empréstimo")).toBeDefined();

    // Cláusulas acordadas
    expect(screen.getByText(/Opção de Compra: € 3M/i)).toBeDefined();
    expect(screen.getByText(/Mais-Valia Futura: 15%/i)).toBeDefined();
    expect(screen.getByText(/Divisão Salarial: 60% pago pelo clube/i)).toBeDefined();

    // Botão de finalizar empréstimo
    const finalizeButton = screen.getByRole("button", {
      name: /Finalizar Empréstimo/i,
    });
    expect(finalizeButton).toBeDefined();

    const dateInput = screen.getByPlaceholderText("DD/MM (Ex: 15/08)");
    fireEvent.change(dateInput, { target: { value: "15/08" } });
    fireEvent.click(finalizeButton);

    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prop_pau_victor_modal",
        agreementDate: "15/08/2026",
      }),
    );
  });

  it("renderiza modal específico para renovação: sem 'Valor da Operação'/'Janela de Efetivação', com custos reais, soma de vínculo e botão 'Finalizar Renovação'", () => {
    const handleConfirm = vi.fn();
    const seasonWithPedri: ClubData = {
      ...mockSeason,
      players: [
        {
          id: "pedri_gonzalez",
          name: "Pedri",
          position: "MC",
          age: 23,
          overall: 89,
          salary: 200000,
          contractTime: 2,
          contractUntil: "30/06/2028",
          contract: [],
        } as unknown as Players,
      ],
    };

    const renewalProposalWith0Extension: TransferProposal = {
      id: "prop_pedri_renewal_modal",
      careerId: "barca_career_1",
      seasonId: "season_2026_27",
      type: "renovacao",
      overallStatus: "aguardando_confirmacao",
      playerId: "pedri_gonzalez",
      playerName: "Pedri",
      playerPosition: "MC",
      playerSector: "Meio-Campo",
      playerNation: "Espanha",
      playerOverall: 89,
      playerAge: 23,
      playerValue: 100000000,
      shirtNumber: "8",
      timing: "Imediata",
      playerNegotiation: {
        status: "aceita",
        weeklyWage: 250000,
        durationYears: 2,
        contractUntil: "30/06/2028",
        signingBonus: 1000000,
        releaseClause: 1000000000,
        performanceBonuses: [
          {
            id: "b1",
            name: "Conquistar La Liga",
            description: "Conquistar La Liga",
            category: "objective",
            value: 200000,
            direction: "payable",
            status: "pending",
          },
        ],
      },
      formState: {
        formValues: {
          contractTime: "0", // 0 anos de extensão
        },
        booleanValues: {},
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={renewalProposalWith0Extension}
        career={mockCareer}
        season={seasonWithPedri}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />,
    );

    // Título da operação
    expect(screen.getByText("Confirmação de Renovação Contratual")).toBeDefined();

    // NÃO deve conter "Valor da Operação" nem "Janela de Efetivação"
    expect(screen.queryByText("Valor da Operação")).toBeNull();
    expect(screen.queryByText("Janela de Efetivação")).toBeNull();

    // Card 1: Investimento Garantido (250k * 52 * 2 anos = 26M + 1M luvas = 27M)
    expect(screen.getByText("Investimento Garantido")).toBeDefined();
    expect(screen.getByText("€ 27M")).toBeDefined();

    // Card 2: Salário Semanal com comparativo ao anterior
    expect(screen.getByText("Salário Semanal")).toBeDefined();
    expect(screen.getByText("€ 250k /sem")).toBeDefined();
    expect(screen.getByText(/Anterior: € 200k\/sem/i)).toBeDefined();

    // Card 3: Extensão de Vínculo com a soma do contrato
    expect(screen.getByText("Extensão de Vínculo")).toBeDefined();
    expect(screen.getByText("Sem extensão (+0)")).toBeDefined();
    expect(screen.getByText(/2 \+ 0 = 2 anos/i)).toBeDefined();

    // Card 4: Custos Adicionais (1M luvas + 200k metas = 1.2M)
    expect(screen.getByText("Custos Adicionais")).toBeDefined();
    expect(screen.getByText("€ 1.2M")).toBeDefined();

    // Label do input de data customizado para Renovação
    expect(screen.getByText(/Data da Renovação \(DD\/MM\) \*/i)).toBeDefined();

    // Botão de finalizar com texto específico de renovação
    const finalizeButton = screen.getByRole("button", {
      name: /Finalizar Renovação/i,
    });
    expect(finalizeButton).toBeDefined();

    const dateInput = screen.getByPlaceholderText("DD/MM (Ex: 15/08)");
    fireEvent.change(dateInput, { target: { value: "15/08" } });
    fireEvent.click(finalizeButton);

    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prop_pedri_renewal_modal",
        agreementDate: "15/08/2026",
      }),
    );
  });

  it("garante que proposta com durationYears: 1 no banco não exiba '2 + 0 = 1 ano' e recalcule a soma para 2 anos", () => {
    const handleConfirm = vi.fn();
    const seasonWith2YearsPlayer: ClubData = {
      ...mockSeason,
      seasonNumber: 2,
      players: [
        {
          id: "gabriel_jesus_id",
          name: "Gabriel Jesus",
          position: "ATA",
          age: 30,
          overall: 79,
          salary: 145000,
          contractTime: 2,
          contractUntil: "31/07/2028",
          contract: [],
        } as unknown as Players,
      ],
    };

    // Proposta idêntica à que foi salva no Firestore com durationYears: 1
    const storedProposalWith1Year: TransferProposal = {
      id: "prop_jesus_renewal",
      careerId: "barca_career_1",
      seasonId: "season_2026_27",
      type: "renovacao",
      overallStatus: "aguardando_confirmacao",
      playerId: "gabriel_jesus_id",
      playerName: "Gabriel Jesus",
      playerPosition: "ATA",
      playerSector: "Ataque",
      playerNation: "BRA",
      playerOverall: 79,
      playerAge: 30,
      playerValue: 16000000,
      timing: "Imediata",
      playerNegotiation: {
        status: "aceita",
        weeklyWage: 185000,
        durationYears: 1, // salvo errado antes
        contractUntil: "31/07/2028",
        signingBonus: 1000000,
      },
      formState: {
        formValues: {
          contractTime: "0", // 0 de extensão
        },
        booleanValues: {},
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={storedProposalWith1Year}
        career={mockCareer}
        season={seasonWith2YearsPlayer}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />,
    );

    // O texto deve ser 2 + 0 = 2 anos e NÃO 2 + 0 = 1 ano
    expect(screen.queryByText(/2 \+ 0 = 1 ano/i)).toBeNull();
    expect(screen.getByText(/2 \+ 0 = 2 anos/i)).toBeDefined();

    // Clica em finalizar renovação
    const finalizeButton = screen.getByRole("button", {
      name: /Finalizar Renovação/i,
    });
    const dateInput = screen.getByPlaceholderText("DD/MM (Ex: 15/08)");
    fireEvent.change(dateInput, { target: { value: "15/08" } });
    fireEvent.click(finalizeButton);

    // onConfirm recebe a proposta com durationYears corrigido para 2
    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prop_jesus_renewal",
        playerNegotiation: expect.objectContaining({
          durationYears: 2,
        }),
      }),
    );
  });
});
