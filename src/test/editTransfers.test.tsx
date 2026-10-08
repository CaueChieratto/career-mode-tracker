// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildEditTransferFormSections,
  checkIsPromotedFromAcademy,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/constants/buildEditTransferFormSections";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { ServicePlayers } from "../common/services/ServicePlayers";
import { mapFormDataToPlayerData } from "../common/helpers/Mappers";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";
import { deleteDoc, setDoc } from "firebase/firestore";
import { ModalType } from "../common/types/enums/ModalType";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import EditTransferScreen from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/screens/EditTransferScreen";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { formatPlayerName } from "../common/utils/formatPlayerName";

// Mock Firebase & Auth
vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: {
    currentUser: { uid: "user-123" },
  },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn(),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({ clubColor: "#ff0000", darkClubColor: "#990000" }),
}));

vi.mock("../common/services/ServicePlayers/helpers/authHelpers", () => ({
  requireAuth: () => ({ uid: "user-123" }),
}));

const mockAddTeamToSeason = vi.fn().mockResolvedValue(undefined);
vi.mock(
  "../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches",
  () => ({
    ServiceMatches: {
      addTeamToSeason: (...args: unknown[]) => mockAddTeamToSeason(...args),
      getAllTeamsAcrossUserCareers: async () => [],
    },
  }),
);

let mockCareer: Career;
vi.mock("../common/helpers/Getters", () => ({
  getCareerById: async () => mockCareer,
}));

if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

