// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import Load from "../components/Load";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { getCareerById } from "../common/helpers/Getters";
import { ServiceFinance } from "../common/services/ServiceFinance";
import { setDoc } from "firebase/firestore";
import type { FinancialEntry } from "../common/interfaces/finance";
import type { Career } from "../common/interfaces/Career";

vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "test-user" } },
}));

vi.mock("../common/helpers/Getters", () => ({
  getCareerById: vi.fn(),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, path, ...segments) => ({ path, segments })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockImplementation(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  getDocs: vi.fn().mockImplementation(() => Promise.resolve({ docs: [] })),
  deleteDoc: vi.fn().mockImplementation(() => Promise.resolve(undefined)),
  updateDoc: vi.fn().mockImplementation(() => Promise.resolve(undefined)),
  deleteField: vi.fn(),
  collection: vi.fn(),
}));

vi.mock("../common/services/ServicePlayers/helpers/authHelpers", () => ({
  requireAuth: () => ({ uid: "test-user" }),
}));

describe("Renovação Contratual para Qualquer Atleta & Load Overlay", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.spyOn(ServiceFinance, "getReportBySeason").mockResolvedValue({
      seasonId: "s1",
      seasonNumber: 1,
      entries: [],
    });
    vi.spyOn(ServiceFinance, "addEntry").mockResolvedValue({
      id: "e1",
      type: "expense",
      category: "Luvas / Prêmios de Assinatura",
      amount: 0,
      date: "01/07",
      description: "mock",
    } as FinancialEntry);
    vi.spyOn(ServiceFinance, "deleteEntry").mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("Componente <Load /> - Portal e Stacking Context", () => {
    it("renderiza via createPortal no document.body com z-index elevado", () => {
      render(
        <div id="parent-container">
          <Load />
        </div>,
      );

      // O Load deve estar anexado diretamente ao document.body
      const loadInBody = document.body.querySelector("[class*='containerLoad']");
      expect(loadInBody).not.toBeNull();
      expect(loadInBody?.parentElement).toBe(document.body);
    });
  });

  describe("PlayersContractService - Renovação de Qualquer Atleta e Reversão", () => {
    it("createPlayerRenewal salva previousSalary, previousContractTime e gera evento de histórico para QUALQUER atleta", async () => {
      const mockPlayer = {
        id: "player-regular-1",
        name: "Erling Haaland",
        isAcademy: false,
        salary: 200000,
        contractTime: 3,
        contractUntil: "30/06/2027",
        contract: [
          {
            buyValue: 60000000,
            sellValue: 0,
            fromClub: "Borussia Dortmund",
            leftClub: "",
            dataArrival: new Date("2023-01-01"),
            salary: 200000,
            contractTime: 3,
            contractUntil: "30/06/2027",
          },
        ],
        academyHistory: [],
      };

      const mockCareer = {
        id: "c1",
        createdAt: new Date("2024-01-01"),
        nation: "England",
        clubData: [
          {
            id: "s1",
            seasonNumber: 1,
            players: [mockPlayer],
          },
        ],
      };

      vi.mocked(getCareerById).mockResolvedValue(mockCareer as unknown as Career);

      const updated = await PlayersContractService.createPlayerRenewal({
        careerId: "c1",
        seasonId: "s1",
        playerId: "player-regular-1",
        salary: "350k",
        contractTime: 5,
        contractUntil: "30/06/2029",
      });

      expect(updated.salary).toBe(350000);
      expect(updated.contractTime).toBe(5);
      expect(updated.contractUntil).toBe("30/06/2029");

      // Novo contrato deve conter previousSalary e previousContractTime
      const latestContract = updated.contract[updated.contract.length - 1];
      expect(latestContract.previousSalary).toBe(200000);
      expect(latestContract.previousContractTime).toBe(3);
      expect(latestContract.previousContractUntil).toBe("30/06/2027");

      // Deve ter gerado evento no histórico do atleta (academyHistory e evolutionHistory)
      expect(updated.academyHistory).toHaveLength(1);
      expect(updated.academyHistory![0]).toMatchObject({
        id: "renewal:s1:player-regular-1:1",
        changedAttribute: "contract",
        description: "Contrato renovado com o clube.",
        oldValue: "200000",
        newValue: "350000",
      });

      expect(updated.evolutionHistory).toHaveLength(1);
      expect(updated.evolutionHistory![0]).toMatchObject({
        id: "renewal:s1:player-regular-1:1",
        changedAttribute: "contract",
        description: "Contrato renovado com o clube.",
        oldValue: "200000",
        newValue: "350000",
      });

      // Deve persistir no Firestore
      expect(setDoc).toHaveBeenCalled();
    });

    it("deletePlayerRenewal restaura contrato anterior e limpa histórico e signing bonus de qualquer atleta", async () => {
      const mockPlayer = {
        id: "player-regular-1",
        name: "Erling Haaland",
        isAcademy: false,
        salary: 350000,
        contractTime: 5,
        contractUntil: "30/06/2029",
        contract: [
          {
            buyValue: 60000000,
            sellValue: 0,
            fromClub: "Borussia Dortmund",
            leftClub: "",
            dataArrival: new Date("2023-01-01"),
            salary: 200000,
            contractTime: 3,
            contractUntil: "30/06/2027",
          },
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "",
            leftClub: "",
            dataArrival: new Date("2024-01-01"),
            isRenewal: true,
            salary: 350000,
            contractTime: 5,
            contractUntil: "30/06/2029",
            previousSalary: 200000,
            previousContractTime: 3,
            previousContractUntil: "30/06/2027",
          },
        ],
        academyHistory: [
          {
            id: "renewal:s1:player-regular-1:1",
            changedAttribute: "contract",
            description: "Contrato renovado com o clube.",
            oldValue: "200000",
            newValue: "350000",
            date: "01/07",
          },
        ],
        evolutionHistory: [
          {
            id: "renewal:s1:player-regular-1:1",
            changedAttribute: "contract",
            description: "Contrato renovado com o clube.",
            oldValue: "200000",
            newValue: "350000",
            date: "01/07",
          },
        ],
      };

      const mockCareer = {
        id: "c1",
        createdAt: new Date("2024-01-01"),
        nation: "England",
        clubData: [
          {
            id: "s1",
            seasonNumber: 1,
            players: [mockPlayer],
          },
        ],
      };

      vi.mocked(getCareerById).mockResolvedValue(mockCareer as unknown as Career);

      const reverted = await PlayersContractService.deletePlayerRenewal({
        careerId: "c1",
        seasonId: "s1",
        playerId: "player-regular-1",
        contractIndex: 1,
      });

      // Valores anteriores devem ter sido restaurados na raiz do atleta
      expect(reverted.salary).toBe(200000);
      expect(reverted.contractTime).toBe(3);
      expect(reverted.contractUntil).toBe("30/06/2027");

      // Contrato renovado deve ter sido expurgado
      expect(reverted.contract).toHaveLength(1);

      // Evento de renovação deve ter sido expurgado do histórico
      expect(reverted.academyHistory).toHaveLength(0);
      expect(reverted.evolutionHistory).toHaveLength(0);

      // Tentativa de exclusão de despesa de signing bonus
      expect(ServiceFinance.deleteEntry).toHaveBeenCalledWith(
        "c1",
        "s1",
        "signing_bonus_player-regular-1_1",
      );
    });
  });
});
