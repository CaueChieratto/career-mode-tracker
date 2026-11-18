// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapFormDataToPlayerData, mapPlayerToFormValues } from "../common/helpers/Mappers";
import { PlayersCrudService } from "../common/services/ServicePlayers/PlayersCrudService";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { auth } from "./mocks/firebaseClient";
import { setDoc, deleteField } from "./mocks/firestore";

vi.mock("../common/helpers/Getters", () => ({
  getCareerById: vi.fn(),
}));
vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

describe("Squad Player Contract Info & Default Handling", () => {
  const europeanCareer: Career = {
    id: "career-1",
    clubName: "Arsenal",
    managerName: "Arteta",
    nation: "Inglaterra",
    teamBadge: "",
    colorsTeams: [],
    trophies: [],
    currency: "EUR",
    createdAt: new Date("2026-07-01T00:00:00Z"),
    clubData: [],
  };

  const season1: ClubData = {
    id: "season-1",
    seasonNumber: 1,
    players: [],
    leagues: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = { uid: "user-test" };
  });

  describe("mapFormDataToPlayerData - Omissão de valores não informados", () => {
    it("não salva 0 em valor/salário e nem 1 em tempo de contrato quando nada é informado", () => {
      const formData = new FormData();
      formData.set("playerName", "Gabriel Jesus");
      formData.set("overall", "84");
      formData.set("sector", "Ataque");
      formData.set("position", "ATA");
      formData.set("age", "29");
      formData.set("nation", "Brasil");
      formData.set("shirtNumber", "9");
      // playerValue, salary, contractUntil e contractTime NÃO informados

      const mapped = mapFormDataToPlayerData(formData, europeanCareer, season1);

      expect(mapped.playerValue).toBeUndefined();
      expect("playerValue" in mapped).toBe(false);

      expect(mapped.salary).toBeUndefined();
      expect("salary" in mapped).toBe(false);

      expect(mapped.contractTime).toBeUndefined();
      expect("contractTime" in mapped).toBe(false);

      expect(mapped.contractUntil).toBeUndefined();
      expect("contractUntil" in mapped).toBe(false);
    });

    it("salva valor de mercado e salário quando informados pelo usuário", () => {
      const formData = new FormData();
      formData.set("playerName", "Bukayo Saka");
      formData.set("overall", "88");
      formData.set("sector", "Ataque");
      formData.set("position", "PD");
      formData.set("playerValue", "120M");
      formData.set("salary", "250k");

      const mapped = mapFormDataToPlayerData(formData, europeanCareer, season1);

      expect(mapped.playerValue).toBe(120000000);
      expect(mapped.salary).toBe(250000);
    });

    it("calcula tempo de contrato em anos a partir de 'Contrato até' (ex: 31/07/2031 = 5 anos)", () => {
      const formData = new FormData();
      formData.set("playerName", "Declan Rice");
      formData.set("overall", "87");
      formData.set("sector", "Meia");
      formData.set("position", "VOL");
      formData.set("contractUntil", "31/07/2031");

      const mapped = mapFormDataToPlayerData(formData, europeanCareer, season1);

      expect(mapped.contractUntil).toBe("31/07/2031");
      expect(mapped.contractTime).toBe(5);
    });
  });

  describe("mapPlayerToFormValues - Exibição no formulário", () => {
    it("retorna strings vazias para campos não informados em vez de '€ 0' ou '1'", () => {
      const playerWithoutFinancials: Players = {
        id: "p-empty",
        name: "Jovem Promessa",
        overall: 70,
        sector: "Ataque",
        position: "ATA",
        age: 18,
        nation: "Brasil",
        shirtNumber: "19",
        buy: false,
        captain: false,
        sell: false,
        ballonDor: 0,
        contract: [],
        statsLeagues: [],
      };

      const values = mapPlayerToFormValues(
        playerWithoutFinancials,
        "EUR",
        2026,
        europeanCareer,
        season1,
      );

      expect(values.playerValue).toBe("");
      expect(values.salary).toBe("");
      expect(values.contractUntil).toBe("");
      expect(values.contractTime).toBe("");
      expect(values.potential).toBe("");
    });

    it("exibe valores monetários formatados e contrato quando existem", () => {
      const playerWithFinancials: Players = {
        id: "p-full",
        name: "Martin Odegaard",
        overall: 89,
        sector: "Meia",
        position: "MC",
        age: 27,
        nation: "Noruega",
        shirtNumber: "8",
        playerValue: 90000000,
        salary: 200000,
        contractTime: 5,
        contractUntil: "31/07/2031",
        buy: false,
        captain: true,
        sell: false,
        ballonDor: 0,
        contract: [],
        statsLeagues: [],
      };

      const values = mapPlayerToFormValues(
        playerWithFinancials,
        "EUR",
        2026,
        europeanCareer,
        season1,
      );

      expect(values.playerValue).toBe("€90M");
      expect(values.salary).toBe("€200k");
      expect(values.contractUntil).toBe("31/07/2031");
      expect(values.contractTime).toBe("5");
    });

    it("deriva contractUntil quando o jogador possui apenas contractTime", () => {
      const playerWithOnlyDuration: Players = {
        id: "p-dur",
        name: "William Saliba",
        overall: 87,
        sector: "Defesa",
        position: "ZAG",
        age: 25,
        nation: "França",
        shirtNumber: "2",
        contractTime: 3,
        buy: false,
        captain: false,
        sell: false,
        ballonDor: 0,
        contract: [],
        statsLeagues: [],
      };

      const values = mapPlayerToFormValues(
        playerWithOnlyDuration,
        "EUR",
        2026,
        europeanCareer,
        season1,
      );

      // European season starting in 2026 + 3 years = 2029
      expect(values.contractUntil).toBe("31/07/2029");
      expect(values.contractTime).toBe("3");
    });
  });

  describe("PlayersCrudService.editPlayerInSeason - Limpeza no Firestore", () => {
    it("deleta campos do Firestore com deleteField() caso tenham sido limpos na edição", async () => {
      const existingPlayer: Players = {
        id: "p-edit",
        name: "Jogador Existente",
        overall: 80,
        sector: "Defesa",
        position: "ZAG",
        age: 26,
        nation: "Brasil",
        shirtNumber: "3",
        playerValue: 20000000,
        salary: 50000,
        contractTime: 2,
        contractUntil: "31/07/2028",
        buy: false,
        captain: false,
        sell: false,
        ballonDor: 0,
        contract: [],
        statsLeagues: [],
      };

      const seasonWithPlayer: ClubData = {
        ...season1,
        players: [existingPlayer],
      };

      const careerWithPlayer: Career = {
        ...europeanCareer,
        clubData: [seasonWithPlayer],
      };

      const { getCareerById } = await import("../common/helpers/Getters");
      vi.mocked(getCareerById).mockResolvedValue(careerWithPlayer);

      let savedData: Record<string, unknown> | null = null;
      setDoc.mockImplementation(async (_ref, payload) => {
        savedData = payload as Record<string, unknown>;
      });

      // Usuário editou e removeu playerValue e salary
      await PlayersCrudService.editPlayerInSeason(
        careerWithPlayer.id,
        seasonWithPlayer.id,
        existingPlayer.id,
        {
          overall: 81,
          playerValue: undefined,
          salary: undefined,
        },
      );

      expect(savedData).not.toBeNull();
      const resultData = savedData as unknown as Record<string, unknown>;
      // Assegura que deleteField() foi passado para as propriedades removidas
      expect(resultData?.playerValue).toEqual(deleteField());
      expect(resultData?.salary).toEqual(deleteField());
      expect(resultData?.overall).toBe(81);
    });
  });
});
