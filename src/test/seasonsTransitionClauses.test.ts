import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { career, player, season } from "./factories/domain";
import { Players } from "../common/interfaces/playersInfo/players";

vi.mock("../common/helpers/Getters", () => ({ getCareerById: vi.fn() }));
vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn(),
}));

const batchSet = vi.fn<(...args: unknown[]) => void>();
const batchUpdate = vi.fn<(...args: unknown[]) => void>();
const commit = vi.fn<() => Promise<void>>();

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

describe("Higiene de Cláusulas e Transição de Temporada (Bloco 3 - ServiceSeasons)", () => {
  it("parcelamento pendente migra com decremento (remainingInstallments - 1) e status resetado para pending", async () => {
    const playerWithInstallment = player({
      id: "p-inst",
      contract: [
        {
          buyValue: 30000000,
          sellValue: 0,
          fromClub: "Porto",
          leftClub: "",
          dataArrival: new Date(),
          dataExit: null,
          installments: {
            id: "inst-1",
            direction: "payable",
            status: "paid", // Foi paga na temporada 1
            percentage: 100,
            totalInstallments: 3,
            remainingInstallments: 3,
            annualInstallmentValue: 10000000,
            upfrontValue: 0,
            firstPaymentSeasonNumber: 2,
            partnerClub: "Porto",
          },
        },
      ],
    });

    const testCareer = career({
      clubData: [
        season({
          id: "s1",
          seasonNumber: 1,
          players: [playerWithInstallment],
        }),
      ],
    });

    await ServiceSeasons.addSeason(testCareer);

    const writtenPlayer = batchSet.mock.calls[0][1] as Players;
    expect(writtenPlayer.id).toBe("p-inst");
    expect(writtenPlayer.contract[0].installments).toBeDefined();
    expect(writtenPlayer.contract[0].installments?.remainingInstallments).toBe(2);
    expect(writtenPlayer.contract[0].installments?.status).toBe("pending");
  });

  it("parcelamento 100% quitado (remainingInstallments === 1 pago) é expurgado da nova temporada", async () => {
    const playerFinalInstallment = player({
      id: "p-final",
      contract: [
        {
          buyValue: 10000000,
          sellValue: 0,
          fromClub: "Ajax",
          leftClub: "",
          dataArrival: new Date(),
          dataExit: null,
          installments: {
            id: "inst-final",
            direction: "payable",
            status: "paid", // Última parcela paga
            percentage: 100,
            totalInstallments: 3,
            remainingInstallments: 1,
            annualInstallmentValue: 10000000,
            upfrontValue: 0,
            firstPaymentSeasonNumber: 2,
            partnerClub: "Ajax",
          },
        },
      ],
    });

    const testCareer = career({
      clubData: [
        season({
          id: "s1",
          seasonNumber: 1,
          players: [playerFinalInstallment],
        }),
      ],
    });

    await ServiceSeasons.addSeason(testCareer);

    const writtenPlayer = batchSet.mock.calls[0][1] as Players;
    expect(writtenPlayer.id).toBe("p-final");
    // Como a parcela foi a última e foi quitada, ela não migra para a temporada seguinte
    expect(writtenPlayer.contract[0].installments).toBeUndefined();
  });

  it("bônus pagos e liquidados são expurgados na virada de temporada", async () => {
    const playerWithBonuses = player({
      id: "p-bonus",
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: null,
          dataExit: null,
          bonuses: [
            {
              id: "b-paid",
              direction: "payable",
              category: "performance",
              name: "Meta Batida",
              value: 1000000,
              status: "paid", // Liquidado
            },
            {
              id: "b-pending",
              direction: "payable",
              category: "objective",
              name: "Meta Futura",
              value: 2000000,
              status: "pending",
            },
          ],
        },
      ],
    });

    const testCareer = career({
      clubData: [
        season({
          id: "s1",
          seasonNumber: 1,
          players: [playerWithBonuses],
        }),
      ],
    });

    await ServiceSeasons.addSeason(testCareer);

    const writtenPlayer = batchSet.mock.calls[0][1] as Players;
    expect(writtenPlayer.id).toBe("p-bonus");
    expect(writtenPlayer.contract[0].bonuses).toHaveLength(1);
    expect(writtenPlayer.contract[0].bonuses?.[0].id).toBe("b-pending");
  });

  it("decrementa Empréstimo de Volta (loanBackDuration: 2 -> 1) e conclui retorno quando duration é 1", async () => {
    // Caso 1: Duração 2 -> passa para 1
    const playerLb2 = player({
      id: "p-lb2",
      loan: true,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "Santos",
          leftClub: "",
          dataArrival: new Date(),
          dataExit: null,
          transferClauses: {
            loanBackDuration: 2,
          },
        },
      ],
    });

    const career1 = career({
      clubData: [season({ players: [playerLb2] })],
    });

    await ServiceSeasons.addSeason(career1);
    const written1 = batchSet.mock.calls[0][1] as Players;
    expect(written1.contract[0].transferClauses?.loanBackDuration).toBe(1);
    expect(written1.loan).toBe(true);

    batchSet.mockReset();

    // Caso 2: Duração 1 -> conclui empréstimo e integra ao elenco principal
    const playerLb1 = player({
      id: "p-lb1",
      loan: true,
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "Santos",
          leftClub: "",
          dataArrival: new Date(),
          dataExit: null,
          transferClauses: {
            loanBackDuration: 1,
          },
        },
      ],
    });

    const career2 = career({
      clubData: [season({ players: [playerLb1] })],
    });

    await ServiceSeasons.addSeason(career2);
    const written2 = batchSet.mock.calls[0][1] as Players;
    expect(written2.loan).toBe(false); // Integrado ao elenco principal!
    expect(written2.contract[0].transferClauses?.loanBackDuration).toBeUndefined();
  });

  it("efetiva automaticamente contratação pré-agendada com timing Proxima temporada", async () => {
    const preScheduledPlayer = player({
      id: "p-pre",
      buy: false,
      contract: [
        {
          buyValue: 20000000,
          sellValue: 0,
          fromClub: "Benfica",
          leftClub: "",
          dataArrival: new Date(),
          dataExit: null,
          timing: "Proxima temporada",
        },
      ],
    });

    const testCareer = career({
      clubData: [
        season({
          id: "s1",
          seasonNumber: 1,
          players: [preScheduledPlayer],
        }),
      ],
    });

    await ServiceSeasons.addSeason(testCareer);

    const writtenPlayer = batchSet.mock.calls[0][1] as Players;
    expect(writtenPlayer.id).toBe("p-pre");
    expect(writtenPlayer.buy).toBe(true);
    expect(writtenPlayer.sell).toBe(false);
    expect(writtenPlayer.contract[0].timing).toBe("Imediata");
  });

  it("migra jogador vendido que possui parcelas futuras ativas a receber", async () => {
    const soldPlayerWithReceivables = player({
      id: "p-sold-inst",
      sell: true,
      contract: [
        {
          buyValue: 0,
          sellValue: 60000000,
          fromClub: "",
          leftClub: "Chelsea",
          dataArrival: null,
          dataExit: new Date(),
          installments: {
            id: "inst-rec",
            direction: "receivable",
            status: "paid", // Parcela do ano 1 recebida
            percentage: 100,
            totalInstallments: 3,
            remainingInstallments: 3,
            annualInstallmentValue: 20000000,
            upfrontValue: 0,
            firstPaymentSeasonNumber: 2,
            partnerClub: "Chelsea",
          },
        },
      ],
    });

    const testCareer = career({
      clubData: [
        season({
          id: "s1",
          seasonNumber: 1,
          players: [soldPlayerWithReceivables],
        }),
      ],
    });

    await ServiceSeasons.addSeason(testCareer);

    const writtenPlayer = batchSet.mock.calls[0][1] as Players;
    expect(writtenPlayer.id).toBe("p-sold-inst");
    expect(writtenPlayer.sell).toBe(true);
    expect(writtenPlayer.contract[0].installments?.remainingInstallments).toBe(2);
    expect(writtenPlayer.contract[0].installments?.status).toBe("pending");
  });
});