describe("buildEditTransferFormSections", () => {
  it("gera seções corretas para saída do tipo Venda", () => {
    const sections = buildEditTransferFormSections("exit", "Venda", [
      "Real Madrid",
    ]);
    expect(sections).toHaveLength(3);
    expect(sections[0].title).toBe("Tipo de Transferência");
    expect(sections[0].fields[0][0].name).toBe("Qual o tipo da transferencia?");
    expect(sections[0].fields[0][0].options).toEqual(["Venda", "Emprestar"]);

    const detailFieldIds = sections[1].fields.flat().map((f) => f.id);
    expect(detailFieldIds).toContain("toClub");
    expect(detailFieldIds).toContain("sellValue");
    expect(detailFieldIds).toContain("dateExit");
    expect(detailFieldIds).not.toContain("loanDuration");
    expect(detailFieldIds).not.toContain("wagePercentage");

    expect(sections[2].title).toBe("Manutenção");
    expect(sections[2].fields[0][0].id).toBe("revertTransfer");
    expect(sections[2].fields[0][0].checkbox).toBe(true);
    expect(sections[2].fields[0][0].action).toBe(
      ModalType.REVERT_TRANSFER_CONFIRM,
    );
  });

  it("gera seções corretas para saída do tipo Emprestar", () => {
    const sections = buildEditTransferFormSections("exit", "Emprestar", [
      "Real Madrid",
    ]);
    expect(sections).toHaveLength(3);
    const detailFieldIds = sections[1].fields.flat().map((f) => f.id);
    expect(detailFieldIds).toContain("toClub");
    expect(detailFieldIds).toContain("loanDuration");
    expect(detailFieldIds).toContain("wagePercentage");
    expect(detailFieldIds).toContain("dateExit");
    expect(detailFieldIds).not.toContain("sellValue");
    expect(sections[2].title).toBe("Manutenção");
    expect(sections[2].fields[0][0].id).toBe("revertTransfer");
    expect(sections[2].fields[0][0].checkbox).toBe(true);
    expect(sections[2].fields[0][0].action).toBe(
      ModalType.REVERT_TRANSFER_CONFIRM,
    );
  });

  it("gera seções corretas para chegada do tipo Compra", () => {
    const sections = buildEditTransferFormSections("arrivals", "Compra", [
      "Santos",
    ]);
    expect(sections).toHaveLength(3);
    expect(sections[0].fields[0][0].options).toEqual(["Compra", "Empréstimo"]);
    const detailFieldIds = sections[1].fields.flat().map((f) => f.id);
    expect(detailFieldIds).toContain("fromClub");
    expect(detailFieldIds).toContain("buyValue");
    expect(detailFieldIds).toContain("dateArrival");
    expect(detailFieldIds).not.toContain("loanDuration");
    expect(detailFieldIds).not.toContain("wagePercentage");
    expect(sections[2].title).toBe("Manutenção");
    expect(sections[2].fields[0][0].id).toBe("revertTransfer");
    expect(sections[2].fields[0][0].checkbox).toBe(true);
    expect(sections[2].fields[0][0].action).toBe(
      ModalType.REVERT_TRANSFER_CONFIRM,
    );
  });

  it("gera seções corretas para chegada do tipo Empréstimo", () => {
    const sections = buildEditTransferFormSections("arrivals", "Empréstimo", [
      "Santos",
    ]);
    expect(sections).toHaveLength(3);
    const detailFieldIds = sections[1].fields.flat().map((f) => f.id);
    expect(detailFieldIds).toContain("fromClub");
    expect(detailFieldIds).toContain("loanDuration");
    expect(detailFieldIds).toContain("wagePercentage");
    expect(detailFieldIds).toContain("dateArrival");
    expect(detailFieldIds).not.toContain("buyValue");
    expect(sections[2].title).toBe("Manutenção");
    expect(sections[2].fields[0][0].id).toBe("revertTransfer");
    expect(sections[2].fields[0][0].checkbox).toBe(true);
    expect(sections[2].fields[0][0].action).toBe(
      ModalType.REVERT_TRANSFER_CONFIRM,
    );
  });

  it("gera seções corretas para transferência especial promovida da base (sem manutenção/reversão)", () => {
    const academyContract = {
      fromClub: "Base",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      isLoan: false,
      dataArrival: new Date("2024-07-01"),
    } as unknown as NonNullable<Players["contract"]>[number];
    const sections = buildEditTransferFormSections(
      "arrivals",
      "Compra",
      [],
      academyContract,
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Detalhes da Transferência");
    expect(sections[0].fields[0][0].id).toBe("dateArrival");
    expect(sections[0].fields[0][0].name).toBe("Data da promoção");
  });

  it("gera seções corretas para transferência especial de aposentadoria (com manutenção)", () => {
    const retirementContract = {
      fromClub: "",
      leftClub: "Aposentou",
      buyValue: 0,
      sellValue: 0,
      isLoan: false,
      dataArrival: new Date("2024-01-01"),
      dataExit: new Date("2024-08-01"),
    } as unknown as NonNullable<Players["contract"]>[number];
    const sections = buildEditTransferFormSections(
      "exit",
      "Venda",
      [],
      retirementContract,
    );
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Detalhes da Transferência");
    expect(sections[0].fields[0][0].id).toBe("dateExit");
    expect(sections[0].fields[0][0].name).toBe("Data da aposentadoria");
    expect(sections[1].title).toBe("Manutenção");
    expect(sections[1].fields[0][0].id).toBe("revertTransfer");
  });

  it("gera seções corretas para transferência especial de término de contrato", () => {
    const endContract = {
      fromClub: "",
      leftClub: "Fim de Contrato",
      buyValue: 0,
      sellValue: 0,
      isLoan: false,
      dataArrival: new Date("2024-01-01"),
      dataExit: new Date("2024-08-01"),
    } as unknown as NonNullable<Players["contract"]>[number];
    const sections = buildEditTransferFormSections(
      "exit",
      "Venda",
      [],
      endContract,
    );
    expect(sections).toHaveLength(2);
    expect(sections[0].fields[0][0].id).toBe("dateExit");
    expect(sections[0].fields[0][0].name).toBe("Data do término de contrato");
    expect(sections[1].title).toBe("Manutenção");
  });
});

describe("PlayersContractService.editTransferInSeason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCareer = {
      id: "career-1",
      createdAt: new Date("2024-01-01"),
      nation: "BRA",
      currency: "€",
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          teams: [{ name: "Existing Team", showMatch: false }],
          players: [
            {
              id: "player-1",
              name: "Jogador 1",
              sell: false,
              loan: true,
              buy: false,
              incomingLoan: false,
              contract: [
                {
                  fromClub: "Clube Antigo",
                  buyValue: 0,
                  leftClub: "Destino Antigo",
                  sellValue: 0,
                  isLoan: true,
                  loanDuration: 1,
                  wagePercentage: 50,
                  dataArrival: new Date("2024-07-01"),
                  dataExit: new Date("2024-08-01"),
                },
              ],
            } as Players,
          ],
        } as ClubData,
      ],
    } as unknown as Career;
  });

  it("edita saída de empréstimo para venda com sucesso", async () => {
    await PlayersContractService.editTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-1",
      contractIndex: 0,
      direction: "exit",
      transferType: "Venda",
      clubName: "Novo Comprador",
      transferValue: "50M",
      date: "15/08",
    });

    const player = mockCareer.clubData[0].players[0];
    expect(player.sell).toBe(true);
    expect(player.loan).toBe(false);
    expect(player.contract![0].leftClub).toBe("Novo Comprador");
    expect(player.contract![0].sellValue).toBe(50000000);
    expect(player.contract![0].isLoan).toBe(false);
    expect(player.contract![0].loanDuration).toBeUndefined();
    expect(mockAddTeamToSeason).toHaveBeenCalledWith(
      "career-1",
      "season-1",
      expect.objectContaining({ name: "Novo Comprador" }),
    );
  });

  it("edita saída de venda para empréstimo com sucesso", async () => {
    const player = mockCareer.clubData[0].players[0];
    player.sell = true;
    player.loan = false;
    player.contract![0].sellValue = 1000000;
    player.contract![0].isLoan = false;

    await PlayersContractService.editTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-1",
      contractIndex: 0,
      direction: "exit",
      transferType: "Emprestar",
      clubName: "Clube Empréstimo",
      transferValue: "0",
      date: "20/08",
      loanDuration: "2",
      wagePercentage: "60",
    });

    expect(player.sell).toBe(false);
    expect(player.loan).toBe(true);
    expect(player.shirtNumber).toBe("");
    expect(player.contract![0].leftClub).toBe("Clube Empréstimo");
    expect(player.contract![0].sellValue).toBe(0);
    expect(player.contract![0].isLoan).toBe(true);
    expect(player.contract![0].loanDuration).toBe(2);
    expect(player.contract![0].wagePercentage).toBe(60);
  });

  it("edita chegada para compra com sucesso", async () => {
    const player = mockCareer.clubData[0].players[0];
    player.incomingLoan = true;

    await PlayersContractService.editTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-1",
      contractIndex: 0,
      direction: "arrivals",
      transferType: "Compra",
      clubName: "Vendedor FC",
      transferValue: "25M",
      date: "10/07",
    });

    expect(player.buy).toBe(true);
    expect(player.incomingLoan).toBe(false);
    expect(player.contract![0].fromClub).toBe("Vendedor FC");
    expect(player.contract![0].buyValue).toBe(25000000);
    expect(player.contract![0].isLoan).toBe(false);
  });

  it("edita chegada para empréstimo com sucesso", async () => {
    const player = mockCareer.clubData[0].players[0];
    player.buy = true;
    player.incomingLoan = false;

    await PlayersContractService.editTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-1",
      contractIndex: 0,
      direction: "arrivals",
      transferType: "Empréstimo",
      clubName: "Cedente FC",
      transferValue: "0",
      date: "12/07",
      loanDuration: "1",
      wagePercentage: "80",
    });

    expect(player.buy).toBe(false);
    expect(player.incomingLoan).toBe(true);
    expect(player.contract![0].fromClub).toBe("Cedente FC");
    expect(player.contract![0].buyValue).toBe(0);
    expect(player.contract![0].isLoan).toBe(true);
    expect(player.contract![0].loanDuration).toBe(1);
    expect(player.contract![0].wagePercentage).toBe(80);
  });

  it("edita data de transferência especial sem sobrescrever clube ou adicionar à lista de times", async () => {
    const player = mockCareer.clubData[0].players[0];
    player.contract![0].fromClub = "Base";
    player.contract![0].buyValue = 0;
    player.contract![0].isLoan = false;

    await PlayersContractService.editTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-1",
      contractIndex: 0,
      direction: "arrivals",
      transferType: "Compra",
      clubName: "Base",
      transferValue: "0",
      date: "05/08",
    });

    expect(player.contract![0].fromClub).toBe("Base");
    expect(player.contract![0].dataArrival).toEqual(new Date(2024, 7, 5));
    expect(mockAddTeamToSeason).not.toHaveBeenCalled();
  });
});

