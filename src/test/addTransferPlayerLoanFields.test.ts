// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  getAddTransferPlayerStep1Fields,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/constants/transferFormFields";
import { useAddTransferPlayerActions } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/hooks/useAddTransferPlayerActions";
import { ServiceProposals } from "../common/services/ServiceProposals";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    createProposal: vi.fn(),
    updateProposal: vi.fn(),
  },
}));

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("addTransferPlayerLoanFields (Padrão FC Barcelona)", () => {
  const mockCareer: Career = {
    id: "c_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "",
    nation: "ESP",
    currency: "€",
    createdAt: new Date("2026-07-01"),
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    clubData: [],
  };

  const mockSeason: ClubData = {
    id: "s_2026",
    seasonNumber: 1,
    year: "2026/2027",
    clubName: "FC Barcelona",
    players: [],
    table: [],
    matches: [],
  } as unknown as ClubData;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza exatamente as 3 fileiras contratuais na ordem estrita para Empréstimo", () => {
    const sections = getAddTransferPlayerStep1Fields("ESP", "Empréstimo", ["Girona FC"]);
    const contractDetails = sections.find((s) => s.title === "Detalhes Contratuais");
    expect(contractDetails).toBeDefined();

    // Fileira 1: Clube de Origem
    expect(contractDetails!.fields[0][0].id).toBe("fromClub");
    expect(contractDetails!.fields[0][0].name).toBe("Clube de Origem");

    // Fileira 2: Valor do Jogador + Duração
    expect(contractDetails!.fields[1].map((f) => f.id)).toEqual(["playerValue", "loanDuration"]);
    expect(contractDetails!.fields[1][1].name).toBe("Duração");
    expect(contractDetails!.fields[1][1].options).toEqual(["Curto prazo", "1 ano", "2 anos"]);

    // Fileira 3: Salário Semanal Total + % Salário Pago por Nós
    expect(contractDetails!.fields[2].map((f) => f.id)).toEqual(["salary", "wagePercentage"]);
  });

  it("exibe condicionalmente a seção 'Opção de Compra' com taxa e mais-valia quando hasBuyOption é true", () => {
    // Quando hasBuyOption é false ou não marcado
    const sectionsWithoutOption = getAddTransferPlayerStep1Fields("ESP", "Empréstimo", [], {
      hasBuyOption: false,
    });
    const buySectionDisabled = sectionsWithoutOption.find((s) => s.title === "Opção de Compra");
    expect(buySectionDisabled).toBeDefined();
    expect(buySectionDisabled!.fields).toHaveLength(1);
    expect(buySectionDisabled!.fields[0][0].id).toBe("hasBuyOption");

    // Quando hasBuyOption é true
    const sectionsWithOption = getAddTransferPlayerStep1Fields("ESP", "Empréstimo", [], {
      hasBuyOption: true,
    });
    const buySectionActive = sectionsWithOption.find((s) => s.title === "Opção de Compra");
    expect(buySectionActive).toBeDefined();
    expect(buySectionActive!.fields).toHaveLength(2);
    expect(buySectionActive!.fields[0][0].id).toBe("hasBuyOption");
    expect(buySectionActive!.fields[1].map((f) => f.id)).toEqual(["buyOption", "sellOnPercentage"]);
  });

  it("não injeta valores mágicos (0, 75 ou 22) em overall e age quando não preenchidos no formulário", async () => {
    let capturedProposal: Omit<TransferProposal, "id"> | null = null;
    vi.mocked(ServiceProposals.createProposal).mockImplementation(async (_c, _s, payload) => {
      capturedProposal = payload;
      return { ...payload, id: "prop_pau_victor" } as TransferProposal;
    });

    const { result } = renderHook(() =>
      useAddTransferPlayerActions({
        career: mockCareer,
        season: mockSeason,
        onClose: vi.fn(),
        formValues: {
          playerName: "Pau Víctor",
          fromClub: "Girona FC",
          sector: "Ataque",
          position: "ATA",
          playerValue: "5M",
          loanDuration: "1 ano",
          salary: "30k",
          wagePercentage: "60",
          buyOption: "3M",
          sellOnPercentage: "15",
        },
        booleanValues: {
          hasBuyOption: true,
        },
        bonuses: [],
        transferType: "Empréstimo",
        setIsLoading: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSaveProposal(1, false);
    });

    expect(capturedProposal).not.toBeNull();
    // overall e age devem ser undefined, nunca 0 ou mágicos
    expect(capturedProposal!.playerOverall).toBeUndefined();
    expect(capturedProposal!.playerAge).toBeUndefined();

    // Dados de empréstimo mapeados corretamente
    expect(capturedProposal!.type).toBe("emprestimo_entrada");
    expect(capturedProposal!.clubNegotiation?.loanTerms).toEqual(
      expect.objectContaining({
        durationYears: 1,
        ourWagePercentage: 60,
        theirWagePercentage: 40,
        hasBuyOption: true,
        buyOptionFee: 3000000,
        sellOnPercentage: 15,
        partnerClub: "Girona FC",
      }),
    );
  });

  it("não auto preenche wagePercentage com 100% se o usuário não informar", async () => {
    let capturedProposal: Omit<TransferProposal, "id"> | null = null;
    vi.mocked(ServiceProposals.createProposal).mockImplementation(async (_c, _s, payload) => {
      capturedProposal = payload;
      return { ...payload, id: "prop_pau_victor_unfilled" } as TransferProposal;
    });

    const { result } = renderHook(() =>
      useAddTransferPlayerActions({
        career: mockCareer,
        season: mockSeason,
        onClose: vi.fn(),
        formValues: {
          playerName: "Pau Víctor",
          fromClub: "Girona FC",
          sector: "Ataque",
          position: "ATA",
          loanDuration: "1 ano",
          salary: "30k",
          // wagePercentage omitido intencionalmente
        },
        booleanValues: {
          hasBuyOption: false,
        },
        bonuses: [],
        transferType: "Empréstimo",
        setIsLoading: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSaveProposal(1, false);
    });

    // Como wagePercentage é obrigatório em runtime na validação de salvar proposta,
    // a tentativa sem wagePercentage emite aviso e não cria a proposta
    expect(capturedProposal).toBeNull();
  });
});

