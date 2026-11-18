// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { ServiceProposals } from "../common/services/ServiceProposals";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { career, player, season } from "./factories/domain";
import { useAddTransferPlayerForm } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/hooks/useAddTransferPlayerForm";
import { useTransferForm } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useTransferForm";

// Mocks do Firebase e Firestore
vi.mock("../common/services/Firebase", () => ({
  auth: { currentUser: { uid: "user_barca" } },
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, path) => ({ path })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/helpers/Getters", () => ({
  getCareerById: vi.fn(),
  updateCachedCareer: vi.fn(),
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    getProposalsBySeason: vi.fn(),
    updateProposal: vi.fn().mockResolvedValue(undefined),
    createProposal: vi.fn().mockResolvedValue({ id: "prop_created" }),
  },
}));

vi.mock("../common/services/ServiceFinance", () => ({
  ServiceFinance: {
    addEntry: vi.fn().mockResolvedValue(undefined),
    getReportBySeason: vi.fn().mockResolvedValue({ entries: [] }),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
  },
}));

import { getCareerById } from "../common/helpers/Getters";

describe("Preservação de Dados ao Reverter e Preenchimento de Taxa de Transferência (Padrão FC Barcelona)", () => {
  let mockCareer: Career;
  let mockSeason: ClubData;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSeason = season({
      id: "s_2026",
      seasonNumber: 1,
      players: [],
      matches: [],
    });

    mockCareer = career({
      id: "c_barca",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      currency: "€",
      createdAt: new Date("2026-08-01"),
      nation: "ESP",
      clubData: [mockSeason],
    });

    (getCareerById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCareer);
  });

  it("reverter transferência de compra preserva número da camisa, overall, data de nascimento, altura e peso na proposta", async () => {
    // Jogador recém-contratado com dados detalhados preenchidos
    const lamineYamal: Players = player({
      id: "p_lamine_19",
      name: "Lamine Yamal",
      overall: 88,
      position: "ED",
      sector: "Ataque",
      age: 18,
      birthDate: "13/07/2007",
      shirtNumber: "19",
      height: "178",
      weight: "68",
      playerValue: 120000000,
      salary: 150000,
      contractTime: 5,
      buy: true,
      sell: false,
      contract: [
        {
          buyValue: 60000000,
          sellValue: 0,
          fromClub: "Passes Livres",
          leftClub: "",
          dataArrival: new Date("2026-08-05"),
        },
      ],
    });

    mockSeason.players = [lamineYamal];

    // Proposta existente associada
    const existingProposal: TransferProposal = {
      id: "prop_yamal_1",
      careerId: "c_barca",
      seasonId: "s_2026",
      playerId: "p_lamine_19",
      playerName: "Lamine Yamal",
      playerPosition: "ED",
      playerSector: "Ataque",
      playerNation: "ESP",
      type: "compra",
      overallStatus: "concluida",
      playerOverall: 84,
      playerBirthDate: "",
      shirtNumber: "",
      height: "",
      weight: "",
      playerValue: 100000000,
      clubNegotiation: {
        status: "aceita",
        partnerClub: "Passes Livres",
        transferFee: 60000000,
      },
    };

    (ServiceProposals.getProposalsBySeason as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      existingProposal,
    ]);

    await PlayersContractService.revertTransferInSeason({
      careerId: "c_barca",
      seasonId: "s_2026",
      playerId: "p_lamine_19",
      contractIndex: 0,
      direction: "arrivals",
    });

    // Deve atualizar a proposta com os campos detalhados do jogador
    expect(ServiceProposals.updateProposal).toHaveBeenCalledTimes(1);
    const [, , , updatedPayload] = (
      ServiceProposals.updateProposal as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];

    expect(updatedPayload.overallStatus).toBe("em_andamento");
    expect(updatedPayload.playerOverall).toBe(88);
    expect(updatedPayload.playerBirthDate).toBe("13/07/2007");
    expect(updatedPayload.shirtNumber).toBe("19");
    expect(updatedPayload.height).toBe("178");
    expect(updatedPayload.weight).toBe("68");
    expect(updatedPayload.clubNegotiation?.transferFee).toBe(60000000);
    expect(updatedPayload.formState?.formValues?.birthDate).toBe("13/07/2007");
    expect(updatedPayload.formState?.formValues?.shirtNumber).toBe("19");
    expect(updatedPayload.formState?.formValues?.overall).toBe("88");
    expect(updatedPayload.formState?.formValues?.height).toBe("178");
    expect(updatedPayload.formState?.formValues?.weight).toBe("68");
    expect(updatedPayload.formState?.formValues?.buyValue).toBe("60M");
    expect(updatedPayload.formState?.formValues?.transferFee).toBe("60M");
  });

  it("quando não há proposta pré-existente, reverter cria nova proposta preservando todos os campos e valor", async () => {
    const pedri: Players = player({
      id: "p_pedri_8",
      name: "Pedri",
      overall: 89,
      position: "MC",
      sector: "Meio-Campo",
      age: 23,
      birthDate: "25/11/2002",
      shirtNumber: "8",
      height: "174",
      weight: "60",
      playerValue: 100000000,
      salary: 180000,
      contractTime: 4,
      buy: true,
      sell: false,
      contract: [
        {
          buyValue: 70000000,
          sellValue: 0,
          fromClub: "UD Las Palmas",
          leftClub: "",
          dataArrival: new Date("2026-08-05"),
        },
      ],
    });

    mockSeason.players = [pedri];

    (ServiceProposals.getProposalsBySeason as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await PlayersContractService.revertTransferInSeason({
      careerId: "c_barca",
      seasonId: "s_2026",
      playerId: "p_pedri_8",
      contractIndex: 0,
      direction: "arrivals",
    });

    expect(ServiceProposals.createProposal).toHaveBeenCalledTimes(1);
    const [, , createdPayload] = (
      ServiceProposals.createProposal as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];

    expect(createdPayload.overallStatus).toBe("em_andamento");
    expect(createdPayload.playerOverall).toBe(89);
    expect(createdPayload.playerBirthDate).toBe("25/11/2002");
    expect(createdPayload.shirtNumber).toBe("8");
    expect(createdPayload.height).toBe("174");
    expect(createdPayload.weight).toBe("60");
    expect(createdPayload.clubNegotiation?.transferFee).toBe(70000000);
    expect(createdPayload.formState?.formValues?.buyValue).toBe("70M");
    expect(createdPayload.formState?.formValues?.transferFee).toBe("70M");
  });

  it("useAddTransferPlayerForm preenche corretamente taxa de transferência e dados preservados ao abrir proposta pendente", () => {
    const pendingProposal: TransferProposal = {
      id: "prop_ferran_pending",
      careerId: "c_barca",
      seasonId: "s_2026",
      playerId: "p_ferran_7",
      playerName: "Ferran Torres",
      playerPosition: "ATA",
      playerSector: "Ataque",
      playerNation: "ESP",
      type: "compra",
      overallStatus: "em_andamento",
      playerOverall: 83,
      playerBirthDate: "29/02/2000",
      shirtNumber: "7",
      height: "184",
      weight: "77",
      playerValue: 40000000,
      clubNegotiation: {
        status: "em_negociacao",
        partnerClub: "Manchester City",
        transferFee: 40000000,
      },
      formState: {
        formValues: {
          buyValue: "40M",
          transferFee: "40M",
          birthDate: "29/02/2000",
          shirtNumber: "7",
          overall: "83",
          height: "184",
          weight: "77",
        },
        booleanValues: {},
      },
    };

    const { result } = renderHook(() =>
      useAddTransferPlayerForm({
        career: mockCareer,
        season: mockSeason,
        onClose: vi.fn(),
        initialProposal: pendingProposal,
      }),
    );

    // Form values devem vir completamente preenchidos e NUNCA vazios
    expect(result.current.formValues.buyValue).toBe("40M");
    expect(result.current.formValues.transferFee).toBe("40M");
    expect(result.current.formValues.birthDate).toBe("29/02/2000");
    expect(result.current.formValues.shirtNumber).toBe("7");
    expect(result.current.formValues.overall).toBe("83");
    expect(result.current.formValues.height).toBe("184");
    expect(result.current.formValues.weight).toBe("77");
    expect(result.current.formValues.fromClub).toBe("Manchester City");
  });

  it("useTransferForm preenche taxa de transferência ao abrir proposta pendente de venda", () => {
    const pendingSaleProposal: TransferProposal = {
      id: "prop_sale_pending",
      careerId: "c_barca",
      seasonId: "s_2026",
      playerId: "p_ferran_7",
      playerName: "Ferran Torres",
      playerPosition: "ATA",
      playerSector: "Ataque",
      playerNation: "ESP",
      type: "venda",
      overallStatus: "em_andamento",
      playerOverall: 83,
      playerValue: 35000000,
      clubNegotiation: {
        status: "em_negociacao",
        partnerClub: "Arsenal",
        transferFee: 35000000,
      },
      formState: {
        formValues: {
          sellValue: "35m",
          transferFee: "35m",
          toClub: "Arsenal",
        },
        booleanValues: {},
      },
    };

    const ferran = player({
      id: "p_ferran_7",
      name: "Ferran Torres",
      overall: 83,
      position: "ATA",
      sector: "Ataque",
      playerValue: 35000000,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2024-08-01"),
        },
      ],
    });

    const { result } = renderHook(() =>
      useTransferForm({
        careerId: "c_barca",
        career: mockCareer,
        season: mockSeason,
        player: ferran,
        currentPlayers: [ferran],
        handleGoBack: vi.fn(),
        initialProposal: pendingSaleProposal,
      }),
    );

    // O input de taxa de transferência de venda deve vir preenchido e não vazio
    expect(result.current.formValues.sellValue).toBe("35m");
    expect(result.current.formValues.transferFee).toBe("35m");
    expect(result.current.formValues.toClub).toBe("Arsenal");
  });
});