describe("PlayersContractService.revertTransferInSeason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCareer = {
      id: "career-1",
      createdAt: new Date("2024-01-01"),
      nation: "BRA",
      currency: "€",
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          teams: [],
          players: [
            {
              id: "player-exit-sold",
              name: "Jogador Vendido",
              sell: true,
              loan: false,
              buy: false,
              incomingLoan: false,
              contract: [
                {
                  fromClub: "Clube Anterior",
                  dataArrival: new Date("2024-01-01"),
                  leftClub: "Real Madrid",
                  sellValue: 50000000,
                  dataExit: new Date("2024-08-01"),
                  isLoan: false,
                },
              ],
            } as Players,
            {
              id: "player-exit-loaned",
              name: "Jogador Emprestado",
              sell: false,
              loan: true,
              buy: false,
              incomingLoan: false,
              contract: [
                {
                  fromClub: "Clube Anterior",
                  dataArrival: new Date("2024-01-01"),
                  leftClub: "Girona",
                  sellValue: 0,
                  dataExit: new Date("2024-08-01"),
                  isLoan: true,
                  loanDuration: 1,
                  wagePercentage: 50,
                },
              ],
            } as Players,
            {
              id: "player-special-retired",
              name: "Jogador Aposentado",
              sell: true,
              loan: false,
              buy: false,
              incomingLoan: false,
              contract: [
                {
                  fromClub: "Clube Anterior",
                  dataArrival: new Date("2024-01-01"),
                  leftClub: "Aposentou",
                  sellValue: 0,
                  dataExit: new Date("2024-08-01"),
                  isLoan: false,
                },
              ],
            } as Players,
            {
              id: "player-academy",
              name: "Jovem da Base",
              sell: false,
              loan: false,
              buy: false,
              incomingLoan: false,
              contract: [
                {
                  fromClub: "Base",
                  dataArrival: new Date("2024-07-01"),
                  buyValue: 0,
                  isLoan: false,
                },
              ],
            } as Players,
            {
              id: "player-academy-sold",
              name: "Jovem da Base Vendido",
              sell: true,
              loan: false,
              buy: false,
              incomingLoan: false,
              contract: [
                {
                  fromClub: "Base",
                  dataArrival: new Date("2024-07-01"),
                  leftClub: "AJ Auxerre",
                  sellValue: 9000000,
                  dataExit: new Date("2024-08-01"),
                  isLoan: false,
                },
              ],
            } as Players,
            {
              id: "player-arrival-bought",
              name: "Jogador Comprado",
              sell: false,
              loan: false,
              buy: true,
              incomingLoan: false,
              contract: [
                {
                  fromClub: "Santos",
                  dataArrival: new Date("2024-07-01"),
                  buyValue: 20000000,
                  isLoan: false,
                },
              ],
            } as Players,
            {
              id: "player-arrival-multiple",
              name: "Jogador Multi Contrato",
              sell: false,
              loan: false,
              buy: true,
              incomingLoan: false,
              contract: [
                {
                  fromClub: "Flamengo",
                  dataArrival: new Date("2024-01-01"),
                  buyValue: 10000000,
                  leftClub: "Cruzeiro",
                  dataExit: new Date("2024-06-01"),
                  isLoan: true,
                },
                {
                  fromClub: "Cruzeiro",
                  dataArrival: new Date("2024-07-01"),
                  buyValue: 0,
                },
              ],
            } as Players,
          ],
        } as ClubData,
      ],
    } as unknown as Career;
  });

  it("reverte saída de venda com sucesso, restaurando o jogador no elenco", async () => {
    await PlayersContractService.revertTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-exit-sold",
      contractIndex: 0,
      direction: "exit",
    });

    const player = mockCareer.clubData[0].players.find(
      (p) => p.id === "player-exit-sold",
    )!;
    expect(player.sell).toBe(false);
    expect(player.loan).toBe(false);
    expect(player.contract![0].leftClub).toBe("");
    expect(player.contract![0].dataExit).toBeNull();
    expect(player.contract![0].sellValue).toBe(0);
    expect(setDoc).toHaveBeenCalled();
  });

  it("reverte saída de empréstimo com sucesso", async () => {
    await PlayersContractService.revertTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-exit-loaned",
      contractIndex: 0,
      direction: "exit",
    });

    const player = mockCareer.clubData[0].players.find(
      (p) => p.id === "player-exit-loaned",
    )!;
    expect(player.sell).toBe(false);
    expect(player.loan).toBe(false);
    expect(player.contract![0].leftClub).toBe("");
    expect(player.contract![0].isLoan).toBe(false);
    expect(player.contract![0].loanDuration).toBeUndefined();
    expect(setDoc).toHaveBeenCalled();
  });

  it("reverte saída especial (aposentadoria) com sucesso", async () => {
    await PlayersContractService.revertTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-special-retired",
      contractIndex: 0,
      direction: "exit",
    });

    const player = mockCareer.clubData[0].players.find(
      (p) => p.id === "player-special-retired",
    )!;
    expect(player.sell).toBe(false);
    expect(player.contract![0].leftClub).toBe("");
    expect(player.contract![0].dataExit).toBeNull();
    expect(setDoc).toHaveBeenCalled();
  });

  it("impede expressamente reversão de chegada de jogador promovido da base", async () => {
    await expect(
      PlayersContractService.revertTransferInSeason({
        careerId: "career-1",
        seasonId: "season-1",
        playerId: "player-academy",
        contractIndex: 0,
        direction: "arrivals",
      }),
    ).rejects.toThrow(
      "Transferências promovidas da base não podem ser revertidas.",
    );
  });

  it("permite reversão da venda (saída) de jogador originalmente promovido da base", async () => {
    await PlayersContractService.revertTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-academy-sold",
      contractIndex: 0,
      direction: "exit",
    });

    const player = mockCareer.clubData[0].players.find(
      (p) => p.id === "player-academy-sold",
    )!;
    expect(player.sell).toBe(false);
    expect(player.loan).toBe(false);
    expect(player.contract![0].fromClub).toBe("Base");
    expect(player.contract![0].leftClub).toBe("");
    expect(player.contract![0].sellValue).toBe(0);
    expect(player.contract![0].dataExit).toBeNull();
    expect(setDoc).toHaveBeenCalled();
  });

  it("reverte chegada de compra (único contrato) deletando o jogador da temporada", async () => {
    await PlayersContractService.revertTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-arrival-bought",
      contractIndex: 0,
      direction: "arrivals",
    });

    expect(deleteDoc).toHaveBeenCalled();
    expect(
      mockCareer.clubData[0].players.find(
        (p) => p.id === "player-arrival-bought",
      ),
    ).toBeUndefined();
  });

  it("reverte chegada de múltiplos contratos removendo o último contrato sem deletar o jogador", async () => {
    await PlayersContractService.revertTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "player-arrival-multiple",
      contractIndex: 1,
      direction: "arrivals",
    });

    const player = mockCareer.clubData[0].players.find(
      (p) => p.id === "player-arrival-multiple",
    )!;
    expect(player).toBeDefined();
    expect(player.contract).toHaveLength(1);
    expect(player.contract![0].fromClub).toBe("Flamengo");
    expect(setDoc).toHaveBeenCalled();
  });
});

