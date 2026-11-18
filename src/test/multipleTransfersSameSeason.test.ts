// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { augmentSeasonWithMatchStats } from "../common/stats/helpers/mergeMatchStats";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { PlayersCrudService } from "../common/services/ServicePlayers/PlayersCrudService";
import { useTransferData } from "../layout/SectionView/features/ClubTabs/FinanceTab/components/TransfersCardSummary/hooks/UseTransferData";
import { useOpenTransfersModal } from "../common/hooks/Modal/UseOpenTransfersModal";
import { transferEditRevertService } from "../common/services/ServicePlayers/contractServices/transferEditRevertService";

// Mocks do Firebase e Firestore
vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "user-barca-123" } },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn(),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/services/ServicePlayers/helpers/authHelpers", () => ({
  requireAuth: () => ({ uid: "user-barca-123" }),
}));

let mockCareer: Career;
vi.mock("../common/helpers/Getters", () => ({
  getCareerById: async () => mockCareer,
}));

describe("Múltiplas Transferências na Mesma Temporada e Regra de Recontratação (Padrão FC Barcelona)", () => {
  const careerCreatedAt = new Date("2024-07-01T00:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createInitialCareer = (players: Players[]): Career => ({
    id: "career-barca-1",
    clubName: "FC Barcelona",
    nation: "Espanha",
    currency: "EUR",
    createdAt: careerCreatedAt,
    trophies: [],
    clubData: [
      {
        id: "season-1",
        seasonNumber: 1,
        players: [...players],
        matches: [],
        teams: [],
      } as unknown as ClubData,
    ],
  } as unknown as Career);

  describe("Cenário A: Recontratação com 'Já treinou o jogador?' MARCADO (8 ciclos de venda e compra de Pedri)", () => {
    it("preserva todas as 8 chegadas e todas as 8 saídas no histórico contratual e nos cards de transferência", async () => {
      const initialPedri: Players = {
        id: "pedri-barca-1",
        name: "Pedri",
        nation: "ESP",
        position: "MC",
        sector: "Meio-Campo",
        age: 21,
        overall: 89,
        salary: 150000,
        playerValue: 120000000,
        shirtNumber: "8",
        captain: false,
        sell: false,
        buy: false,
        loan: false,
        incomingLoan: false,
        contractTime: 4,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "Las Palmas",
            leftClub: "",
            dataArrival: new Date("2024-07-01T00:00:00.000Z"),
            dataExit: null,
          },
        ],
      };

      mockCareer = createInitialCareer([initialPedri]);

      const clubs = [
        "PSG",
        "Manchester City",
        "Bayern München",
        "Arsenal",
        "Liverpool",
        "Juventus",
        "Chelsea",
        "Inter de Milão",
      ];

      // Executa 8 ciclos de Venda e Recompra na mesma temporada
      for (let i = 0; i < 8; i++) {
        const destClub = clubs[i];
        const day = String(10 + i).padStart(2, "0");

        // 1. Vende Pedri
        await PlayersContractService.sellPlayerFromSeason(
          mockCareer.id,
          "season-1",
          "pedri-barca-1",
          `${100 + i * 5}M`,
          destClub,
          `${day}/07`,
        );

        // 2. Recompra Pedri ("Já treinou o jogador?" marcado -> envia id e playedWithUs)
        await PlayersContractService.signPlayerWithTerms({
          careerId: mockCareer.id,
          seasonId: "season-1",
          player: {
            id: "pedri-barca-1",
            playedWithUs: "pedri-barca-1",
            name: "Pedri",
            nation: "ESP",
            overall: 89,
            position: "MC",
            sector: "Meio-Campo",
          },
          contract: {
            buyValue: (110 + i * 5) * 1000000,
            fromClub: destClub,
            dataArrival: new Date(`2024-07-${day}T12:00:00.000Z`),
          },
        });
      }

      const season = mockCareer.clubData[0];
      expect(season.players).toHaveLength(1);
      const pedri = season.players[0];
      expect(pedri.id).toBe("pedri-barca-1");
      expect(pedri.sell).toBe(false);
      expect(pedri.buy).toBe(true);

      // O histórico de contratos deve acumular todos os ciclos
      // Contrato inicial + 8 compras com 8 vendas registradas
      const contracts = pedri.contract || [];
      const arrivalContracts = contracts.filter((c) => Boolean(c.fromClub));
      const departureContracts = contracts.filter((c) => Boolean(c.leftClub));

      // Contrato 0 (Las Palmas -> PSG), Contrato 1 (PSG -> Man City), etc.
      expect(departureContracts.length).toBe(8);
      expect(arrivalContracts.length).toBe(9); // 1 inicial + 8 compras

      // Validar useOpenTransfersModal (alimenta o TransfersModal)
      const routerWrapper = ({ children }: { children: ReactNode }) =>
        createElement(MemoryRouter, { initialEntries: ["/career/c1/season/1"] }, children);

      const { result: modalResult } = renderHook(
        () => useOpenTransfersModal(mockCareer, season),
        { wrapper: routerWrapper },
      );

      act(() => {
        modalResult.current.handleOpenTransfers("arrivals");
      });
      expect(modalResult.current.playersToShow).toHaveLength(1);
      expect(modalResult.current.playersToShow[0].contract).toHaveLength(9); // 1 inicial + 8 compras dentro da temporada

      act(() => {
        modalResult.current.handleOpenTransfers("exit");
      });
      expect(modalResult.current.playersToShow).toHaveLength(1);
      expect(modalResult.current.playersToShow[0].contract).toHaveLength(8); // 8 vendas dentro da temporada

      // Validar useTransferData (alimenta TransfersCardSummary de Finanças)
      const { result: summaryResult } = renderHook(
        () => useTransferData(mockCareer, season),
        { wrapper: routerWrapper },
      );

      // Deve listar os eventos individuais de Pedri
      expect(summaryResult.current.arrivals.length).toBeGreaterThanOrEqual(1);
      expect(summaryResult.current.departures.length).toBeGreaterThanOrEqual(1);
      expect(summaryResult.current.arrivals.every((p) => p.name === "Pedri")).toBe(true);
      expect(summaryResult.current.departures.every((p) => p.name === "Pedri")).toBe(true);
    });
  });

  describe("Cenário B: Contratação de novo atleta homônimo com 'Já treinou o jogador?' DESMARCADO", () => {
    it("não apaga nem supera a venda de Pau Cubarsí ao contratar outro Pau Cubarsí com ID independente", async () => {
      const originalCubarsi: Players = {
        id: "cubarsi-barca-1",
        name: "Pau Cubarsí",
        nation: "ESP",
        position: "ZC",
        sector: "Defesa",
        age: 17,
        overall: 82,
        salary: 40000,
        playerValue: 40000000,
        shirtNumber: "2",
        captain: false,
        sell: false,
        buy: false,
        loan: false,
        incomingLoan: false,
        contractTime: 3,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "La Masia",
            leftClub: "",
            dataArrival: new Date("2024-07-01T00:00:00.000Z"),
            dataExit: null,
          },
        ],
      };

      mockCareer = createInitialCareer([originalCubarsi]);

      // 1. Vende o primeiro Pau Cubarsí para o Arsenal
      await PlayersContractService.sellPlayerFromSeason(
        mockCareer.id,
        "season-1",
        "cubarsi-barca-1",
        "50M",
        "Arsenal",
        "15/07",
      );

      const soldCubarsi = mockCareer.clubData[0].players.find(
        (p) => p.id === "cubarsi-barca-1",
      )!;
      expect(soldCubarsi.sell).toBe(true);
      expect(soldCubarsi.contract![0].leftClub).toBe("Arsenal");

      // 2. Contrata um NOVO Pau Cubarsí ("Já treinou o jogador?" DESMARCADO -> sem id prévio, sem playedWithUs)
      const newCubarsiData: Partial<Players> = {
        name: "Pau Cubarsí",
        nation: "ESP",
        overall: 78,
        position: "ZC",
        sector: "Defesa",
      };

      const signedNewCubarsi = await PlayersContractService.signPlayerWithTerms({
        careerId: mockCareer.id,
        seasonId: "season-1",
        player: newCubarsiData,
        contract: {
          buyValue: 30000000,
          fromClub: "Girona",
          dataArrival: new Date("2024-08-01T00:00:00.000Z"),
        },
      });

      // O novo atleta recebeu um ID independente e não tem playedWithUs
      expect(signedNewCubarsi.id).not.toBe("cubarsi-barca-1");
      expect(signedNewCubarsi.playedWithUs).toBeUndefined();
      expect(signedNewCubarsi.sell).toBe(false);

      // Ambos coexistem no array season.players
      expect(mockCareer.clubData[0].players).toHaveLength(2);

      // 3. Executa augmentSeasonWithMatchStats e valida que Cubarsí 1 NÃO foi expurgado
      const augmentedSeason = augmentSeasonWithMatchStats(
        mockCareer.clubData[0],
        "FC Barcelona",
      );

      expect(augmentedSeason.players).toHaveLength(2);
      const augmentedSold = augmentedSeason.players.find(
        (p) => p.id === "cubarsi-barca-1",
      );
      const augmentedActive = augmentedSeason.players.find(
        (p) => p.id === signedNewCubarsi.id,
      );

      expect(augmentedSold).toBeDefined();
      expect(augmentedSold?.sell).toBe(true);
      expect(augmentedActive).toBeDefined();
      expect(augmentedActive?.sell).toBe(false);

      // 4. Modal e Resumo exibem tanto a saída de um quanto a chegada do outro
      const routerWrapper = ({ children }: { children: ReactNode }) =>
        createElement(MemoryRouter, { initialEntries: ["/career/c1/season/1"] }, children);

      const { result: modalResult } = renderHook(
        () => useOpenTransfersModal(mockCareer, augmentedSeason),
        { wrapper: routerWrapper },
      );

      act(() => {
        modalResult.current.handleOpenTransfers("arrivals");
      });
      expect(
        modalResult.current.playersToShow.some(
          (p: Players) => p.id === signedNewCubarsi.id,
        ),
      ).toBe(true);

      act(() => {
        modalResult.current.handleOpenTransfers("exit");
      });
      expect(
        modalResult.current.playersToShow.some(
          (p: Players) => p.id === "cubarsi-barca-1",
        ),
      ).toBe(true);
    });
  });

  describe("Cenário C: Reversão de transferência intermediária na cadeia", () => {
    it("reverte uma saída intermediária sem corromper as demais transferências do atleta", async () => {
      const gaviPlayer: Players = {
        id: "gavi-barca-1",
        name: "Gavi",
        nation: "ESP",
        position: "MC",
        sector: "Meio-Campo",
        age: 19,
        overall: 87,
        salary: 120000,
        playerValue: 90000000,
        shirtNumber: "6",
        captain: false,
        sell: false,
        buy: false,
        loan: false,
        incomingLoan: false,
        contractTime: 4,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            sellValue: 80000000,
            fromClub: "La Masia",
            leftClub: "Chelsea",
            dataArrival: new Date("2024-07-01T00:00:00.000Z"),
            dataExit: new Date("2024-07-15T00:00:00.000Z"),
          },
          {
            buyValue: 95000000,
            sellValue: 110000000,
            fromClub: "Chelsea",
            leftClub: "PSG",
            dataArrival: new Date("2024-07-20T00:00:00.000Z"),
            dataExit: new Date("2024-08-01T00:00:00.000Z"),
          },
        ],
      };

      mockCareer = createInitialCareer([gaviPlayer]);

      // Reverte a segunda saída (PSG) no contrato índice 1
      await transferEditRevertService.revertTransferInSeason({
        careerId: mockCareer.id,
        seasonId: "season-1",
        playerId: "gavi-barca-1",
        contractIndex: 1,
        direction: "exit",
      });

      const updatedGavi = mockCareer.clubData[0].players.find(
        (p) => p.id === "gavi-barca-1",
      )!;

      // O primeiro contrato com Chelsea permaneceu intacto
      expect(updatedGavi.contract![0].leftClub).toBe("Chelsea");
      expect(updatedGavi.contract![0].sellValue).toBe(80000000);

      // O segundo contrato teve a saída revertida, mantendo a chegada do Chelsea
      expect(updatedGavi.contract![1].fromClub).toBe("Chelsea");
      expect(updatedGavi.contract![1].leftClub).toBe("");
      expect(updatedGavi.contract![1].dataExit).toBeNull();
      expect(updatedGavi.contract![1].sellValue).toBe(0);

      // Jogador volta a estar ativo no elenco (sell: false)
      expect(updatedGavi.sell).toBe(false);
    });
  });

  describe("Cenário D: Preservação de contratos em PlayersCrudService.addPlayerToSeason", () => {
    it("preserva o histórico de vendas ao readicionar diretamente um jogador vendido ao elenco", async () => {
      const soldLamine: Players = {
        id: "lamine-yamal-1",
        name: "Lamine Yamal",
        nation: "ESP",
        position: "ED",
        sector: "Ataque",
        age: 17,
        overall: 86,
        salary: 100000,
        playerValue: 150000000,
        shirtNumber: "19",
        captain: false,
        sell: true,
        buy: false,
        loan: false,
        incomingLoan: false,
        contractTime: 5,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            sellValue: 200000000,
            fromClub: "La Masia",
            leftClub: "Manchester City",
            dataArrival: new Date("2024-07-01T00:00:00.000Z"),
            dataExit: new Date("2024-07-25T00:00:00.000Z"),
          },
        ],
      };

      mockCareer = createInitialCareer([soldLamine]);

      // Readiciona Lamine Yamal diretamente ao elenco (AddSquad_Player)
      const readdedLamine: Omit<Players, "id"> = {
        name: "Lamine Yamal",
        nation: "ESP",
        position: "ED",
        sector: "Ataque",
        age: 17,
        overall: 86,
        salary: 120000,
        playerValue: 160000000,
        shirtNumber: "19",
        captain: false,
        sell: false,
        buy: false,
        loan: false,
        incomingLoan: false,
        contractTime: 5,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "Manchester City",
            leftClub: "",
            dataArrival: new Date("2024-08-10T00:00:00.000Z"),
            dataExit: null,
          },
        ],
      };

      await PlayersCrudService.addPlayerToSeason(
        mockCareer.id,
        "season-1",
        readdedLamine,
      );

      // Localiza o atleta atualizado
      const updatedYamal = mockCareer.clubData[0].players.find(
        (p) => p.name === "Lamine Yamal",
      );

      // Deve ter preservado o contrato com a venda ao Man City e anexado o novo contrato
      expect(updatedYamal).toBeDefined();
      const contracts = updatedYamal?.contract || [];
      expect(contracts.length).toBeGreaterThanOrEqual(2);
      expect(contracts.some((c) => c.leftClub === "Manchester City")).toBe(true);
      expect(contracts.some((c) => c.fromClub === "Manchester City")).toBe(true);
    });
  });
});
