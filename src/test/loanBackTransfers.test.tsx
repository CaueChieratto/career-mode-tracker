// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
import {
  getLoanBackEndSeasonNumber,
  isPlayerSoldOrDeparted,
} from "../common/services/ServicePlayers/helpers/transferTimingHelpers";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";
import TransfersCardSummary from "../layout/SectionView/features/ClubTabs/FinanceTab/components/TransfersCardSummary";
import { buildTransferCopyText } from "../components/TransfersModal/components/TransfersPanel/utils/buildTransferCopyText";

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

afterEach(() => {
  cleanup();
});

describe("Duração e Cálculo de Temporadas do Empréstimo de Volta (getLoanBackEndSeasonNumber)", () => {
  it("Caso A: Saída em 01/01 (meio de temporada europeia) com empréstimo de 1 temporada termina na Temporada 3", () => {
    // Venda acordada em 13/07 com saída prevista para a próxima janela (01/01)
    const contract: NonNullable<Players["contract"]>[number] = {
      fromClub: "",
      leftClub: "Tottenham",
      buyValue: 0,
      sellValue: 25400000,
      isLoan: false,
      dataExit: new Date("2026-07-13T03:00:00.000Z"),
      dataArrival: null,
      timing: "Próxima Janela",
      transferClauses: {
        firstRefusal: true,
        loanBackDuration: 1,
      },
    };

    const endSeason = getLoanBackEndSeasonNumber(
      contract,
      new Date("2026-07-01"),
      "ESP", // Europa
      1,
    );

    // Temporada 1: restante (parcial)
    // Temporada 2: 1ª temporada completa
    // Temporada 3: fim do empréstimo
    expect(endSeason).toBe(3);
  });

  it("Caso B: Saída em 01/01 (meio de temporada europeia) com empréstimo de 2 temporadas termina na Temporada 4", () => {
    const contract: NonNullable<Players["contract"]>[number] = {
      fromClub: "",
      leftClub: "Tottenham",
      buyValue: 0,
      sellValue: 25400000,
      isLoan: false,
      dataExit: new Date("2026-07-13T03:00:00.000Z"),
      dataArrival: null,
      timing: "Próxima Janela",
      transferClauses: {
        loanBackDuration: 2,
      },
    };

    const endSeason = getLoanBackEndSeasonNumber(
      contract,
      new Date("2026-07-01"),
      "ESP",
      1,
    );

    // Temporada 1: restante
    // Temporada 2: 1ª temporada completa
    // Temporada 3: 2ª temporada completa
    // Temporada 4: fim do empréstimo
    expect(endSeason).toBe(4);
  });

  it("Caso C: Saída em 01/01 da Temporada 2 com empréstimo de 1 temporada termina na Temporada 4", () => {
    const contract: NonNullable<Players["contract"]>[number] = {
      fromClub: "",
      leftClub: "Tottenham",
      buyValue: 0,
      sellValue: 25400000,
      isLoan: false,
      dataExit: new Date("2027-07-13T03:00:00.000Z"), // Temporada 2
      dataArrival: null,
      timing: "Próxima Janela",
      transferClauses: {
        loanBackDuration: 1,
      },
    };

    const endSeason = getLoanBackEndSeasonNumber(
      contract,
      new Date("2026-07-01"),
      "ESP",
      2,
    );

    // Temporada 2: restante
    // Temporada 3: 1ª temporada completa
    // Temporada 4: fim do empréstimo
    expect(endSeason).toBe(4);
  });

  it("Calendário não europeu: transferência em 01/01 (início da temporada) com empréstimo de 1 temporada termina na Temporada 2", () => {
    const contract: NonNullable<Players["contract"]>[number] = {
      fromClub: "",
      leftClub: "River Plate",
      buyValue: 0,
      sellValue: 15000000,
      isLoan: false,
      dataExit: new Date("2026-01-01T00:00:00.000Z"),
      dataArrival: null,
      timing: "Imediata",
      transferClauses: {
        loanBackDuration: 1,
      },
    };

    const endSeason = getLoanBackEndSeasonNumber(
      contract,
      new Date("2026-01-01"),
      "Brasil", // América do Sul / Não europeu
      1,
    );

    // Início da Temporada 1: cobre Temporada 1 inteira
    // Temporada 2: fim do empréstimo
    expect(endSeason).toBe(2);
  });

  it("Calendário não europeu: transferência em 01/07 (meio da temporada) com empréstimo de 1 temporada termina na Temporada 3", () => {
    const contract: NonNullable<Players["contract"]>[number] = {
      fromClub: "",
      leftClub: "River Plate",
      buyValue: 0,
      sellValue: 15000000,
      isLoan: false,
      dataExit: new Date("2026-07-01T00:00:00.000Z"),
      dataArrival: null,
      timing: "Imediata",
      transferClauses: {
        loanBackDuration: 1,
      },
    };

    const endSeason = getLoanBackEndSeasonNumber(
      contract,
      new Date("2026-01-01"),
      "Brasil",
      1,
    );

    // Meio da Temporada 1: restante da Temporada 1 + Temporada 2 completa
    // Temporada 3: fim do empréstimo
    expect(endSeason).toBe(3);
  });
});