describe("TransfersPanel click handling", () => {
  it("chama onTransferClick ao clicar no item li com os dados da transferência", () => {
    const testPlayer = {
      id: "p1",
      name: "Neymar Jr",
      contract: [
        {
          fromClub: "Santos",
          buyValue: 100000000,
          dataArrival: new Date("2024-07-15"),
        },
      ],
    } as unknown as Players;

    const onTransferClick = vi.fn();
    render(
      <TransfersPanel
        title="Chegadas"
        players={[testPlayer]}
        currency="€"
        onTransferClick={onTransferClick}
      />,
    );

    const item = screen.getByText(formatPlayerName("Neymar Jr")).closest("li");
    expect(item).not.toBeNull();
    fireEvent.click(item!);

    expect(onTransferClick).toHaveBeenCalledTimes(1);
    expect(onTransferClick).toHaveBeenCalledWith(
      expect.objectContaining({
        player: testPlayer,
        contractIndex: 0,
      }),
      "arrivals",
    );
  });

  it("não chama onTransferClick ao clicar em chegada de jogador promovido da base", () => {
    const academyPlayer = {
      id: "p-academy",
      name: "Garoto da Base",
      contract: [
        {
          fromClub: "Base",
          buyValue: 0,
          dataArrival: new Date("2024-07-15"),
        },
      ],
    } as unknown as Players;

    const onTransferClick = vi.fn();
    render(
      <TransfersPanel
        title="Chegadas"
        players={[academyPlayer]}
        currency="€"
        onTransferClick={onTransferClick}
      />,
    );

    const item = screen.getByText(formatPlayerName("Garoto da Base")).closest("li");
    expect(item).not.toBeNull();
    fireEvent.click(item!);

    expect(onTransferClick).not.toHaveBeenCalled();
  });

  it("permite clicar em saída de jogador que veio da base e foi vendido", () => {
    const soldAcademyPlayer = {
      id: "p-sold-academy",
      name: "Base Vendido",
      sell: true,
      contract: [
        {
          fromClub: "Base",
          leftClub: "Chelsea",
          sellValue: 15000000,
          dataExit: new Date("2024-08-01"),
        },
      ],
    } as unknown as Players;

    const onTransferClick = vi.fn();
    render(
      <TransfersPanel
        title="Saídas"
        players={[soldAcademyPlayer]}
        currency="€"
        onTransferClick={onTransferClick}
      />,
    );

    const item = screen.getByText(formatPlayerName("Base Vendido")).closest("li");
    expect(item).not.toBeNull();
    fireEvent.click(item!);

    expect(onTransferClick).toHaveBeenCalledTimes(1);
  });
});

describe("Segurança do mapFormDataToPlayerData na edição", () => {
  it("ao editar um jogador emprestado (incomingLoan: true), NÃO recria nem altera contract", () => {
    const initialContract = [
      {
        fromClub: "Porto",
        buyValue: 0,
        isLoan: true,
        loanDuration: 1,
        wagePercentage: 100,
        dataArrival: new Date("2024-07-01"),
      },
    ];

    const loanedPlayer = {
      id: "p-loaned",
      name: "Atacante Emprestado",
      incomingLoan: true,
      buy: false,
      salary: 50000,
      contractTime: 1,
      contract: initialContract,
    } as unknown as Players;

    const formData = new FormData();
    formData.append("playerName", "Atacante Emprestado Atualizado");
    formData.append("playerValue", "15M");
    formData.append("salary", "60k");
    formData.append("contractTime", "2");

    const result = mapFormDataToPlayerData(
      formData,
      { id: "c1", createdAt: new Date(), nation: "BRA" } as Career,
      { id: "s2", seasonNumber: 2 } as ClubData,
      loanedPlayer,
    );

    // Na edição, contract NUNCA deve ser incluído no resultado parcial
    expect(result.contract).toBeUndefined();
    // Flags de transferência permanecem inalteradas
    expect(result.incomingLoan).toBe(true);
    expect(result.buy).toBe(false);
    expect(result.contractTime).toBe(2);
    expect(result.salary).toBe(60000);
  });
});

describe("EditTransferScreen UI para reversão de transferência", () => {
  it("renderiza o botão 'Sim' (igual ao de deletar jogador) e abre modal de confirmação ao clicar", () => {
    const testPlayer = {
      id: "p1",
      name: "Jogador Teste",
      sell: true,
      loan: false,
      contract: [
        {
          fromClub: "Clube Antigo",
          buyValue: 0,
          leftClub: "Clube Destino",
          sellValue: 20000000,
          dataArrival: new Date("2024-01-01"),
          dataExit: new Date("2024-08-01"),
          isLoan: false,
        },
      ],
    } as unknown as Players;

    const onClose = vi.fn();
    const revertSpy = vi
      .spyOn(ServicePlayers, "revertTransferInSeason")
      .mockResolvedValue(undefined);

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <EditTransferScreen
              career={
                {
                  id: "career-1",
                  currency: "€",
                  clubData: [],
                } as unknown as Career
              }
              season={
                {
                  id: "season-1",
                  seasonNumber: 1,
                  players: [testPlayer],
                } as unknown as ClubData
              }
              player={testPlayer}
              contract={testPlayer.contract![0]}
              contractIndex={0}
              direction="exit"
              onClose={onClose}
            />
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    // Deve exibir o label da reversão na seção de Manutenção
    expect(screen.getByText("Reverter essa transferência?")).toBeDefined();

    // Deve renderizar um botão "Sim" (FormSegmentedControl), e NÃO um input de texto
    const simButton = screen.getByRole("button", { name: "Sim" });
    expect(simButton).toBeDefined();

    // Ao clicar em "Sim", abre o modal de confirmação com o título "Reverter Transferência?"
    fireEvent.click(simButton);
    expect(screen.getByText("Reverter Transferência?")).toBeDefined();
    expect(screen.getByText("Cancelar")).toBeDefined();
    expect(screen.getByText("Confirmar")).toBeDefined();

    // Ao clicar em Confirmar, executa a reversão
    fireEvent.click(screen.getByText("Confirmar"));
    expect(revertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        careerId: "career-1",
        seasonId: "season-1",
        playerId: "p1",
        direction: "exit",
      }),
    );
  });
});

