// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanitizeFirestoreData } from "../common/utils/sanitizeFirestore";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import { ServiceFinance } from "../common/services/ServiceFinance";
import { PlayersCrudService } from "../common/services/ServicePlayers/PlayersCrudService";
import { mapFormDataToPlayerData } from "../common/helpers/Mappers";
import { auth } from "./mocks/firebaseClient";
import {
  writeBatch,
  setDoc,
  getDoc,
  documentSnapshot,
} from "./mocks/firestore";
import { Career } from "../common/interfaces/Career";
import { Players } from "../common/interfaces/playersInfo/players";
import { ClubData } from "../common/interfaces/club/clubData";

vi.mock("../common/helpers/Getters", () => ({
  getCareerById: vi.fn(),
}));
vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Função utilitária que simula a validação estrita do Firestore SDK:
 * Rejeita qualquer propriedade cujo valor seja explicitamente `undefined`.
 */
function assertNoUndefined(obj: unknown, path = "root"): void {
  if (obj === undefined) {
    throw new Error(`Unsupported field value: undefined (found at ${path})`);
  }
  if (obj === null || typeof obj !== "object") {
    return;
  }
  if (obj instanceof Date) {
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => assertNoUndefined(item, `${path}[${idx}]`));
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      throw new Error(
        `Function setDoc()/WriteBatch.set() called with invalid data. Unsupported field value: undefined (found in field ${key} at ${path})`,
      );
    }
    assertNoUndefined(value, `${path}.${key}`);
  }
}

