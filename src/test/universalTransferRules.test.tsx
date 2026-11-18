// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import { auth } from "./mocks/firebaseClient";
import {
  writeBatch,
  arrayUnion,
  getDoc,
  getDocs,
  runTransaction,
  getDocsFromServer,
  querySnapshot,
  deleteDoc,
} from "./mocks/firestore";
import { career, player, season, match } from "./factories/domain";
import { Players } from "../common/interfaces/playersInfo/players";
import {
  isPlayerSoldOrDeparted,
  hasTransferActiveClauses,
  isContractInSeasonRange,
  isNextSeasonTiming,
  isNextWindowTiming,
  isImmediateTiming,
  normalizeTiming,
} from "../common/services/ServicePlayers/helpers/transferTimingHelpers";
import { buildSquadData } from "../layout/SectionView/features/ClubTabs/SquadTab/helpers/buildSquadData";
import { getSeasonDateRange } from "../common/utils/GetSeasonDateRange";
import { renderHook, render, screen, cleanup } from "@testing-library/react";
import { createElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { useTransferData } from "../layout/SectionView/features/ClubTabs/FinanceTab/components/TransfersCardSummary/hooks/UseTransferData";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";

vi.mock("../common/helpers/Getters", () => ({ getCareerById: vi.fn() }));
vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn(),
}));

const batchSet = vi.fn<(...args: unknown[]) => void>();
const batchUpdate = vi.fn<(...args: unknown[]) => void>();
const commit = vi.fn<() => Promise<void>>();

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  auth.currentUser = { uid: "test-user" };
  batchSet.mockReset();
  batchUpdate.mockReset();
  commit.mockReset().mockResolvedValue(undefined);
  writeBatch.mockReset().mockReturnValue({
    set: batchSet,
    update: batchUpdate,
    commit,
  } as never);
  arrayUnion.mockClear();
  getDoc.mockReset();
  getDocs.mockReset();
  runTransaction.mockReset();
  getDocsFromServer.mockReset().mockResolvedValue(querySnapshot([]));
  deleteDoc.mockReset().mockResolvedValue(undefined);
});