describe("TransfersPanel e Registro de Chegadas para Empréstimo de Volta", () => {
  it("exibe o jogador vendido com empréstimo de retorno em Chegadas com indicação 'Empréstimo' e clube de origem", () => {
    const soldPlayerLoanBack = player({
      id: "fdf63831-d740-4c2b-99ec-1f0d3a2d352d",
      name: "Xavi Espart",
      position: "LD",
      contractTime: 2,
      salary: 49500,
      contract: [
        {
          fromClub: "",
          dataExit: new Date("2026-07-13T03:00:00.000Z"),
          timing: "Próxima Janela",
          transferClauses: {
            firstRefusal: true,
            loanBackDuration: 1,
          },
          dataArrival: null,
          isLoan: false,
          leftClub: "Tottenham",
          buyValue: 0,
          sellValue: 25400000,
        },
      ],
    });

    const testSeason = season({
      seasonNumber: 1,
      players: [soldPlayerLoanBack],
      matches: [
        {
          id: "m1",
          status: "FINISHED",
          date: "31/12/2026",
          adversary: "Arsenal",
        } as never,
        {
          id: "m2",
          status: "SCHEDULED",
          date: "01/01/2027",
          adversary: "Chelsea",
        } as never,
      ],
    });

    const onTransferClick = vi.fn();

    render(
      <TransfersPanel
        title="Chegadas"
        players={[soldPlayerLoanBack]}
        currency="€"
        season={testSeason}
        onTransferClick={onTransferClick}
      />,
    );

    expect(screen.getByText("X. Espart")).toBeDefined();
    expect(screen.getByText("De: Tottenham")).toBeDefined();
    expect(screen.getByText("Empréstimo")).toBeDefined();

    // Empréstimo de retorno não permite edição a partir do TransfersPanel (cursor default, sem trigger de onTransferClick)
    const item = screen.getByText("X. Espart").closest("li");
    expect(item?.style.cursor).toBe("default");
    fireEvent.click(item!);
    expect(onTransferClick).not.toHaveBeenCalled();
  });

  it("exibe o jogador de empréstimo de retorno no TransferInfo de Chegadas da aba Finanças", () => {
    const soldPlayerLoanBack = player({
      id: "p-transfer-info-test",
      name: "Xavi Espart",
      contract: [
        {
          fromClub: "",
          leftClub: "Tottenham",
          buyValue: 0,
          sellValue: 25400000,
          isLoan: false,
          dataExit: new Date("2026-07-13T03:00:00.000Z"),
          dataArrival: null,
          timing: "Próxima Janela",
          transferClauses: {
            loanBackDuration: 1,
          },
        },
      ],
    });

    const testSeason = season({
      seasonNumber: 1,
      players: [soldPlayerLoanBack],
    });

    const testCareer = career({
      createdAt: new Date("2026-07-01"),
      nation: "Espanha",
      clubData: [testSeason],
    });

    render(
      <MemoryRouter>
        <TransfersCardSummary season={testSeason} career={testCareer} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Chegadas")).toBeDefined();
    expect(screen.getByText("Saídas")).toBeDefined();
    const playerElements = screen.getAllByText("Xavi Espart");
    expect(playerElements).toHaveLength(2);
  });

  it("gera texto de cópia adequado para chegada de empréstimo de retorno", () => {
    const soldPlayerLoanBack = player({
      id: "p-copy-test",
      name: "Xavi Espart",
      position: "LD",
      age: 19,
      nation: "ESP",
      contractTime: 1,
      salary: 49500,
      contract: [
        {
          fromClub: "",
          leftClub: "Tottenham",
          buyValue: 0,
          sellValue: 25400000,
          isLoan: false,
          dataExit: new Date("2026-07-13T03:00:00.000Z"),
          dataArrival: null,
          timing: "Próxima Janela",
          transferClauses: {
            loanBackDuration: 1,
          },
        },
      ],
    });

    const copyText = buildTransferCopyText({
      player: soldPlayerLoanBack,
      contract: soldPlayerLoanBack.contract![0],
      direction: "arrivals",
      currency: "€",
    });

    expect(copyText).toContain("Xavi Espart, LD, 19 anos, ESP");
    expect(copyText).toContain("1 ano de empréstimo");
    expect(copyText).toContain("foi contratado por empréstimo do Tottenham");
  });
});

describe("Continuidade de Temporadas com Empréstimo de Volta (ServiceSeasons)", () => {
  it("Temporada 1 -> Temporada 2: jogador permanece disponível no elenco da Temporada 2 (incomingLoan: true, sell: false)", async () => {
    const xaviEspart = player({
      id: "xavi-1",
      name: "Xavi Espart",
      sell: false,
      loan: false,
      incomingLoan: false,
      contractTime: 2,
      contract: [
        {
          fromClub: "",
          dataExit: new Date("2026-07-13T03:00:00.000Z"),
          timing: "Próxima Janela",
          transferClauses: {
            firstRefusal: true,
            loanBackDuration: 1,
          },
          dataArrival: null,
          isLoan: false,
          leftClub: "Tottenham",
          buyValue: 0,
          sellValue: 25400000,
        },
      ],
    });

    const testCareer = career({
      createdAt: new Date("2026-07-01"),
      nation: "ESP",
      clubData: [
        season({
          id: "s1",
          seasonNumber: 1,
          players: [xaviEspart],
        }),
      ],
    });

    await ServiceSeasons.addSeason(testCareer);

    expect(batchSet).toHaveBeenCalledTimes(1);
    const writtenPlayer = batchSet.mock.calls[0][1] as Players;
    expect(writtenPlayer.id).toBe("xavi-1");
    // Na Temporada 2, empréstimo de retorno ainda está vigente!
    expect(writtenPlayer.sell).toBe(false);
    expect(writtenPlayer.incomingLoan).toBe(true);
    expect(writtenPlayer.contractTime).toBe(1);
    // Deve estar elegível para o elenco ativo
    expect(isPlayerSoldOrDeparted(writtenPlayer)).toBe(false);
  });

  it("Temporada 2 -> Temporada 3: empréstimo termina e jogador registra 'Fim de Empréstimo' de saída", async () => {
    // Jogador no estado em que ficou na Temporada 2
    const xaviSeason2 = player({
      id: "xavi-1",
      name: "Xavi Espart",
      sell: false,
      loan: false,
      incomingLoan: true,
      contractTime: 1,
      contract: [
        {
          fromClub: "",
          dataExit: new Date("2026-07-13T03:00:00.000Z"),
          timing: "Imediata",
          transferClauses: {
            firstRefusal: true,
            loanBackDuration: 1,
            loanEndSeasonNumber: 3,
          },
          dataArrival: null,
          isLoan: false,
          leftClub: "Tottenham",
          buyValue: 0,
          sellValue: 25400000,
        },
      ],
    });

    const testCareer = career({
      createdAt: new Date("2026-07-01"),
      nation: "ESP",
      clubData: [
        season({
          id: "s1",
          seasonNumber: 1,
        }),
        season({
          id: "s2",
          seasonNumber: 2,
          players: [xaviSeason2],
        }),
      ],
    });

    await ServiceSeasons.addSeason(testCareer);

    expect(batchSet).toHaveBeenCalledTimes(1);
    const writtenPlayer = batchSet.mock.calls[0][1] as Players;
    expect(writtenPlayer.id).toBe("xavi-1");
    // Na Temporada 3, o empréstimo acabou!
    expect(writtenPlayer.sell).toBe(true);
    expect(writtenPlayer.incomingLoan).toBe(false);
    expect(writtenPlayer.loan).toBe(false);
    // Não deve estar no elenco ativo da Temporada 3
    expect(isPlayerSoldOrDeparted(writtenPlayer)).toBe(true);

    // Contrato de saída por fim de empréstimo anexado
    const lastContract = writtenPlayer.contract[writtenPlayer.contract.length - 1];
    expect(lastContract.leftClub).toBe("Tottenham");
    expect(lastContract.fromClub).toBe("Tottenham");
    expect(lastContract.isLoan).toBe(true);
    expect(lastContract.sellValue).toBe(0);

    // No painel de saídas da Temporada 3, renderiza com "Fim do Empréstimo"
    const season3 = season({
      seasonNumber: 3,
      players: [writtenPlayer],
    });

    const onExitTransferClick = vi.fn();

    render(
      <TransfersPanel
        title="Saídas"
        players={[writtenPlayer]}
        currency="€"
        season={season3}
        career={testCareer}
        onTransferClick={onExitTransferClick}
      />,
    );

    expect(screen.getByText("X. Espart")).toBeDefined();
    expect(screen.getByText("Para: Tottenham")).toBeDefined();
    expect(screen.getByText("Fim do Empréstimo")).toBeDefined();

    // Fim de empréstimo de retorno também não é editável no TransfersPanel (cursor default, sem trigger de onTransferClick)
    const item = screen.getByText("X. Espart").closest("li");
    expect(item?.style.cursor).toBe("default");
    fireEvent.click(item!);
    expect(onExitTransferClick).not.toHaveBeenCalled();
  });

  it("permite clicar e editar transferências de empréstimo normal e fim de empréstimo normal", () => {
    const normalLoanPlayer = player({
      id: "p-normal-loan",
      name: "Endrick",
      incomingLoan: true,
      contract: [
        {
          fromClub: "Real Madrid",
          leftClub: "",
          buyValue: 0,
          sellValue: 0,
          isLoan: true,
          dataArrival: new Date("2026-07-15"),
        },
      ],
    });

    const testSeason = season({
      seasonNumber: 1,
      players: [normalLoanPlayer],
    });

    const onNormalLoanClick = vi.fn();

    render(
      <TransfersPanel
        title="Chegadas"
        players={[normalLoanPlayer]}
        currency="€"
        season={testSeason}
        onTransferClick={onNormalLoanClick}
      />,
    );

    expect(screen.getByText("Empréstimo")).toBeDefined();
    const item = screen.getByText("Endrick").closest("li");
    expect(item?.style.cursor).toBe("pointer");
    fireEvent.click(item!);
    expect(onNormalLoanClick).toHaveBeenCalledTimes(1);

    cleanup();

    // Normal loan return exit
    const normalLoanReturnPlayer = player({
      id: "p-normal-return",
      name: "Endrick",
      sell: true,
      incomingLoan: false,
      contract: [
        {
          fromClub: "Real Madrid",
          leftClub: "Real Madrid",
          buyValue: 0,
          sellValue: 0,
          isLoan: true,
          dataArrival: null,
          dataExit: new Date("2026-07-15"),
        },
      ],
    });

    const onNormalReturnClick = vi.fn();

    render(
      <TransfersPanel
        title="Saídas"
        players={[normalLoanReturnPlayer]}
        currency="€"
        season={testSeason}
        onTransferClick={onNormalReturnClick}
      />,
    );

    expect(screen.getByText("Fim do Empréstimo")).toBeDefined();
    const returnItem = screen.getByText("Endrick").closest("li");
    expect(returnItem?.style.cursor).toBe("pointer");
    fireEvent.click(returnItem!);
    expect(onNormalReturnClick).toHaveBeenCalledTimes(1);
  });
});