describe("checkIsPromotedFromAcademy e buildEditTransferFormSections para jogadores da base", () => {
  it("identifica como promovido da base apenas quando direction é arrivals", () => {
    const contract = {
      fromClub: "Base",
      leftClub: "AJ Auxerre",
      sellValue: 9000000,
    } as Contract;

    expect(checkIsPromotedFromAcademy(contract, "arrivals")).toBe(true);
    expect(checkIsPromotedFromAcademy(contract, "exit")).toBe(false);
  });

  it("inclui seção de manutenção com reversão na saída (venda) de jogador da base", () => {
    const contract = {
      fromClub: "Base",
      leftClub: "AJ Auxerre",
      sellValue: 9000000,
      dataExit: new Date("2024-08-01"),
    } as Contract;

    const sections = buildEditTransferFormSections(
      "exit",
      "Venda",
      [],
      contract,
    );
    const maintenanceSection = sections.find((s) => s.title === "Manutenção");
    expect(maintenanceSection).toBeDefined();
    expect(maintenanceSection?.fields[0][0].id).toBe("revertTransfer");
  });

  it("não inclui seção de manutenção na chegada de jogador promovido da base", () => {
    const contract = {
      fromClub: "Base",
      dataArrival: new Date("2024-07-01"),
    } as Contract;

    const sections = buildEditTransferFormSections(
      "arrivals",
      "Compra",
      [],
      contract,
    );
    const maintenanceSection = sections.find((s) => s.title === "Manutenção");
    expect(maintenanceSection).toBeUndefined();
  });
});

describe("TransfersPanel botão de copiar (FaRegCopy)", () => {
  it("renderiza o botão de cópia centralizado e copia o texto sem disparar onTransferClick", async () => {
    cleanup();
    const testPlayer = {
      id: "p-palavecino",
      name: "Augustín Palavecino",
      position: "MC",
      age: 29,
      nation: "ARG",
      contractTime: 4,
      salary: 45000,
      contract: [
        {
          fromClub: "Cruz Azul",
          buyValue: 7000000,
          dataArrival: new Date("2024-07-01"),
        },
      ],
    } as unknown as Players;

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const onTransferClick = vi.fn();
    const { getByLabelText } = render(
      <TransfersPanel
        title="Chegadas"
        players={[testPlayer]}
        currency="€"
        onTransferClick={onTransferClick}
      />,
    );

    const copyBtn = getByLabelText("Copiar transferência");
    expect(copyBtn).toBeDefined();

    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(
      "Augustín Palavecino, MC, 29 anos, ARG, 4 anos de contrato com um salario semanal de 45 mil, foi contratado do Cruz Azul por 7 milhões de euros.",
    );
    expect(onTransferClick).not.toHaveBeenCalled();
  });
});

describe("applyRevertToCareer (atualização síncrona sem necessidade de F5)", () => {
  it("reverte saída em memória instantaneamente atualizando sell e loan para false", async () => {
    const { applyRevertToCareer } = await import(
      "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useEditTransferForm"
    );

    const initialCareer: Career = {
      id: "c1",
      clubData: [
        {
          id: "s1",
          seasonNumber: 1,
          players: [
            {
              id: "p1",
              name: "Jogador Vendido",
              sell: true,
              loan: false,
              contract: [
                {
                  fromClub: "Nacional",
                  leftClub: "Cruz Azul",
                  sellValue: 7000000,
                  dataArrival: new Date("2023-01-01"),
                  dataExit: new Date("2024-07-01"),
                },
              ],
            } as unknown as Players,
          ],
        } as unknown as ClubData,
      ],
    } as unknown as Career;

    const updatedCareer = applyRevertToCareer(
      initialCareer,
      "s1",
      "p1",
      0,
      "exit",
    );

    const revertedPlayer = updatedCareer.clubData[0].players.find(
      (p) => p.id === "p1",
    )!;
    expect(revertedPlayer.sell).toBe(false);
    expect(revertedPlayer.loan).toBe(false);
    expect(revertedPlayer.contract[0].leftClub).toBe("");
    expect(revertedPlayer.contract[0].dataExit).toBeNull();
    expect(revertedPlayer.contract[0].sellValue).toBe(0);
  });

  it("reverte chegada de único contrato em memória removendo o jogador sem necessidade de F5", async () => {
    const { applyRevertToCareer } = await import(
      "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useEditTransferForm"
    );

    const initialCareer: Career = {
      id: "c1",
      clubData: [
        {
          id: "s1",
          seasonNumber: 1,
          players: [
            {
              id: "p-bought",
              name: "Jogador Comprado",
              buy: true,
              contract: [
                {
                  fromClub: "Cruz Azul",
                  buyValue: 7000000,
                  dataArrival: new Date("2024-07-01"),
                },
              ],
            } as unknown as Players,
          ],
        } as unknown as ClubData,
      ],
    } as unknown as Career;

    const updatedCareer = applyRevertToCareer(
      initialCareer,
      "s1",
      "p-bought",
      0,
      "arrivals",
    );

    expect(updatedCareer.clubData[0].players).toHaveLength(0);
  });

  it("reverte saída de fim de empréstimo recebido restaurando incomingLoan: true e mantendo isLoan: true", async () => {
    const { applyRevertToCareer } = await import(
      "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useEditTransferForm"
    );

    const initialCareer: Career = {
      id: "c1",
      clubData: [
        {
          id: "s1",
          seasonNumber: 1,
          players: [
            {
              id: "p-loan-return-exit",
              name: "Endrick",
              sell: true,
              loan: false,
              incomingLoan: false,
              contract: [
                {
                  fromClub: "Real Madrid",
                  leftClub: "Real Madrid",
                  buyValue: 0,
                  sellValue: 0,
                  isLoan: true,
                  loanDuration: 1,
                  wagePercentage: 50,
                  dataArrival: new Date("2024-01-01"),
                  dataExit: new Date("2024-06-30"),
                },
              ],
            } as unknown as Players,
          ],
        } as unknown as ClubData,
      ],
    } as unknown as Career;

    const updatedCareer = applyRevertToCareer(
      initialCareer,
      "s1",
      "p-loan-return-exit",
      0,
      "exit",
    );

    const revertedPlayer = updatedCareer.clubData[0].players.find(
      (p) => p.id === "p-loan-return-exit",
    )!;
    expect(revertedPlayer.sell).toBe(false);
    expect(revertedPlayer.loan).toBe(false);
    expect(revertedPlayer.incomingLoan).toBe(true);
    expect(revertedPlayer.contract[0].leftClub).toBe("");
    expect(revertedPlayer.contract[0].dataExit).toBeNull();
    expect(revertedPlayer.contract[0].isLoan).toBe(true);
  });
});

