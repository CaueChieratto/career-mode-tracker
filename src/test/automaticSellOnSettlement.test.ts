import { beforeEach, describe, expect, it, vi } from "vitest";
import { transferExecutionService } from "../common/services/ServicePlayers/contractServices/transferExecutionService";
import { ServiceFinance } from "../common/services/ServiceFinance";
import { Players } from "../common/interfaces/playersInfo/players";
import { Career } from "../common/interfaces/Career";

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDoc = vi.fn((_db, path) => ({ id: path }));

vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "user-barca-123" } },
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(args[0], args[1]),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
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

describe("Automação de Liquidação de Cláusula de Revenda Futura (sellOnPercentage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(ServiceFinance, "addEntry").mockResolvedValue(undefined as never);

    const lamineYamal: Players = {
      id: "player_lamine_yamal",
      name: "Lamine Yamal",
      overall: 86,
      sector: "Ataque",
      position: "PD",
      age: 17,
      salary: 120000,
      nation: "Espanha",
      shirtNumber: "19",
      playerValue: 120000000,
      buy: true,
      captain: false,
      sell: false,
      contractTime: 5,
      ballonDor: 0,
      statsLeagues: [],
      contract: [
        {
          buyValue: 30000000,
          sellValue: 0,
          fromClub: "La Masia Partner Club",
          leftClub: "",
          dataArrival: new Date("2024-07-01"),
          dataExit: null,
          transferClauses: {
            sellOnPercentage: 15,
          },
        },
      ],
    };

    mockCareer = {
      id: "career-barca",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      createdAt: new Date("2024-07-01"),
      teamBadge: "",
      nation: "ESP",
      currency: "EUR",
      colorsTeams: ["#004d98", "#a50044"],
      trophies: [],
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          teams: [],
          players: [lamineYamal],
          matches: [],
        },
      ],
    };
  });

  it("calcula e lança despesa automática de mais-valia no ServiceFinance e limpa cláusula pendente ao vender o atleta", async () => {
    const addEntrySpy = vi.spyOn(ServiceFinance, "addEntry");

    // Venda de Lamine Yamal por 100M (100000000) no dia 15/08
    await transferExecutionService.sellPlayerFromSeason(
      "career-barca",
      "season-1",
      "player_lamine_yamal",
      "100000000",
      "Paris Saint-Germain",
      "15/08",
    );

    // 1. Receita da venda creditada
    expect(addEntrySpy).toHaveBeenCalledWith(
      "career-barca",
      "season-1",
      expect.objectContaining({
        type: "revenue",
        amount: 100000000,
        description: expect.stringContaining("Venda de Lamine Yamal (Paris Saint-Germain)"),
      }),
    );

    // 2. Despesa automática de repasse de revenda futura (15% de 100M = 15M)
    expect(addEntrySpy).toHaveBeenCalledWith(
      "career-barca",
      "season-1",
      expect.objectContaining({
        id: "sellon_player_lamine_yamal_0_season-1",
        type: "expense",
        category: "Transferências (compras de atletas)",
        amount: 15000000,
        date: "15/08",
        clauseType: "sellOn",
        transferDirection: "arrivals",
        description: "Repasse de mais-valia (15%) referente à venda de Lamine Yamal para Paris Saint-Germain (La Masia Partner Club)",
      }),
    );

    // 3. Cláusula de revenda antiga deve ter sido limpa do contrato do jogador
    const savedPlayer = mockSetDoc.mock.calls[0][1];
    expect(savedPlayer.contract[0].transferClauses?.sellOnPercentage).toBeUndefined();
  });
});
