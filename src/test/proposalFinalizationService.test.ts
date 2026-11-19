import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProposalFinalizationService,
  ProposalAlreadyFinalizedError,
  PlayerIneligibleError,
} from "../common/services/ServiceProposals/proposalFinalizationService";
import { auth } from "./mocks/firebaseClient";
import {
  getDoc,
  getDocs,
  updateDoc,
  documentSnapshot,
  querySnapshot,
} from "./mocks/firestore";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";

vi.mock("../common/services/ServicePlayers/PlayersContractService", () => ({
  PlayersContractService: {
    signPlayerWithTerms: vi.fn().mockResolvedValue({}),
    sellPlayerFromSeason: vi.fn().mockResolvedValue(undefined),
    loanPlayerFromSeason: vi.fn().mockResolvedValue(undefined),
    createPlayerRenewal: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("ProposalFinalizationService (Unit Tests - Padrão FC Barcelona)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateDoc.mockResolvedValue(undefined);
    auth.currentUser = { uid: "test-user" };
  });

  const basePedriProposal: TransferProposal = {
    id: "prop_pedri_1",
    careerId: "c_barca",
    seasonId: "s1",
    type: "venda",
    overallStatus: "aguardando_confirmacao",
    playerId: "player_pedri_8",
    playerName: "Pedri",
    playerNation: "Espanha",
    playerPosition: "MC",
    playerSector: "Meio-Campo",
    playerOverall: 89,
    playerAge: 23,
    timing: "Imediata",
    clubNegotiation: {
      partnerClub: "Paris Saint-Germain",
      transferFee: 120000000,
      status: "aceita",
    },
    playerNegotiation: {
      weeklyWage: 300000,
      durationYears: 5,
      squadRole: "Crucial",
      status: "aceita",
    },
    createdAt: 1000,
    updatedAt: 1000,
  };

  it("aborta e lança erro se usuário não estiver autenticado", async () => {
    auth.currentUser = null;
    await expect(
      ProposalFinalizationService.finalizeProposal({
        careerId: "c_barca",
        seasonId: "s1",
        proposalId: "prop_pedri_1",
      }),
    ).rejects.toThrow("Usuário não autenticado");
  });

  it("lança ProposalAlreadyFinalizedError se proposta já foi concluída anteriormente", async () => {
    const finalizedProposal: TransferProposal = {
      ...basePedriProposal,
      overallStatus: "concluida",
      finalizedAt: 2000,
    };

    getDoc.mockResolvedValueOnce(
      documentSnapshot(finalizedProposal.id, finalizedProposal, true),
    );

    await expect(
      ProposalFinalizationService.finalizeProposal({
        careerId: "c_barca",
        seasonId: "s1",
        proposalId: finalizedProposal.id,
      }),
    ).rejects.toThrow(ProposalAlreadyFinalizedError);
  });

  it("lança erro se proposta estiver com status rejeitada ou cancelada", async () => {
    const rejectedProposal: TransferProposal = {
      ...basePedriProposal,
      overallStatus: "rejeitada",
    };

    getDoc.mockResolvedValueOnce(
      documentSnapshot(rejectedProposal.id, rejectedProposal, true),
    );

    await expect(
      ProposalFinalizationService.finalizeProposal({
        careerId: "c_barca",
        seasonId: "s1",
        proposalId: rejectedProposal.id,
      }),
    ).rejects.toThrow("Não é possível finalizar uma proposta com status 'rejeitada'");
  });

  it("lança PlayerIneligibleError se atleta de venda já foi vendido (sell: true)", async () => {
    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(basePedriProposal.id, basePedriProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_pedri_8",
          { id: "player_pedri_8", name: "Pedri", sell: true },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await expect(
      ProposalFinalizationService.finalizeProposal({
        careerId: "c_barca",
        seasonId: "s1",
        proposalId: basePedriProposal.id,
      }),
    ).rejects.toThrow(PlayerIneligibleError);
  });

  it("finaliza venda de atleta com sucesso, chama updateDoc diretamente e delega para sellPlayerFromSeason", async () => {
    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(basePedriProposal.id, basePedriProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_pedri_8",
          { id: "player_pedri_8", name: "Pedri", sell: false },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s1",
      proposalId: basePedriProposal.id,
      agreementDate: "15/08/2026",
    });

    expect(PlayersContractService.sellPlayerFromSeason).toHaveBeenCalledWith(
      "c_barca",
      "s1",
      "player_pedri_8",
      "120000000",
      "Paris Saint-Germain",
      "15/08/2026",
      expect.any(Object),
    );

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("proposals/prop_pedri_1"),
      }),
      expect.objectContaining({
        overallStatus: "concluida",
        agreementDate: "15/08/2026",
      }),
    );
  });

  it("finaliza venda de atleta com atleta de troca e repassa swapPlayerNegotiation para sellPlayerFromSeason", async () => {
    const saleWithSwapProposal: TransferProposal = {
      ...basePedriProposal,
      id: "prop_pedri_swap",
      clubNegotiation: {
        partnerClub: "Paris Saint-Germain",
        transferFee: 100000000,
        status: "aceita",
        swapPlayer: {
          playerName: "Warren Zaïre-Emery",
          position: "MC",
          overall: 82,
          age: 20,
          incomingSwap: true,
        },
      },
      playerNegotiation: {
        weeklyWage: 120000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "aceita",
      },
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(saleWithSwapProposal.id, saleWithSwapProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_pedri_8",
          { id: "player_pedri_8", name: "Pedri", sell: false },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s1",
      proposalId: saleWithSwapProposal.id,
      agreementDate: "20/08/2026",
    });

    expect(PlayersContractService.sellPlayerFromSeason).toHaveBeenCalledWith(
      "c_barca",
      "s1",
      "player_pedri_8",
      "100000000",
      "Paris Saint-Germain",
      "20/08/2026",
      expect.objectContaining({
        swapPlayer: expect.objectContaining({
          playerName: "Warren Zaïre-Emery",
        }),
        swapPlayerNegotiation: expect.objectContaining({
          weeklyWage: 120000,
          durationYears: 5,
          squadRole: "Crucial",
        }),
      }),
    );
  });

  it("finaliza compra de atleta, chama signPlayerWithTerms e cancela propostas concorrentes", async () => {
    const buyProposal: TransferProposal = {
      id: "prop_yamal_buy_1",
      careerId: "c_barca",
      seasonId: "s1",
      type: "compra",
      overallStatus: "aguardando_confirmacao",
      playerId: "player_yamal_19",
      playerName: "Lamine Yamal",
      playerNation: "Espanha",
      playerPosition: "ED",
      playerSector: "Ataque",
      playerOverall: 84,
      playerAge: 19,
      clubNegotiation: {
        partnerClub: "La Masia",
        transferFee: 0,
        status: "aceita",
      },
      playerNegotiation: {
        weeklyWage: 150000,
        durationYears: 6,
        squadRole: "Crucial",
        status: "aceita",
      },
      createdAt: 1000,
      updatedAt: 1000,
    };

    const competingProposal: TransferProposal = {
      ...buyProposal,
      id: "prop_yamal_competing_2",
      clubNegotiation: {
        partnerClub: "Arsenal",
        transferFee: 50000000,
        status: "em_negociacao",
      },
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(buyProposal.id, buyProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot("player_yamal_19", {}, false),
      );
    getDocs.mockResolvedValueOnce(
      querySnapshot([
        { id: buyProposal.id, data: buyProposal },
        { id: competingProposal.id, data: competingProposal },
      ]),
    );

    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s1",
      proposalId: buyProposal.id,
      agreementDate: "01/07/2026",
    });

    expect(PlayersContractService.signPlayerWithTerms).toHaveBeenCalledWith(
      expect.objectContaining({
        careerId: "c_barca",
        seasonId: "s1",
        player: expect.objectContaining({
          name: "Lamine Yamal",
          overall: 84,
        }),
      }),
    );

    // Verifica que a proposta alvo virou "concluida"
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("prop_yamal_buy_1"),
      }),
      expect.objectContaining({
        overallStatus: "concluida",
      }),
    );

    // Verifica que a proposta concorrente virou "cancelada"
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("prop_yamal_competing_2"),
      }),
      expect.objectContaining({
        overallStatus: "cancelada",
        cancelReason: "Atleta negociado em outra proposta",
      }),
    );
  });

  it("finaliza renovação contratual e delega para createPlayerRenewal", async () => {
    const renewProposal: TransferProposal = {
      id: "prop_gavi_renew",
      careerId: "c_barca",
      seasonId: "s1",
      type: "renovacao",
      overallStatus: "aguardando_confirmacao",
      playerId: "player_gavi_6",
      playerName: "Gavi",
      playerNation: "Espanha",
      playerPosition: "MC",
      playerSector: "Meio-Campo",
      playerOverall: 88,
      playerAge: 22,
      playerNegotiation: {
        weeklyWage: 220000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "aceita",
      },
      createdAt: 1000,
      updatedAt: 1000,
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(renewProposal.id, renewProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_gavi_6",
          { id: "player_gavi_6", name: "Gavi", sell: false },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s1",
      proposalId: renewProposal.id,
    });

    expect(PlayersContractService.createPlayerRenewal).toHaveBeenCalledWith(
      expect.objectContaining({
        careerId: "c_barca",
        seasonId: "s1",
        playerId: "player_gavi_6",
        salary: "220000",
        contractTime: 5,
      }),
    );

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("prop_gavi_renew"),
      }),
      expect.objectContaining({
        overallStatus: "concluida",
      }),
    );
  });

  it("finaliza compra com atleta de troca e repassa swapPlayer para signPlayerWithTerms", async () => {
    const buyWithSwapProposal: TransferProposal = {
      id: "prop_olmo_swap",
      careerId: "c_barca",
      seasonId: "s1",
      type: "compra",
      overallStatus: "aguardando_confirmacao",
      playerId: "player_olmo_20",
      playerName: "Dani Olmo",
      playerNation: "Espanha",
      playerPosition: "MEI",
      playerSector: "Meio-Campo",
      playerOverall: 84,
      playerAge: 26,
      clubNegotiation: {
        partnerClub: "RB Leipzig",
        transferFee: 40000000,
        status: "aceita",
        swapPlayer: {
          playerId: "player_ferran_7",
          playerName: "Ferran Torres",
          playerValue: 25000000,
        },
      },
      playerNegotiation: {
        weeklyWage: 180000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "aceita",
      },
      createdAt: 1000,
      updatedAt: 1000,
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(buyWithSwapProposal.id, buyWithSwapProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot("player_olmo_20", {}, false),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_ferran_7",
          { id: "player_ferran_7", name: "Ferran Torres", sell: false },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s1",
      proposalId: buyWithSwapProposal.id,
      agreementDate: "10/08/2026",
    });

    expect(PlayersContractService.signPlayerWithTerms).toHaveBeenCalledWith(
      expect.objectContaining({
        careerId: "c_barca",
        seasonId: "s1",
        player: expect.objectContaining({
          name: "Dani Olmo",
        }),
        swapPlayer: expect.objectContaining({
          playerId: "player_ferran_7",
          playerName: "Ferran Torres",
        }),
      }),
    );

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("prop_olmo_swap"),
      }),
      expect.objectContaining({
        overallStatus: "concluida",
      }),
    );
  });

  it("finaliza compra proveniente de opção de compra de empréstimo (originLoanBuyOption: true) para atleta que pertence ao elenco em empréstimo", async () => {
    const loanBuyOptionProposal: TransferProposal = {
      id: "prop_pau_victor_buy",
      careerId: "c_barca",
      seasonId: "s1",
      type: "compra",
      overallStatus: "aguardando_confirmacao",
      originLoanBuyOption: true,
      playerId: "player_pau_victor_18",
      playerName: "Pau Víctor",
      playerNation: "ESP",
      playerPosition: "ATA",
      playerSector: "Ataque",
      playerOverall: 78,
      playerAge: 23,
      timing: "Imediata",
      clubNegotiation: {
        partnerClub: "Girona FC",
        transferFee: 3000000,
        status: "aceita",
      },
      playerNegotiation: {
        weeklyWage: 60000,
        durationYears: 4,
        squadRole: "Rodízio",
        status: "aceita",
      },
      createdAt: 1000,
      updatedAt: 1000,
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(loanBuyOptionProposal.id, loanBuyOptionProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_pau_victor_18",
          {
            id: "player_pau_victor_18",
            name: "Pau Víctor",
            sell: false,
            incomingLoan: false, // simula campo não preenchido ou false
            contract: [
              {
                isLoan: true,
                fromClub: "Girona FC",
                buyOptionValue: 3000000,
                loanTerms: {
                  hasBuyOption: true,
                  buyOptionFee: 3000000,
                },
              },
            ],
          },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s1",
      proposalId: loanBuyOptionProposal.id,
      agreementDate: "15/07/2026",
    });

    expect(PlayersContractService.signPlayerWithTerms).toHaveBeenCalledWith(
      expect.objectContaining({
        careerId: "c_barca",
        seasonId: "s1",
        player: expect.objectContaining({
          id: "player_pau_victor_18",
          name: "Pau Víctor",
        }),
        contract: expect.objectContaining({
          fromLoanBuyOption: true,
          buyOptionFinalized: true,
          buyValue: 3000000,
        }),
      }),
    );

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("prop_pau_victor_buy"),
      }),
      expect.objectContaining({
        overallStatus: "concluida",
      }),
    );
  });

  it("lança PlayerIneligibleError se a opção de compra do atleta já tiver sido finalizada anteriormente", async () => {
    const loanBuyOptionProposal: TransferProposal = {
      id: "prop_pau_victor_buy_duplicate",
      careerId: "c_barca",
      seasonId: "s1",
      type: "compra",
      overallStatus: "aguardando_confirmacao",
      originLoanBuyOption: true,
      playerId: "player_pau_victor_18",
      playerName: "Pau Víctor",
      playerNation: "ESP",
      playerPosition: "ATA",
      playerSector: "Ataque",
      timing: "Imediata",
      clubNegotiation: {
        partnerClub: "Girona FC",
        transferFee: 3000000,
        status: "aceita",
      },
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(loanBuyOptionProposal.id, loanBuyOptionProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_pau_victor_18",
          {
            id: "player_pau_victor_18",
            name: "Pau Víctor",
            sell: false,
            contract: [
              {
                isLoan: true,
                fromClub: "Girona FC",
              },
              {
                isLoan: false,
                fromLoanBuyOption: true,
                buyValue: 3000000,
              },
            ],
          },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await expect(
      ProposalFinalizationService.finalizeProposal({
        careerId: "c_barca",
        seasonId: "s1",
        proposalId: loanBuyOptionProposal.id,
      }),
    ).rejects.toThrow("Operação cancelada: a opção de compra deste atleta já foi finalizada.");
  });

  it("lança PlayerIneligibleError se tentar finalizar proposta de opção de compra para atleta sem opção definida no empréstimo", async () => {
    const invalidLoanBuyOptionProposal: TransferProposal = {
      id: "prop_pau_victor_no_option",
      careerId: "c_barca",
      seasonId: "s1",
      type: "compra",
      overallStatus: "aguardando_confirmacao",
      originLoanBuyOption: true,
      playerId: "player_pau_victor_18",
      playerName: "Pau Víctor",
      playerNation: "ESP",
      playerPosition: "ATA",
      playerSector: "Ataque",
      timing: "Imediata",
      clubNegotiation: {
        partnerClub: "Girona FC",
        transferFee: 0,
        status: "aceita",
      },
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(
          invalidLoanBuyOptionProposal.id,
          invalidLoanBuyOptionProposal,
          true,
        ),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_pau_victor_18",
          {
            id: "player_pau_victor_18",
            name: "Pau Víctor",
            sell: false,
            incomingLoan: true,
            contract: [
              {
                isLoan: true,
                fromClub: "Girona FC",
                loanTerms: {
                  durationYears: 1,
                  hasBuyOption: false,
                  partnerClub: "Girona FC",
                },
              },
            ],
          },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await expect(
      ProposalFinalizationService.finalizeProposal({
        careerId: "c_barca",
        seasonId: "s1",
        proposalId: invalidLoanBuyOptionProposal.id,
      }),
    ).rejects.toThrow(
      "Operação cancelada: este atleta não possui opção de compra definida no contrato de empréstimo.",
    );
  });

  it("permite finalizar compra de opção de compra (originLoanBuyOption: true) mesmo após encerramento do empréstimo de chegada (sell: true, incomingLoan: false)", async () => {
    const endedLoanBuyProposal: TransferProposal = {
      id: "prop_cancelo_ended_loan_buy",
      careerId: "c_barca",
      seasonId: "s1",
      type: "compra",
      overallStatus: "aguardando_confirmacao",
      originLoanBuyOption: true,
      playerId: "player_cancelo_2",
      playerName: "João Cancelo",
      playerNation: "POR",
      playerPosition: "LD",
      playerSector: "Defesa",
      playerOverall: 86,
      playerAge: 30,
      timing: "Imediata",
      clubNegotiation: {
        partnerClub: "Manchester City",
        transferFee: 25_000_000,
        status: "aceita",
      },
      playerNegotiation: {
        weeklyWage: 120_000,
        durationYears: 3,
        squadRole: "Importante",
        status: "aceita",
      },
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(endedLoanBuyProposal.id, endedLoanBuyProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_cancelo_2",
          {
            id: "player_cancelo_2",
            name: "João Cancelo",
            sell: true,
            incomingLoan: false,
            loan: false,
            contract: [
              {
                isLoan: true,
                fromClub: "Manchester City",
                leftClub: "Manchester City",
                buyValue: 0,
                sellValue: 0,
                buyOptionValue: 25_000_000,
                dataArrival: new Date("2026-07-15"),
                dataExit: new Date("2027-06-30"),
                loanTerms: {
                  durationYears: 1,
                  hasBuyOption: true,
                  buyOptionFee: 25_000_000,
                  partnerClub: "Manchester City",
                },
              },
            ],
          },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s1",
      proposalId: endedLoanBuyProposal.id,
      agreementDate: "01/07/2027",
    });

    expect(PlayersContractService.signPlayerWithTerms).toHaveBeenCalledWith(
      expect.objectContaining({
        careerId: "c_barca",
        seasonId: "s1",
        player: expect.objectContaining({
          id: "player_cancelo_2",
          name: "João Cancelo",
        }),
        contract: expect.objectContaining({
          fromLoanBuyOption: true,
          buyOptionFinalized: true,
          buyValue: 25_000_000,
        }),
      }),
    );
  });

  it("lança PlayerIneligibleError ao tentar compra normal de atleta definitivo que já pertence ao elenco", async () => {
    const regularBuyProposal: TransferProposal = {
      id: "prop_gavi_buy",
      careerId: "c_barca",
      seasonId: "s1",
      type: "compra",
      overallStatus: "aguardando_confirmacao",
      playerId: "player_gavi_6",
      playerName: "Gavi",
      playerNation: "ESP",
      playerPosition: "MC",
      playerSector: "Meio-Campo",
      timing: "Imediata",
      clubNegotiation: {
        partnerClub: "Real Betis",
        transferFee: 50000000,
        status: "aceita",
      },
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(regularBuyProposal.id, regularBuyProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_gavi_6",
          {
            id: "player_gavi_6",
            name: "Gavi",
            sell: false,
            incomingLoan: false,
            contract: [{ isLoan: false }],
          },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await expect(
      ProposalFinalizationService.finalizeProposal({
        careerId: "c_barca",
        seasonId: "s1",
        proposalId: regularBuyProposal.id,
      }),
    ).rejects.toThrow("Operação cancelada: o atleta já pertence ao elenco nesta temporada.");
  });

  it("permite compra normal de atleta que está no elenco em regime de empréstimo (isLoan: true no contrato)", async () => {
    const loaneeBuyProposal: TransferProposal = {
      id: "prop_cancelo_buy",
      careerId: "c_barca",
      seasonId: "s1",
      type: "compra",
      overallStatus: "aguardando_confirmacao",
      playerId: "player_cancelo_2",
      playerName: "João Cancelo",
      playerNation: "PRT",
      playerPosition: "LD",
      playerSector: "Defesa",
      timing: "Imediata",
      clubNegotiation: {
        partnerClub: "Manchester City",
        transferFee: 25000000,
        status: "aceita",
      },
      playerNegotiation: {
        weeklyWage: 120000,
        durationYears: 3,
        status: "aceita",
      },
    };

    getDoc
      .mockResolvedValueOnce(
        documentSnapshot(loaneeBuyProposal.id, loaneeBuyProposal, true),
      )
      .mockResolvedValueOnce(
        documentSnapshot(
          "player_cancelo_2",
          {
            id: "player_cancelo_2",
            name: "João Cancelo",
            sell: false,
            incomingLoan: false, // Mesmo com incomingLoan: false, o contrato é de empréstimo
            contract: [{ isLoan: true, fromClub: "Manchester City" }],
          },
          true,
        ),
      );
    getDocs.mockResolvedValueOnce(querySnapshot([]));

    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s1",
      proposalId: loaneeBuyProposal.id,
    });

    expect(PlayersContractService.signPlayerWithTerms).toHaveBeenCalledWith(
      expect.objectContaining({
        careerId: "c_barca",
        seasonId: "s1",
        player: expect.objectContaining({
          id: "player_cancelo_2",
          name: "João Cancelo",
        }),
      }),
    );
  });
});