describe("buildEditTransferFormSections para Custo Zero e Fim de Empréstimo em Saídas", () => {
  it("trata chegada a custo zero de um clube como transferência normal editável", () => {
    const zeroCostArrivalContract = {
      fromClub: "Santos",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      isLoan: false,
      dataArrival: new Date("2024-07-01"),
    } as unknown as NonNullable<Players["contract"]>[number];

    const sections = buildEditTransferFormSections(
      "arrivals",
      "Compra",
      ["Santos"],
      zeroCostArrivalContract,
    );

    expect(sections).toHaveLength(3);
    expect(sections[0].title).toBe("Tipo de Transferência");
    expect(sections[0].fields[0][0].options).toEqual(["Compra", "Empréstimo"]);

    const detailFieldIds = sections[1].fields.flat().map((f) => f.id);
    expect(detailFieldIds).toContain("fromClub");
    expect(detailFieldIds).toContain("buyValue");
    expect(detailFieldIds).toContain("dateArrival");

    expect(sections[2].title).toBe("Manutenção");
    expect(sections[2].fields[0][0].id).toBe("revertTransfer");
  });

  it("trata saída a custo zero para um clube como transferência normal editável", () => {
    const zeroCostExitContract = {
      fromClub: "",
      leftClub: "Coritiba",
      buyValue: 0,
      sellValue: 0,
      isLoan: false,
      dataArrival: new Date("2024-01-01"),
      dataExit: new Date("2024-08-01"),
    } as unknown as NonNullable<Players["contract"]>[number];

    const sections = buildEditTransferFormSections(
      "exit",
      "Venda",
      ["Coritiba"],
      zeroCostExitContract,
    );

    expect(sections).toHaveLength(3);
    expect(sections[0].title).toBe("Tipo de Transferência");
    expect(sections[0].fields[0][0].options).toEqual(["Venda", "Emprestar"]);

    const detailFieldIds = sections[1].fields.flat().map((f) => f.id);
    expect(detailFieldIds).toContain("toClub");
    expect(detailFieldIds).toContain("sellValue");
    expect(detailFieldIds).toContain("dateExit");

    expect(sections[2].title).toBe("Manutenção");
    expect(sections[2].fields[0][0].id).toBe("revertTransfer");
  });

  it("gera seções específicas para fim de empréstimo recebido em saídas sem opções de venda/empréstimo", () => {
    const incomingLoanExitContract = {
      fromClub: "Real Madrid",
      leftClub: "Real Madrid",
      buyValue: 0,
      sellValue: 0,
      isLoan: true,
      dataArrival: new Date("2024-01-01"),
      dataExit: new Date("2024-06-30"),
    } as unknown as NonNullable<Players["contract"]>[number];

    const player = {
      id: "p-incoming-exit",
      name: "Endrick",
      incomingLoan: false,
      sell: true,
      contract: [incomingLoanExitContract],
    } as unknown as Players;

    const sections = buildEditTransferFormSections(
      "exit",
      "Fim de Empréstimo",
      ["Real Madrid"],
      incomingLoanExitContract,
      player,
    );

    // Deve ter apenas 2 seções: Detalhes da Transferência e Manutenção (sem Tipo de Transferência)
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Detalhes da Transferência");

    const detailFieldIds = sections[0].fields.flat().map((f) => f.id);
    expect(detailFieldIds).toContain("toClub");
    expect(detailFieldIds).toContain("dateExit");
    expect(detailFieldIds).not.toContain("sellValue");
    expect(detailFieldIds).not.toContain("loanDuration");
    expect(detailFieldIds).not.toContain("wagePercentage");

    expect(sections[1].title).toBe("Manutenção");
    expect(sections[1].fields[0][0].id).toBe("revertTransfer");
  });
});