describe("Higienização contra erros de 'Unsupported field value: undefined' no Firestore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = { uid: "user-123" };
  });

  describe("sanitizeFirestoreData unit tests", () => {
    it("remove propriedades undefined de objetos em qualquer nível de profundidade", () => {
      const input = {
        name: "Test Player",
        contractDetails: {
          weeklyWage: 5000,
          signingBonus: undefined,
          wageAdjustment: undefined,
        },
        academyNickname: undefined,
        age: 21,
      };

      const sanitized = sanitizeFirestoreData(input);

      expect(sanitized).toEqual({
        name: "Test Player",
        contractDetails: {
          weeklyWage: 5000,
        },
        age: 21,
      });
      expect(() => assertNoUndefined(sanitized)).not.toThrow();
    });

    it("remove propriedades undefined dentro de arrays de objetos", () => {
      const input = {
        entries: [
          { id: "1", amount: 100, description: undefined, date: undefined },
          { id: "2", amount: 200, description: "Venda", date: "2024-01-01" },
        ],
      };

      const sanitized = sanitizeFirestoreData(input);

      expect(sanitized.entries[0]).toEqual({ id: "1", amount: 100 });
      expect(sanitized.entries[1]).toEqual({
        id: "2",
        amount: 200,
        description: "Venda",
        date: "2024-01-01",
      });
      expect(() => assertNoUndefined(sanitized)).not.toThrow();
    });

    it("preserva Date, null, números (inclusive 0), booleans (inclusive false) e strings vazias", () => {
      const date = new Date("2024-05-10T12:00:00Z");
      const input = {
        date,
        nullVal: null,
        zero: 0,
        falsyBool: false,
        emptyStr: "",
        undef: undefined,
      };

      const sanitized = sanitizeFirestoreData(input);

      expect(sanitized).toEqual({
        date,
        nullVal: null,
        zero: 0,
        falsyBool: false,
        emptyStr: "",
      });
      expect(sanitized.date).toBeInstanceOf(Date);
      expect(() => assertNoUndefined(sanitized)).not.toThrow();
    });
  });

  describe("Erro 1: Adicionar temporada com jogador oriundo da base (sem contractDetails)", () => {
    it("não grava 'contractDetails: undefined' no batch.set ao transicionar temporada", async () => {
      const batchSetMock = vi.fn();
      const batchUpdateMock = vi.fn();
      const commitMock = vi.fn().mockResolvedValue(undefined);

      writeBatch.mockReturnValue({
        set: batchSetMock,
        update: batchUpdateMock,
        commit: commitMock,
      } as never);

      // Jogador promovido da base sem contractDetails prévio
      const academyPlayerInSquad: Players = {
        id: "academy-02fb8f86-7302-488e-9605-fdfc5f63e39e",
        name: "Jovem Talento",
        age: 18,
        overall: 68,
        position: "MC",
        sector: "Meio-Campo",
        nation: "Brasil",
        shirtNumber: "28",
        playerValue: 1500000,
        salary: 5000,
        contractTime: 3,
        buy: false,
        sell: false,
        loan: false,
        captain: false,
        statsLeagues: [],
        ballonDor: 0,
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "Base",
            leftClub: "",
            dataArrival: new Date(),
            dataExit: null,
          },
        ],
        isAcademy: true,
      };

      const mockCareer: Career = {
        id: "8e35c79f-be5f-4609-babb-9e09f004e82b",
        clubName: "Clube FC",
        managerName: "Treinador",
        nation: "Brasil",
        teamBadge: "",
        colorsTeams: [],
        trophies: [],
        createdAt: new Date("2024-01-01"),
        clubData: [
          {
            id: "season-1",
            seasonNumber: 1,
            players: [academyPlayerInSquad],
            leagues: [],
          },
          {
            id: "season-2",
            seasonNumber: 2,
            players: [academyPlayerInSquad],
            leagues: [],
          },
        ],
      };

      await ServiceSeasons.addSeason(mockCareer);

      expect(batchSetMock).toHaveBeenCalled();
      for (const call of batchSetMock.mock.calls) {
        const payload = call[1];
        // Valida que NENHUM campo undefined foi passado ao WriteBatch.set()
        expect(() => assertNoUndefined(payload)).not.toThrow();
        expect(payload).not.toHaveProperty("contractDetails", undefined);
      }
    });
  });

  describe("Erro 2: Salvar lançamento financeiro sem descrição ou data", () => {
    it("não grava 'description: undefined' ou 'date: undefined' no relatório do Firestore", async () => {
      let savedReport: unknown = null;
      setDoc.mockImplementation(async (_ref, payload) => {
        savedReport = payload;
      });
      getDoc.mockResolvedValue(
        documentSnapshot("report", {
          seasonId: "season-1",
          seasonNumber: 1,
          entries: [],
        }),
      );

      const newEntry = await ServiceFinance.addEntry(
        "8e35c79f-be5f-4609-babb-9e09f004e82b",
        "season-1",
        {
          type: "revenue",
          category: "Ingressos",
          amount: 50000,
        },
      );

      expect(newEntry.id).toBeDefined();
      expect(savedReport).not.toBeNull();
      // Valida que o relatório passado para o setDoc não tem undefined
      expect(() => assertNoUndefined(savedReport)).not.toThrow();
    });
  });

  describe("Erro 3: Adicionar jogador ao elenco via formulário", () => {
    it("mapFormDataToPlayerData e addPlayerToSeason não persistem campos undefined", async () => {
      let savedPlayer: unknown = null;
      setDoc.mockImplementation(async (_ref, payload) => {
        savedPlayer = payload;
      });

      const mockSeason: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [],
        leagues: [],
      };
      const mockCareer: Career = {
        id: "8e35c79f-be5f-4609-babb-9e09f004e82b",
        clubName: "Clube FC",
        managerName: "Treinador",
        nation: "Brasil",
        teamBadge: "",
        colorsTeams: [],
        trophies: [],
        createdAt: new Date("2024-01-01"),
        clubData: [mockSeason],
      };

      const { getCareerById } = await import("../common/helpers/Getters");
      vi.mocked(getCareerById).mockResolvedValue(mockCareer);

      const formData = new FormData();
      formData.set("playerName", "Novo Jogador");
      formData.set("overall", "75");
      formData.set("sector", "Defesa");
      formData.set("position", "ZAG");
      formData.set("age", "24");
      formData.set("nation", "Brasil");
      formData.set("shirtNumber", "4");
      formData.set("playerValue", "5.000.000");
      formData.set("salary", "30.000");
      formData.set("contractTime", "3");
      formData.set("squadRole", "Rodízio");

      const mappedData = mapFormDataToPlayerData(formData, mockCareer, mockSeason);
      expect(() => assertNoUndefined(mappedData)).not.toThrow();

      await PlayersCrudService.addPlayerToSeason(
        mockCareer.id,
        mockSeason.id,
        mappedData as Omit<Players, "id">,
      );

      expect(savedPlayer).not.toBeNull();
      // Valida que o objeto persistido no Firestore não possui nenhum campo com undefined
      expect(() => assertNoUndefined(savedPlayer)).not.toThrow();
    });
  });
});

