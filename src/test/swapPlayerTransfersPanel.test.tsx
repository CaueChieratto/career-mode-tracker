// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { canEditTransferContract } from "../common/helpers/transferEditability";
import { career, player, season } from "./factories/domain";

// Mock do Firebase Auth e Firestore para isolamento dos testes de serviço
vi.mock("../common/services/Firebase", () => ({
  auth: { currentUser: { uid: "user_barca" } },
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, path) => ({ path })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/helpers/Getters", () => ({
  getCareerById: vi.fn(),
  updateCachedCareer: vi.fn(),
}));

import { getCareerById } from "../common/helpers/Getters";

describe("Troca de Atletas e Exibição no TransfersPanel (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  let baseFerran: Players;
  let mockSeason: ClubData;
  let mockCareer: Career;

  beforeEach(() => {
    baseFerran = player({
      id: "player_ferran_7",
      name: "Ferran Torres",
      overall: 82,
      position: "ATA",
      sector: "Ataque",
      age: 26,
      salary: 120000,
      contractTime: 3,
      captain: false,
      sell: false,
      ballonDor: 0,
      statsLeagues: [],
      contract: [
        {
          buyValue: 55000000,
          sellValue: 0,
          fromClub: "Manchester City",
          leftClub: "",
          dataArrival: new Date("2024-08-01"),
        },
      ],
    });

    mockSeason = season({
      id: "s_2026",
      seasonNumber: 1,
      players: [baseFerran],
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

  it("ao finalizar contratação com troca, o atleta trocado sai do clube (sell: true) e aparece em Saídas com custo zero e destino do clube parceiro", async () => {
    // 1. Executa a contratação de Dani Olmo envolvendo a troca de Ferran Torres
    const signedOlmo = await PlayersContractService.signPlayerWithTerms({
      careerId: "c_barca",
      seasonId: "s_2026",
      player: {
        id: "player_olmo_20",
        name: "Dani Olmo",
        overall: 84,
        position: "MEI",
        sector: "Meio-Campo",
        age: 26,
        salary: 180000,
      },
      contract: {
        buyValue: 40000000,
        sellValue: 0,
        fromClub: "RB Leipzig",
        leftClub: "",
        dataArrival: new Date("2026-08-10"),
      },
      swapPlayer: {
        playerId: "player_ferran_7",
        playerName: "Ferran Torres",
      },
    });

    expect(signedOlmo.name).toBe("Dani Olmo");
    expect(signedOlmo.buy).toBe(true);

    // 2. Verifica se Ferran Torres foi marcado como vendido e teve seu contrato atualizado
    expect(baseFerran.sell).toBe(true);
    const ferranExitContract = baseFerran.contract[baseFerran.contract.length - 1];
    expect(ferranExitContract.leftClub).toBe("RB Leipzig");
    expect(ferranExitContract.sellValue).toBe(0);
    expect(ferranExitContract.swapPlayer?.playerName).toBe("Dani Olmo");

    // 3. Renderiza o TransfersPanel na aba de Saídas (exit)
    render(
      <TransfersPanel
        title="Saídas"
        transferType="exit"
        players={[baseFerran, signedOlmo]}
        career={mockCareer}
        season={mockSeason}
      />,
    );

    // 4. Ferran Torres deve aparecer em Saídas com custo zero e destino RB Leipzig
    expect(screen.getByText("F. Torres")).toBeDefined();
    expect(screen.getByText("Para: RB Leipzig")).toBeDefined();
    expect(screen.getByText("Custo Zero")).toBeDefined();
    // Dani Olmo NÃO deve aparecer nas Saídas (ele é uma chegada)
    expect(screen.queryByText(/Dani Olmo/i)).toBeNull();

    cleanup();

    // 5. Renderiza o TransfersPanel na aba de Chegadas (arrivals)
    render(
      <TransfersPanel
        title="Chegadas"
        transferType="arrivals"
        players={[baseFerran, signedOlmo]}
        career={mockCareer}
        season={mockSeason}
      />,
    );

    // Dani Olmo aparece em Chegadas com De: RB Leipzig
    expect(screen.getByText("D. Olmo")).toBeDefined();
    expect(screen.getByText("De: RB Leipzig")).toBeDefined();
    // Ferran Torres NÃO deve aparecer nas Chegadas (ele é uma saída)
    expect(screen.queryByText("F. Torres")).toBeNull();
  });

  it("não permite abrir tela de edição para atleta enviado em troca em compra, apenas para o contratado", async () => {
    const signedOlmo = await PlayersContractService.signPlayerWithTerms({
      careerId: "c_barca",
      seasonId: "s_2026",
      player: {
        id: "player_olmo_20",
        name: "Dani Olmo",
        overall: 84,
        position: "MEI",
        sector: "Meio-Campo",
        age: 26,
        salary: 180000,
      },
      contract: {
        buyValue: 40000000,
        sellValue: 0,
        fromClub: "RB Leipzig",
        leftClub: "",
        dataArrival: new Date("2026-08-10"),
      },
      swapPlayer: {
        playerId: "player_ferran_7",
        playerName: "Ferran Torres",
      },
    });

    const olmoContract = signedOlmo.contract[signedOlmo.contract.length - 1];
    const ferranContract = baseFerran.contract[baseFerran.contract.length - 1];

    // canEditTransferContract direto
    expect(
      canEditTransferContract({
        player: signedOlmo,
        contract: olmoContract,
        direction: "arrivals",
        season: { ...mockSeason, players: [baseFerran, signedOlmo] },
        hasOpenScreen: true,
      }),
    ).toBe(true);

    expect(
      canEditTransferContract({
        player: baseFerran,
        contract: ferranContract,
        direction: "exit",
        season: { ...mockSeason, players: [baseFerran, signedOlmo] },
        hasOpenScreen: true,
      }),
    ).toBe(false);

    // No TransfersPanel: Saídas
    const onOpenScreenExit = vi.fn();
    render(
      <TransfersPanel
        title="Saídas"
        transferType="exit"
        players={[baseFerran, signedOlmo]}
        career={mockCareer}
        season={{ ...mockSeason, players: [baseFerran, signedOlmo] }}
        onOpenScreen={onOpenScreenExit}
      />,
    );

    const ferranItem = screen.getByText("F. Torres").closest("li")!;
    expect(ferranItem.style.cursor).toBe("default");
    fireEvent.click(ferranItem);
    expect(onOpenScreenExit).not.toHaveBeenCalled();

    cleanup();

    // No TransfersPanel: Chegadas
    const onOpenScreenArrivals = vi.fn();
    render(
      <TransfersPanel
        title="Chegadas"
        transferType="arrivals"
        players={[baseFerran, signedOlmo]}
        career={mockCareer}
        season={{ ...mockSeason, players: [baseFerran, signedOlmo] }}
        onOpenScreen={onOpenScreenArrivals}
      />,
    );

    const olmoItem = screen.getByText("D. Olmo").closest("li")!;
    expect(olmoItem.style.cursor).toBe("pointer");
    fireEvent.click(olmoItem);
    expect(onOpenScreenArrivals).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "addTransferPlayer",
        editTransfer: expect.objectContaining({
          player: expect.objectContaining({ name: "Dani Olmo" }),
        }),
      }),
    );
  });

  it("não permite abrir tela de edição para atleta recebido em troca em venda, apenas para o atleta vendido", async () => {
    const raphinha: Players = player({
      id: "player_raphinha_11",
      name: "Raphinha",
      overall: 87,
      position: "ATA",
      sector: "Ataque",
      age: 28,
      salary: 200000,
      captain: false,
      sell: false,
      contract: [
        {
          buyValue: 58000000,
          sellValue: 0,
          fromClub: "Leeds United",
          leftClub: "",
          dataArrival: new Date("2024-08-01"),
        },
      ],
    });

    const seasonWithRaphinha: ClubData = {
      ...mockSeason,
      players: [raphinha],
    };

    const careerWithRaphinha: Career = {
      ...mockCareer,
      clubData: [seasonWithRaphinha],
    };

    (getCareerById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(careerWithRaphinha);

    // Vende Raphinha recebendo Nico Williams em troca
    await PlayersContractService.sellPlayerFromSeason(
      "c_barca",
      "s_2026",
      "player_raphinha_11",
      "30000000",
      "Athletic Club",
      "15/08",
      {
        swapPlayer: {
          playerName: "Nico Williams",
          incomingSwap: true,
          estimatedValue: 50000000,
          position: "PE",
          sector: "Ataque",
        },
      },
    );

    const raphinhaExitContract = raphinha.contract[raphinha.contract.length - 1];
    const incomingNico = seasonWithRaphinha.players.find((p) => p.name === "Nico Williams")!;
    expect(incomingNico).toBeDefined();
    const nicoArrivalContract = incomingNico.contract[0];

    // canEditTransferContract: Raphinha (venda principal) é editável, Nico (contrapartida de chegada) NÃO é editável
    expect(
      canEditTransferContract({
        player: raphinha,
        contract: raphinhaExitContract,
        direction: "exit",
        season: seasonWithRaphinha,
        hasOpenScreen: true,
      }),
    ).toBe(true);

    expect(
      canEditTransferContract({
        player: incomingNico,
        contract: nicoArrivalContract,
        direction: "arrivals",
        season: seasonWithRaphinha,
        hasOpenScreen: true,
      }),
    ).toBe(false);

    // No TransfersPanel: Saídas (Raphinha é editável)
    const onOpenScreenExit = vi.fn();
    render(
      <TransfersPanel
        title="Saídas"
        transferType="exit"
        players={seasonWithRaphinha.players}
        career={careerWithRaphinha}
        season={seasonWithRaphinha}
        onOpenScreen={onOpenScreenExit}
      />,
    );

    const raphinhaItem = screen.getByText("Raphinha").closest("li")!;
    expect(raphinhaItem.style.cursor).toBe("pointer");
    fireEvent.click(raphinhaItem);
    expect(onOpenScreenExit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "transferPlayer",
        playerId: "player_raphinha_11",
      }),
    );

    cleanup();

    // No TransfersPanel: Chegadas (Nico Williams NÃO é editável)
    const onOpenScreenArrivals = vi.fn();
    render(
      <TransfersPanel
        title="Chegadas"
        transferType="arrivals"
        players={seasonWithRaphinha.players}
        career={careerWithRaphinha}
        season={seasonWithRaphinha}
        onOpenScreen={onOpenScreenArrivals}
      />,
    );

    const nicoItem = screen.getByText("N. Williams").closest("li")!;
    expect(nicoItem.style.cursor).toBe("default");
    fireEvent.click(nicoItem);
    expect(onOpenScreenArrivals).not.toHaveBeenCalled();
  });
});