describe("TransfersPanel rótulo Custo Zero vs Fim do Empréstimo em Chegadas", () => {
  it("exibe rótulo 'Custo Zero' para compra a custo zero vinda de um clube real", () => {
    cleanup();
    const zeroCostBoughtPlayer = {
      id: "p-free-buy",
      name: "Ganso",
      buy: true,
      contract: [
        {
          fromClub: "Santos",
          buyValue: 0,
          dataArrival: new Date("2024-07-15"),
        },
      ],
    } as unknown as Players;

    render(
      <TransfersPanel
        title="Chegadas"
        players={[zeroCostBoughtPlayer]}
        currency="€"
        onTransferClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Custo Zero")).toBeDefined();
    expect(screen.queryByText("Fim do Empréstimo")).toBeNull();
  });

  it("exibe rótulo 'Fim do Empréstimo' para jogador que de fato retornou de empréstimo concedido", () => {
    cleanup();
    const loanReturnPlayer = {
      id: "p-loan-return",
      name: "Reinier",
      buy: false,
      loan: false,
      contract: [
        {
          fromClub: "Flamengo",
          leftClub: "Girona",
          isLoan: true,
          dataArrival: new Date("2023-01-01"),
          dataExit: new Date("2024-06-30"),
        },
        {
          fromClub: "Girona",
          buyValue: 0,
          dataArrival: new Date("2024-07-01"),
        },
      ],
    } as unknown as Players;

    render(
      <TransfersPanel
        title="Chegadas"
        players={[loanReturnPlayer]}
        currency="€"
        onTransferClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Fim do Empréstimo")).toBeDefined();
  });

  it("exibe rótulo 'Fim do Empréstimo' para jogador que possui buy: true e retornou de empréstimo", () => {
    cleanup();
    const boughtAndLoanedPlayer = {
      id: "p-bought-and-loaned",
      name: "Vitor Roque",
      buy: true,
      loan: false,
      contract: [
        {
          fromClub: "Athletico-PR",
          buyValue: 40000000,
          leftClub: "Betis",
          isLoan: true,
          dataArrival: new Date("2024-01-01"),
          dataExit: new Date("2024-06-30"),
        },
        {
          fromClub: "Betis",
          buyValue: 0,
          dataArrival: new Date("2024-07-01"),
        },
      ],
    } as unknown as Players;

    render(
      <TransfersPanel
        title="Chegadas"
        players={[boughtAndLoanedPlayer]}
        currency="€"
        onTransferClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Fim do Empréstimo")).toBeDefined();
    expect(screen.queryByText("Custo Zero")).toBeNull();
  });

  it("exibe rótulo 'Fim do Empréstimo' quando player.contract foi filtrado mas fullContractHistory contém o empréstimo", () => {
    cleanup();
    const loanContract = {
      fromClub: "Athletico-PR",
      leftClub: "Betis",
      isLoan: true,
      dataExit: new Date("2024-06-30"),
    };
    const arrivalContract = {
      fromClub: "Betis",
      buyValue: 0,
      dataArrival: new Date("2024-07-01"),
    };

    const playerWithFilteredContract = {
      id: "p-filtered-history",
      name: "Vitor Roque",
      buy: true,
      contract: [arrivalContract],
      fullContractHistory: [loanContract, arrivalContract],
    } as unknown as Players;

    render(
      <TransfersPanel
        title="Chegadas"
        players={[playerWithFilteredContract]}
        currency="€"
        onTransferClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Fim do Empréstimo")).toBeDefined();
    expect(screen.queryByText("Custo Zero")).toBeNull();
  });

  it("exibe rótulo 'Fim do Empréstimo' quando o jogador estava emprestado na temporada anterior no histórico do Career", () => {
    cleanup();
    const arrivalContract = {
      fromClub: "Betis",
      buyValue: 0,
      dataArrival: new Date("2024-07-01"),
    };

    const returningPlayer = {
      id: "p-season-history",
      name: "Vitor Roque",
      buy: false,
      contract: [arrivalContract],
    } as unknown as Players;

    const mockCareer = {
      id: "c-1",
      createdAt: new Date("2023-07-01"),
      nation: "Espanha",
      currency: "€",
      clubData: [
        {
          id: "s-1",
          seasonNumber: 1,
          players: [
            {
              id: "p-season-history",
              name: "Vitor Roque",
              loan: true,
              contract: [
                {
                  leftClub: "Betis",
                  isLoan: true,
                },
              ],
            },
          ],
        },
        {
          id: "s-2",
          seasonNumber: 2,
          players: [returningPlayer],
        },
      ],
    } as unknown as Career;

    render(
      <TransfersPanel
        title="Chegadas"
        players={[returningPlayer]}
        currency="€"
        career={mockCareer}
        season={mockCareer.clubData[1]}
        onTransferClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Fim do Empréstimo")).toBeDefined();
    expect(screen.queryByText("Custo Zero")).toBeNull();
  });

  it("exibe 'Custo Zero' quando empréstimo ocorreu em temporada antiga mas na temporada anterior o jogador já não estava emprestado", () => {
    cleanup();
    const arrivalContract = {
      fromClub: "Santos",
      buyValue: 0,
      dataArrival: new Date("2025-07-01"),
    };

    const arrivingPlayer = {
      id: "p-past-loan",
      name: "Neymar",
      buy: false,
      loan: false,
      contract: [arrivalContract],
    } as unknown as Players;

    const mockCareer = {
      id: "c-1",
      createdAt: new Date("2023-07-01"),
      nation: "Espanha",
      currency: "€",
      clubData: [
        {
          id: "s-1",
          seasonNumber: 1,
          players: [
            {
              id: "p-past-loan",
              name: "Neymar",
              loan: true,
              contract: [{ leftClub: "Santos", isLoan: true }],
            },
          ],
        },
        {
          id: "s-2",
          seasonNumber: 2,
          players: [
            {
              id: "p-past-loan",
              name: "Neymar",
              loan: false,
              contract: [{ leftClub: "", isLoan: false }],
            },
          ],
        },
        {
          id: "s-3",
          seasonNumber: 3,
          players: [arrivingPlayer],
        },
      ],
    } as unknown as Career;

    render(
      <TransfersPanel
        title="Chegadas"
        players={[arrivingPlayer]}
        currency="€"
        career={mockCareer}
        season={mockCareer.clubData[2]}
        onTransferClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Custo Zero")).toBeDefined();
    expect(screen.queryByText("Fim do Empréstimo")).toBeNull();
  });
});

describe("PlayersContractService - Edição e Reversão de Fim de Empréstimo Recebido", () => {
  it("ao editar data de saída de fim de empréstimo recebido, preserva isLoan e não torna o jogador nosso ativo", async () => {
    const incomingPlayer = {
      id: "p-endrick-loan",
      name: "Endrick",
      sell: true,
      loan: false,
      buy: false,
      incomingLoan: false,
      contract: [
        {
          fromClub: "Real Madrid",
          leftClub: "Real Madrid",
          buyValue: 0,
          sellValue: 0,
          isLoan: true,
          dataArrival: new Date("2024-01-01"),
          dataExit: new Date("2024-06-30"),
        },
      ],
    } as Players;

    mockCareer.clubData[0].players.push(incomingPlayer);

    await PlayersContractService.editTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "p-endrick-loan",
      contractIndex: 0,
      direction: "exit",
      transferType: "Fim de Empréstimo",
      clubName: "Real Madrid CF",
      transferValue: "0",
      date: "15/07",
    });

    expect(incomingPlayer.sell).toBe(true);
    expect(incomingPlayer.loan).toBe(false);
    expect(incomingPlayer.incomingLoan).toBe(false);
    expect(incomingPlayer.contract![0].isLoan).toBe(true);
    expect(incomingPlayer.contract![0].leftClub).toBe("Real Madrid CF");
  });

  it("ao reverter saída de fim de empréstimo recebido, restaura incomingLoan: true no jogador", async () => {
    const incomingPlayer = {
      id: "p-endrick-revert",
      name: "Endrick",
      sell: true,
      loan: false,
      buy: false,
      incomingLoan: false,
      contract: [
        {
          fromClub: "Real Madrid",
          leftClub: "Real Madrid",
          buyValue: 0,
          sellValue: 0,
          isLoan: true,
          dataArrival: new Date("2024-01-01"),
          dataExit: new Date("2024-06-30"),
        },
      ],
    } as Players;

    mockCareer.clubData[0].players.push(incomingPlayer);

    await PlayersContractService.revertTransferInSeason({
      careerId: "career-1",
      seasonId: "season-1",
      playerId: "p-endrick-revert",
      contractIndex: 0,
      direction: "exit",
    });

    expect(incomingPlayer.sell).toBe(false);
    expect(incomingPlayer.loan).toBe(false);
    expect(incomingPlayer.incomingLoan).toBe(true);
    expect(incomingPlayer.contract![0].isLoan).toBe(true);
    expect(incomingPlayer.contract![0].leftClub).toBe("");
    expect(incomingPlayer.contract![0].dataExit).toBeNull();
  });
});

describe("scheduleLineupSlotScroll e EmptySlotRow comportamentos de Scroll", () => {
  it("ao adicionar jogador no banco com espaço restante, rola até o botão de adicionar mais jogadores", async () => {
    vi.useFakeTimers();
    const { scheduleLineupSlotScroll } = await import(
      "../pages/Match/components/LineupTab/services/scheduleLineupSlotScroll"
    );

    const scrollIntoViewButtonMock = vi.fn();
    const scrollIntoViewSlotMock = vi.fn();

    const mockBenchSlot = document.createElement("div");
    mockBenchSlot.setAttribute("data-slot-id", "bench-0");
    mockBenchSlot.scrollIntoView = scrollIntoViewSlotMock;

    const mockAddButton = document.createElement("button");
    mockAddButton.setAttribute("data-bench-add-button", "true");
    mockAddButton.scrollIntoView = scrollIntoViewButtonMock;

    document.body.appendChild(mockBenchSlot);
    document.body.appendChild(mockAddButton);

    scheduleLineupSlotScroll("bench-0");
    vi.advanceTimersByTime(160);

    expect(scrollIntoViewButtonMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
    expect(scrollIntoViewSlotMock).not.toHaveBeenCalled();

    document.body.removeChild(mockBenchSlot);
    document.body.removeChild(mockAddButton);
    vi.useRealTimers();
  });

  it("ao adicionar jogador no banco sem mais espaço (banco cheio), rola até o último jogador adicionado", async () => {
    vi.useFakeTimers();
    const { scheduleLineupSlotScroll } = await import(
      "../pages/Match/components/LineupTab/services/scheduleLineupSlotScroll"
    );

    const scrollIntoViewMock = vi.fn();
    const mockBenchSlot = document.createElement("div");
    mockBenchSlot.setAttribute("data-slot-id", "bench-8");
    mockBenchSlot.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(mockBenchSlot);

    scheduleLineupSlotScroll("bench-8");
    vi.advanceTimersByTime(160);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });

    document.body.removeChild(mockBenchSlot);
    vi.useRealTimers();
  });

  it("ao adicionar titular, rola diretamente até a posição em campo", async () => {
    vi.useFakeTimers();
    const { scheduleLineupSlotScroll } = await import(
      "../pages/Match/components/LineupTab/services/scheduleLineupSlotScroll"
    );

    const scrollIntoViewStarterMock = vi.fn();
    const scrollIntoViewButtonMock = vi.fn();

    const mockStarterSlot = document.createElement("div");
    mockStarterSlot.setAttribute("data-slot-id", "slot-mid-0");
    mockStarterSlot.scrollIntoView = scrollIntoViewStarterMock;

    const mockAddButton = document.createElement("button");
    mockAddButton.setAttribute("data-bench-add-button", "true");
    mockAddButton.scrollIntoView = scrollIntoViewButtonMock;

    document.body.appendChild(mockStarterSlot);
    document.body.appendChild(mockAddButton);

    scheduleLineupSlotScroll("slot-mid-0");
    vi.advanceTimersByTime(160);

    expect(scrollIntoViewStarterMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
    expect(scrollIntoViewButtonMock).not.toHaveBeenCalled();

    document.body.removeChild(mockStarterSlot);
    document.body.removeChild(mockAddButton);
    vi.useRealTimers();
  });

  it("EmptySlotRow renderiza sem disparar scrollIntoView de forma invasiva na montagem/atualização", async () => {
    cleanup();
    const { EmptySlotRow } = await import(
      "../pages/Match/components/LineupTab/layouts/Bottom/components/EmptySlotRow"
    );

    const scrollIntoViewSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    const { rerender } = render(
      <EmptySlotRow slotId="bench-0" isActive={false} onSelect={vi.fn()} />,
    );

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    rerender(
      <EmptySlotRow slotId="bench-1" isActive={false} onSelect={vi.fn()} />,
    );

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });
});

describe("Impedir edição de transferências na tela Geral", () => {
  it("TransfersPanel não permite clique de edição quando onTransferClick não é fornecido (ex: tela Geral)", () => {
    cleanup();
    const player = {
      id: "p-geral-player",
      name: "Rodrygo",
      contract: [
        {
          fromClub: "Santos",
          buyValue: 45000000,
          dataArrival: new Date("2024-07-01"),
        },
      ],
    } as unknown as Players;

    render(
      <TransfersPanel
        title="Chegadas"
        players={[player]}
        currency="€"
      />,
    );

    const playerNameEl = screen.getByText("Rodrygo");
    const itemEl = playerNameEl.closest("li");
    expect(itemEl).toBeDefined();
    expect(itemEl?.style.cursor).toBe("default");

    // Clicking should not error or attempt to call undefined callback
    fireEvent.click(itemEl!);
  });

  it("TransfersPanel permite clique de edição quando onTransferClick é fornecido (ex: tela Season)", () => {
    cleanup();
    const player = {
      id: "p-season-player",
      name: "Rodrygo",
      contract: [
        {
          fromClub: "Santos",
          buyValue: 45000000,
          dataArrival: new Date("2024-07-01"),
        },
      ],
    } as unknown as Players;

    const onTransferClickMock = vi.fn();

    render(
      <TransfersPanel
        title="Chegadas"
        players={[player]}
        currency="€"
        onTransferClick={onTransferClickMock}
      />,
    );

    const playerNameEl = screen.getByText("Rodrygo");
    const itemEl = playerNameEl.closest("li");
    expect(itemEl).toBeDefined();
    expect(itemEl?.style.cursor).toBe("pointer");

    fireEvent.click(itemEl!);
    expect(onTransferClickMock).toHaveBeenCalledTimes(1);
    expect(onTransferClickMock).toHaveBeenCalledWith(
      expect.objectContaining({ player, contractIndex: 0 }),
      "arrivals",
    );
  });
});