describe("Regras Universais de Transferências, Cláusulas e Transição de Temporada", () => {
  describe("1. Venda 'Próxima Temporada' permanece no SquadTab durante a temporada de origem", () => {
    it("atleta vendido com 'Proxima Temporada' continua ativo no SquadTab", () => {
      const soldNextSeasonPlayer: Players = player({
        id: "p-sold-next-season",
        name: "Lamine Yamal",
        sell: false,
        contract: [
          {
            buyValue: 0,
            sellValue: 150000000,
            fromClub: "",
            leftClub: "Paris Saint-Germain",
            dataArrival: null,
            dataExit: new Date("2026-08-10"),
            timing: "Proxima Temporada",
            isLoan: false,
          },
        ],
      });

      // 1. isPlayerSoldOrDeparted deve retornar false pois a saída só ocorre na temporada seguinte
      expect(isPlayerSoldOrDeparted(soldNextSeasonPlayer)).toBe(false);

      // 2. buildSquadData deve incluir o atleta no elenco ativo
      const { flatData } = buildSquadData(
        [soldNextSeasonPlayer],
        "Ordenar por padrão",
        false,
        [],
      );
      expect(flatData.some((p) => p.name === "Lamine Yamal")).toBe(true);
    });

    it("resiste a variações com e sem acento ('Próxima Temporada' vs 'Proxima Temporada')", () => {
      const withAccent: Players = player({
        sell: false,
        contract: [
          {
            buyValue: 0,
            sellValue: 50000000,
            fromClub: "",
            leftClub: "Chelsea",
            dataArrival: null,
            timing: "Próxima Temporada",
          },
        ],
      });
      const withoutAccent: Players = player({
        sell: false,
        contract: [
          {
            buyValue: 0,
            sellValue: 50000000,
            fromClub: "",
            leftClub: "Chelsea",
            dataArrival: null,
            timing: "Proxima Temporada",
          },
        ],
      });

      expect(isPlayerSoldOrDeparted(withAccent)).toBe(false);
      expect(isPlayerSoldOrDeparted(withoutAccent)).toBe(false);
    });
  });

  describe("2. Venda 'Próxima Temporada' sai do SquadTab na Temporada 2", () => {
    it("na virada de temporada, venda agendada é ativada (sell: true), convertida para Imediata e excluída do SquadTab", async () => {
      const scheduledSoldPlayer: Players = player({
        id: "p-scheduled-exit",
        name: "Raphinha",
        sell: false,
        age: 29,
        contract: [
          {
            buyValue: 0,
            sellValue: 80000000,
            fromClub: "",
            leftClub: "Al-Hilal",
            dataArrival: null,
            dataExit: new Date("2026-08-15"),
            timing: "Proxima Temporada",
            isLoan: false,
          },
        ],
      });

      const testCareer = career({
        createdAt: new Date("2026-07-01"),
        nation: "Espanha",
        clubData: [
          season({
            id: "s1",
            seasonNumber: 1,
            players: [scheduledSoldPlayer],
          }),
        ],
      });

      await ServiceSeasons.addSeason(testCareer);

      const writtenCalls = batchSet.mock.calls.map((c) => c[1] as Players);
      const migratedPlayer = writtenCalls.find((p) => p.id === "p-scheduled-exit");

      expect(migratedPlayer).toBeDefined();
      expect(migratedPlayer!.sell).toBe(true);
      expect(migratedPlayer!.buy).toBe(false);
      expect(migratedPlayer!.contract[0].timing).toBe("Imediata");

      // Deve estar excluído do SquadTab da Temporada 2
      expect(isPlayerSoldOrDeparted(migratedPlayer!)).toBe(true);
      const { flatData } = buildSquadData([migratedPlayer!], "Ordenar por padrão", false, []);
      expect(flatData.some((p) => p.name === "Raphinha")).toBe(false);
    });
  });

  describe("3. Venda 'Próxima Janela' da Temporada 1 não volta no SquadTab da Temporada 2", () => {
    it("atleta vendido na Temporada 1 com 'Próxima Janela' sem cláusulas não é transportado para a Temporada 2", async () => {
      const soldNextWindowPlayer: Players = player({
        id: "p-sold-window",
        name: "Xavi Espart",
        sell: false, // Na Temporada 1 ficou sell: false enquanto jogava antes de janeiro
        contract: [
          {
            buyValue: 0,
            sellValue: 25000000,
            fromClub: "",
            leftClub: "Tottenham",
            dataArrival: null,
            dataExit: new Date("2026-07-13"),
            timing: "Próxima Janela",
            isLoan: false,
          },
        ],
      });

      const testCareer = career({
        createdAt: new Date("2026-07-01"),
        nation: "Espanha",
        clubData: [
          season({
            id: "s1",
            seasonNumber: 1,
            players: [soldNextWindowPlayer],
          }),
        ],
      });

      await ServiceSeasons.addSeason(testCareer);

      const writtenCalls = batchSet.mock.calls.map((c) => c[1] as Players);
      const migratedPlayer = writtenCalls.find((p) => p.id === "p-sold-window");

      // Como o atleta já saiu e não tem obrigações pendentes, NÃO é transportado
      expect(migratedPlayer).toBeUndefined();
    });

    it("se atleta vendido com 'Próxima Janela' tiver obrigações ativas, é transportado com sell: true garantido", async () => {
      const soldWindowWithClauses: Players = player({
        id: "p-sold-window-clauses",
        name: "Frenkie de Jong",
        sell: false,
        contract: [
          {
            buyValue: 0,
            sellValue: 70000000,
            fromClub: "",
            leftClub: "Manchester United",
            dataArrival: null,
            dataExit: new Date("2026-07-20"),
            timing: "Próxima Janela",
            isLoan: false,
            transferClauses: {
              buybackValue: 60000000,
            },
          },
        ],
      });

      const testCareer = career({
        createdAt: new Date("2026-07-01"),
        nation: "Espanha",
        clubData: [
          season({
            id: "s1",
            seasonNumber: 1,
            players: [soldWindowWithClauses],
          }),
        ],
      });

      await ServiceSeasons.addSeason(testCareer);

      const writtenCalls = batchSet.mock.calls.map((c) => c[1] as Players);
      const migratedPlayer = writtenCalls.find((p) => p.id === "p-sold-window-clauses");

      expect(migratedPlayer).toBeDefined();
      // Deve ter sell: true compulsório
      expect(migratedPlayer!.sell).toBe(true);
      expect(isPlayerSoldOrDeparted(migratedPlayer!)).toBe(true);

      // Não aparece no SquadTab da Temporada 2
      const { flatData } = buildSquadData([migratedPlayer!], "Ordenar por padrão", false, []);
      expect(flatData.some((p) => p.name === "Frenkie de Jong")).toBe(false);
    });
  });

  describe("4. Isolamento Temporal no Painel de Transferências (TransfersPanel / isContractInSeasonRange)", () => {
    const careerCreatedAt = new Date("2026-07-01");
    const nation = "Espanha";
    const season1Range = getSeasonDateRange(1, careerCreatedAt, nation);
    const season2Range = getSeasonDateRange(2, careerCreatedAt, nation);

    it("saída da Temporada 1 não é listada na Temporada 2 mesmo se o atleta estiver na temporada por recompra", () => {
      const season1ExitContract = {
        buyValue: 0,
        sellValue: 50000000,
        fromClub: "",
        leftClub: "Chelsea",
        dataArrival: null,
        dataExit: new Date("2026-08-15"), // Temporada 1
        timing: "Imediata" as const,
        transferClauses: {
          buybackValue: 70000000,
        },
      };

      // Na Temporada 1: pertence à temporada
      expect(isContractInSeasonRange(season1ExitContract, "exit", season1Range)).toBe(true);

      // Na Temporada 2: NÃO pertence à temporada
      expect(isContractInSeasonRange(season1ExitContract, "exit", season2Range)).toBe(false);
    });

    it("chegada da Temporada 1 não é listada na Temporada 2", () => {
      const season1ArrivalContract = {
        buyValue: 40000000,
        sellValue: 0,
        fromClub: "Bayern de Munique",
        leftClub: "",
        dataArrival: new Date("2026-07-15"), // Temporada 1
        dataExit: null,
        timing: "Imediata" as const,
      };

      expect(isContractInSeasonRange(season1ArrivalContract, "arrivals", season1Range)).toBe(true);
      expect(isContractInSeasonRange(season1ArrivalContract, "arrivals", season2Range)).toBe(false);
    });

    it("transferência da Temporada 2 é listada na Temporada 2", () => {
      const season2ExitContract = {
        buyValue: 0,
        sellValue: 60000000,
        fromClub: "",
        leftClub: "Arsenal",
        dataArrival: null,
        dataExit: new Date("2027-08-10"), // Temporada 2
        timing: "Imediata" as const,
      };

      expect(isContractInSeasonRange(season2ExitContract, "exit", season2Range)).toBe(true);
      expect(isContractInSeasonRange(season2ExitContract, "exit", season1Range)).toBe(false);
    });

    it("acordo com 'Próxima Temporada' firmado na Temporada 1 entra no TransfersPanel da Temporada 1", () => {
      const contractScheduledNextSeason = {
        buyValue: 0,
        sellValue: 45000000,
        fromClub: "",
        leftClub: "Juventus",
        dataArrival: null,
        dataExit: new Date("2026-09-01"),
        timing: "Proxima Temporada" as const,
      };

      expect(isContractInSeasonRange(contractScheduledNextSeason, "exit", season1Range)).toBe(true);
    });
  });

  describe("5. Exibição Condicional a Cláusulas Ativas (hasTransferActiveClauses & ManageClauses)", () => {
    it("saída da Temporada 1 com parcelas pendentes: hasTransferActiveClauses retorna true", () => {
      const exitWithPendingInstallments = {
        buyValue: 0,
        sellValue: 60000000,
        fromClub: "",
        leftClub: "Chelsea",
        dataArrival: null,
        dataExit: new Date("2026-07-15"),
        installments: {
          id: "inst-1",
          direction: "receivable" as const,
          status: "pending" as const,
          percentage: 100,
          totalInstallments: 3,
          remainingInstallments: 2,
          annualInstallmentValue: 20000000,
          upfrontValue: 0,
          firstPaymentSeasonNumber: 2,
          partnerClub: "Chelsea",
        },
      };

      expect(hasTransferActiveClauses(exitWithPendingInstallments)).toBe(true);
    });

    it("saída da Temporada 1 com parcelas 100% quitadas e sem outras cláusulas: hasTransferActiveClauses retorna false", () => {
      const exitFullyPaid = {
        buyValue: 0,
        sellValue: 60000000,
        fromClub: "",
        leftClub: "Chelsea",
        dataArrival: null,
        dataExit: new Date("2026-07-15"),
        installments: {
          id: "inst-1",
          direction: "receivable" as const,
          status: "paid" as const,
          percentage: 100,
          totalInstallments: 3,
          remainingInstallments: 1, // Última parcela já paga
          annualInstallmentValue: 20000000,
          upfrontValue: 0,
          firstPaymentSeasonNumber: 2,
          partnerClub: "Chelsea",
        },
      };

      expect(hasTransferActiveClauses(exitFullyPaid)).toBe(false);
    });

    it("chegada da Temporada 1 com bônus a pagar pendente: hasTransferActiveClauses retorna true", () => {
      const arrivalWithPendingBonus = {
        buyValue: 30000000,
        sellValue: 0,
        fromClub: "Ajax",
        leftClub: "",
        dataArrival: new Date("2026-07-10"),
        dataExit: null,
        bonuses: [
          {
            id: "b-1",
            direction: "payable" as const,
            category: "objective" as const,
            name: "Título da Liga",
            value: 5000000,
            status: "pending" as const,
          },
        ],
      };

      expect(hasTransferActiveClauses(arrivalWithPendingBonus)).toBe(true);
    });

    it("chegada da Temporada 1 100% quitada (bônus pagos/expirados e sem parcelas): hasTransferActiveClauses retorna false", () => {
      const arrivalFullySettled = {
        buyValue: 30000000,
        sellValue: 0,
        fromClub: "Ajax",
        leftClub: "",
        dataArrival: new Date("2026-07-10"),
        dataExit: null,
        bonuses: [
          {
            id: "b-1",
            direction: "payable" as const,
            category: "objective" as const,
            name: "Título da Liga",
            value: 5000000,
            status: "paid" as const,
          },
          {
            id: "b-2",
            direction: "payable" as const,
            category: "performance" as const,
            name: "Gols",
            value: 2000000,
            status: "expired" as const,
          },
        ],
      };

      expect(hasTransferActiveClauses(arrivalFullySettled)).toBe(false);
    });

    it("identifica cláusula de recompra ativa", () => {
      const exitWithBuyback = {
        buyValue: 0,
        sellValue: 20000000,
        fromClub: "",
        leftClub: "Girona",
        dataArrival: null,
        dataExit: new Date("2026-07-10"),
        transferClauses: {
          buybackValue: 35000000,
        },
      };

      expect(hasTransferActiveClauses(exitWithBuyback)).toBe(true);
    });

    it("identifica revenda futura (sellOnPercentage) ativa", () => {
      const exitWithSellOn = {
        buyValue: 0,
        sellValue: 20000000,
        fromClub: "",
        leftClub: "Girona",
        dataArrival: null,
        dataExit: new Date("2026-07-10"),
        transferClauses: {
          sellOnPercentage: 20,
        },
      };

      expect(hasTransferActiveClauses(exitWithSellOn)).toBe(true);
    });
  });

  describe("6. Contratação agendada para 'Próxima Temporada'", () => {
    it("atleta não entra no SquadTab na temporada atual e é ativado na Temporada 2", async () => {
      const preSignedPlayer: Players = player({
        id: "p-pre-signed",
        name: "Erling Haaland",
        buy: false,
        sell: false,
        age: 26,
        contract: [
          {
            buyValue: 200000000,
            sellValue: 0,
            fromClub: "Manchester City",
            leftClub: "",
            dataArrival: new Date("2026-08-20"),
            dataExit: null,
            timing: "Proxima Temporada",
          },
        ],
      });

      // Na Temporada 1: não deve estar ativo no elenco
      expect(isPlayerSoldOrDeparted(preSignedPlayer)).toBe(true);
      const squadSeason1 = buildSquadData([preSignedPlayer], "Ordenar por padrão", false, []);
      expect(squadSeason1.flatData.some((p) => p.name === "Erling Haaland")).toBe(false);

      // Transição para a Temporada 2:
      const testCareer = career({
        createdAt: new Date("2026-07-01"),
        nation: "Espanha",
        clubData: [
          season({
            id: "s1",
            seasonNumber: 1,
            players: [preSignedPlayer],
          }),
        ],
      });

      await ServiceSeasons.addSeason(testCareer);

      const writtenCalls = batchSet.mock.calls.map((c) => c[1] as Players);
      const migratedPlayer = writtenCalls.find((p) => p.id === "p-pre-signed");

      expect(migratedPlayer).toBeDefined();
      expect(migratedPlayer!.buy).toBe(true);
      expect(migratedPlayer!.sell).toBe(false);
      expect(migratedPlayer!.contract[0].timing).toBe("Imediata");

      // Na Temporada 2: deve estar presente no SquadTab!
      expect(isPlayerSoldOrDeparted(migratedPlayer!)).toBe(false);
      const squadSeason2 = buildSquadData([migratedPlayer!], "Ordenar por padrão", false, []);
      expect(squadSeason2.flatData.some((p) => p.name === "Erling Haaland")).toBe(true);

      // E no TransfersPanel da Temporada 2:
      const season2Range = getSeasonDateRange(2, testCareer.createdAt, testCareer.nation);
      expect(
        isContractInSeasonRange(migratedPlayer!.contract[0], "arrivals", season2Range),
      ).toBe(true);
    });
  });

  describe("7. Normalização Universal de Timings", () => {
    it("normaliza variações de caixa e diacríticos para 'Próxima Temporada'", () => {
      const variations = [
        "Proxima Temporada",
        "Próxima Temporada",
        "proxima temporada",
        "próxima temporada",
        "PROXIMA TEMPORADA",
        "PRÓXIMA TEMPORADA",
        "  Proxima Temporada  ",
      ];

      variations.forEach((v) => {
        expect(isNextSeasonTiming(v)).toBe(true);
        expect(isNextWindowTiming(v)).toBe(false);
        expect(isImmediateTiming(v)).toBe(false);
      });
    });

    it("normaliza variações de caixa e diacríticos para 'Próxima Janela'", () => {
      const variations = [
        "Proxima Janela",
        "Próxima Janela",
        "proxima janela",
        "próxima janela",
        "PROXIMA JANELA",
        "PRÓXIMA JANELA",
        "  Próxima Janela  ",
      ];

      variations.forEach((v) => {
        expect(isNextWindowTiming(v)).toBe(true);
        expect(isNextSeasonTiming(v)).toBe(false);
        expect(isImmediateTiming(v)).toBe(false);
      });
    });

    it("normaliza variações de caixa e gênero para 'Imediato' / 'Imediata'", () => {
      const variations = [
        "Imediato",
        "Imediata",
        "imediato",
        "imediata",
        "IMEDIATO",
        "IMEDIATA",
      ];

      variations.forEach((v) => {
        expect(isImmediateTiming(v)).toBe(true);
        expect(isNextSeasonTiming(v)).toBe(false);
        expect(isNextWindowTiming(v)).toBe(false);
      });
    });

    it("trata valores indefinidos ou nulos com segurança", () => {
      expect(normalizeTiming(undefined)).toBe("");
      expect(normalizeTiming(null as unknown as string)).toBe("");
      expect(isNextSeasonTiming(undefined)).toBe(false);
      expect(isNextWindowTiming(undefined)).toBe(false);
      expect(isImmediateTiming(undefined)).toBe(false);
    });
  });

  describe("8. Validação do Cenário Real do Usuário (Proxima Temporada no SquadTab e Isolamento no TransfersCardSummary)", () => {
    const careerCreatedAt = new Date("2026-07-01");

    // Cenário idêntico ao JSON fornecido pelo usuário:
    const proximaTempPlayer = player({
      id: "0c463a78-95b8-4eb0-ac96-5ac9a95c0e28",
      name: "proxima temp",
      position: "PE",
      sector: "Ataque",
      sell: true, // Legacy bug no save do usuário: sell=true mesmo com timing Próxima Temporada
      incomingLoan: false,
      loan: false,
      contract: [
        {
          leftClub: "Athletic Bilbao",
          fromClub: "",
          timing: "Proxima Temporada",
          sellValue: 10000000,
          buyValue: 0,
          dataExit: new Date("2026-07-01T03:00:00.000Z"),
          dataArrival: null,
          installments: {
            id: "inst_1",
            direction: "receivable",
            partnerClub: "Athletic Bilbao",
            upfrontValue: 4000000,
            annualInstallmentValue: 2000000,
            remainingInstallments: 3,
            totalInstallments: 3,
            firstPaymentSeasonNumber: 2,
            percentage: 60,
            status: "pending",
          },
        },
      ],
    });

    const xaviEspartPlayer = player({
      id: "fdf63831-d740-4c2b-99ec-1f0d3a2d352d",
      name: "Xavi Espart",
      position: "LD",
      sector: "Defesa",
      sell: false,
      incomingLoan: false,
      loan: false,
      contract: [
        {
          leftClub: "Tottenham",
          fromClub: "",
          timing: "Próxima Temporada",
          sellValue: 25400000,
          buyValue: 0,
          dataExit: new Date("2026-07-13T03:00:00.000Z"),
          dataArrival: null,
        },
      ],
    });

    const julesKoundePlayer = player({
      id: "c7b8dd4e-bd90-42aa-b575-5ab2b33fd0ec",
      name: "Jules Koundé",
      position: "LD",
      sector: "Defesa",
      sell: true,
      incomingLoan: false,
      loan: false,
      contract: [
        {
          leftClub: "Tottenham",
          fromClub: "",
          timing: "Imediata",
          sellValue: 75600000,
          buyValue: 0,
          dataExit: new Date("2026-07-13T03:00:00.000Z"),
          dataArrival: null,
          transferClauses: {
            buybackValue: 130000000,
          },
        },
      ],
    });

    it("isPlayerSoldOrDeparted retorna false para 'proxima temp' na Temporada 1 mesmo com sell: true", () => {
      // O timing 'Proxima Temporada' tem precedência soberana sobre a flag booleana legada sell: true
      expect(isPlayerSoldOrDeparted(proximaTempPlayer)).toBe(false);
      expect(isPlayerSoldOrDeparted(xaviEspartPlayer)).toBe(false);
      expect(isPlayerSoldOrDeparted(julesKoundePlayer)).toBe(true);
    });

    it("buildSquadData na Temporada 1 exibe tanto 'proxima temp' quanto 'Xavi Espart' e oculta 'Jules Koundé'", () => {
      const season1Players = [proximaTempPlayer, xaviEspartPlayer, julesKoundePlayer];
      const { flatData } = buildSquadData(season1Players, "Ordenar por padrão", false, []);

      expect(flatData.some((p) => p.name === "proxima temp")).toBe(true);
      expect(flatData.some((p) => p.name === "Xavi Espart")).toBe(true);
      expect(flatData.some((p) => p.name === "Jules Koundé")).toBe(false);
    });

    it("useTransferData na Temporada 1 lista acordos de 'Proxima Temporada' e saídas imediatas", () => {
      const season1 = season({
        id: "season-1",
        seasonNumber: 1,
        players: [proximaTempPlayer, xaviEspartPlayer, julesKoundePlayer],
      });

      const userCareer = career({
        nation: "Alemanha",
        createdAt: careerCreatedAt,
        clubData: [season1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(MemoryRouter, { initialEntries: ["/career/c1/season/1"] }, children);

      const { result } = renderHook(() => useTransferData(userCareer, season1), { wrapper });

      // Na Temporada 1, Koundé (Imediata), 'proxima temp' (Proxima Temporada) e 'Xavi Espart' (Próxima Temporada) aparecem no TransfersCardSummary
      expect(result.current.departures.some((p) => p.name === "Jules Koundé")).toBe(true);
      expect(result.current.departures.some((p) => p.name === "proxima temp")).toBe(true);
      expect(result.current.departures.some((p) => p.name === "Xavi Espart")).toBe(true);
    });

    it("TransfersPanel na Temporada 1 exibe 'Saída: Proxima Temporada' para vendas agendadas e valor monetário para imediatas", () => {
      const season1 = season({
        id: "season-1",
        seasonNumber: 1,
        players: [proximaTempPlayer, xaviEspartPlayer, julesKoundePlayer],
      });

      const userCareer = career({
        nation: "Alemanha",
        currency: "EUR",
        createdAt: careerCreatedAt,
        clubData: [season1],
      });

      const { unmount } = render(
        <TransfersPanel
          title="Saídas"
          players={[proximaTempPlayer, xaviEspartPlayer, julesKoundePlayer]}
          currency="EUR"
          career={userCareer}
          season={season1}
        />
      );

      // 'proxima temp' e 'Xavi Espart' devem exibir 'Saída: Proxima Temporada' com formatação bicolor
      const salidaSpans = screen.getAllByText("Saída:");
      expect(salidaSpans.length).toBe(2);
      salidaSpans.forEach((span) => {
        expect(span.style.color).toMatch(/rgb\(11, 179, 42\)|var\(--color-add-player\)/);
      });

      const nextSeasonSpans = screen.getAllByText("Proxima Temporada");
      expect(nextSeasonSpans.length).toBe(2);
      nextSeasonSpans.forEach((span) => {
        expect(span.style.color).toMatch(/rgb\(11, 179, 42\)|var\(--color-add-player\)/);
      });

      // Koundé deve exibir o valor monetário formatado
      expect(screen.getByText("€75.6M")).toBeTruthy();
      unmount();
    });

    it("TransfersPanel para timing 'Próxima Janela' exibe 'Saída: Proxima Janela' antes da janela e valor monetário após saída", () => {
      const playerPending = player({
        id: "p-win-pending",
        name: "Janela Pendente",
        contract: [
          {
            buyValue: 0,
            fromClub: "",
            dataArrival: null,
            leftClub: "Bayern",
            timing: "Proxima Janela",
            sellValue: 30000000,
            dataExit: new Date("2026-08-10T00:00:00.000Z"),
          },
        ],
      });

      const playerDeparted = player({
        id: "p-win-departed",
        name: "Janela Partiu",
        contract: [
          {
            buyValue: 0,
            fromClub: "",
            dataArrival: null,
            leftClub: "Dortmund",
            timing: "Proxima Janela",
            sellValue: 40000000,
            dataExit: new Date("2026-08-10T00:00:00.000Z"),
          },
        ],
      });

      // Partida em dezembro pendente (jogador ainda não saiu)
      const seasonPending = season({
        id: "season-pending",
        seasonNumber: 1,
        matches: [
          match({
            matchesId: "m1",
            date: "2026-12-15",
            status: "SCHEDULED",
          }),
        ],
      });

      const { unmount } = render(
        <TransfersPanel
          title="Saídas"
          players={[playerPending]}
          currency="EUR"
          season={seasonPending}
        />
      );

      const salidaSpan = screen.getByText("Saída:");
      expect(salidaSpan.style.color).toMatch(/rgb\(11, 179, 42\)|var\(--color-add-player\)/);
      const nextWindowSpan = screen.getByText("Proxima Janela");
      expect(nextWindowSpan.style.color).toMatch(/rgb\(11, 179, 42\)|var\(--color-add-player\)/);
      unmount();

      // Partida em janeiro finalizada (jogador já saiu)
      const seasonFinished = season({
        id: "season-finished",
        seasonNumber: 1,
        matches: [
          match({
            matchesId: "m-dec",
            date: "2026-12-31",
            status: "FINISHED",
          }),
          match({
            matchesId: "m-jan",
            date: "2027-01-05",
            status: "FINISHED",
          }),
        ],
      });

      render(
        <TransfersPanel
          title="Saídas"
          players={[playerDeparted]}
          currency="EUR"
          season={seasonFinished}
        />
      );

      // Agora que a janela abriu e ele partiu, exibe o valor
      expect(screen.getByText("€40M")).toBeTruthy();
    });

    it("useTransferData na Temporada 2 isola as transferências da Temporada 2 e não traz transferências passadas", () => {
      // Simulação da Temporada 2 após createSeason
      const proximaTempSeason2 = player({
        ...proximaTempPlayer,
        sell: true,
        contract: [
          {
            ...proximaTempPlayer.contract![0],
            timing: "Imediata",
            dataExit: new Date("2027-07-01T00:00:00.000Z"), // Início da temporada 2
            fromScheduledAgreement: true,
          },
        ],
      });

      const xaviEspartSeason2 = player({
        ...xaviEspartPlayer,
        sell: true,
        contract: [
          {
            ...xaviEspartPlayer.contract![0],
            timing: "Imediata",
            dataExit: new Date("2027-07-01T00:00:00.000Z"),
            fromScheduledAgreement: true,
          },
        ],
      });

      // Koundé foi preservado apenas por ter buyback clause, mas sua dataExit pertence à Temporada 1 (2026-07-13)
      const koundeSeason2 = player({
        ...julesKoundePlayer,
      });

      const season1 = season({
        id: "season-1",
        seasonNumber: 1,
        players: [proximaTempPlayer, xaviEspartPlayer, julesKoundePlayer],
      });

      const season2 = season({
        id: "season-2",
        seasonNumber: 2,
        players: [proximaTempSeason2, xaviEspartSeason2, koundeSeason2],
      });

      const userCareer = career({
        nation: "Alemanha",
        createdAt: careerCreatedAt,
        clubData: [season1, season2],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(MemoryRouter, { initialEntries: ["/career/c1/season/2"] }, children);

      const { result } = renderHook(() => useTransferData(userCareer, season2), { wrapper });

      // Na Temporada 2, 'proxima temp' e 'Xavi Espart' são ativados e saem na Temporada 2
      expect(result.current.departures.some((p) => p.name === "proxima temp")).toBe(true);
      expect(result.current.departures.some((p) => p.name === "Xavi Espart")).toBe(true);

      // Koundé pertenceu à Temporada 1 e NÃO deve reaparecer nas saídas da Temporada 2
      expect(result.current.departures.some((p) => p.name === "Jules Koundé")).toBe(false);
    });

    it("TransfersPanel na Temporada 2 exibe valor de transferência e data de saída para os jogadores ativados", () => {
      const proximaTempSeason2 = player({
        ...proximaTempPlayer,
        sell: true,
        contract: [
          {
            ...proximaTempPlayer.contract![0],
            timing: "Imediata",
            dataExit: new Date("2027-07-01T00:00:00.000Z"),
            fromScheduledAgreement: true,
          },
        ],
      });

      const season2 = season({
        id: "season-2",
        seasonNumber: 2,
        players: [proximaTempSeason2],
      });

      const userCareer = career({
        nation: "Alemanha",
        currency: "EUR",
        createdAt: careerCreatedAt,
        clubData: [season2],
      });

      render(
        <TransfersPanel
          title="Saídas"
          players={[proximaTempSeason2]}
          currency="EUR"
          career={userCareer}
          season={season2}
        />
      );

      // Na Temporada 2, exibe o valor da venda (€ 10.000.000) e a data de saída (01 de julho de 2027)
      expect(screen.getByText("€10M")).toBeTruthy();
      expect(screen.getByText("01 de julho de 2027")).toBeTruthy();
    });

    it("useTransferData na página /Geral agrega todas as transferências históricas", () => {
      const season1 = season({
        id: "season-1",
        seasonNumber: 1,
        players: [proximaTempPlayer, xaviEspartPlayer, julesKoundePlayer],
      });

      const userCareer = career({
        nation: "Alemanha",
        createdAt: careerCreatedAt,
        clubData: [season1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(MemoryRouter, { initialEntries: ["/career/c1/Geral"] }, children);

      const { result } = renderHook(() => useTransferData(userCareer, season1), { wrapper });

      // Na página geral, todas as saídas cadastradas são agregadas
      expect(result.current.departures.some((p) => p.name === "Jules Koundé")).toBe(true);
      expect(result.current.departures.some((p) => p.name === "proxima temp")).toBe(true);
      expect(result.current.departures.some((p) => p.name === "Xavi Espart")).toBe(true);
    });
  });
});

