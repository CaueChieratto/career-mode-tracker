import { describe, expect, it } from "vitest";
import {
  calculateOverallProposalStatus,
  validateProposalStageRules,
  generateProposalId,
  applyCounterOffer,
} from "../common/helpers/proposals/proposalStatusHelper";
import {
  ClubNegotiationStage,
  PlayerNegotiationStage,
  TransferProposal,
} from "../common/interfaces/proposals/transferProposal";

describe("Motor de Estados e Validação de Propostas (Padrão FC Barcelona)", () => {
  const baseBarcelonaPlayer = {
    playerId: "player_pedri_8",
    playerName: "Pedri",
    playerNation: "Espanha",
    playerPosition: "MC",
    playerSector: "Meio-Campo",
    playerOverall: 89,
    playerAge: 23,
    careerId: "career_barca_01",
    seasonId: "season_2026_2027",
  };

  describe("Cálculo de OverallProposalStatus para Compra e Empréstimo de Entrada", () => {
    it("mantém em_andamento se clube aceita mas jogador ainda está em negociação", () => {
      const clubStage: ClubNegotiationStage = {
        partnerClub: "Las Palmas",
        transferFee: 60000000,
        status: "aceita",
      };
      const playerStage: PlayerNegotiationStage = {
        weeklyWage: 200000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "em_negociacao",
      };

      const status = calculateOverallProposalStatus({
        type: "compra",
        clubNegotiation: clubStage,
        playerNegotiation: playerStage,
      });

      expect(status).toBe("em_andamento");
    });

    it("mantém em_andamento se jogador aceita mas clube ainda está em negociação", () => {
      const clubStage: ClubNegotiationStage = {
        partnerClub: "Las Palmas",
        transferFee: 60000000,
        status: "em_negociacao",
      };
      const playerStage: PlayerNegotiationStage = {
        weeklyWage: 200000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "aceita",
      };

      const status = calculateOverallProposalStatus({
        type: "compra",
        clubNegotiation: clubStage,
        playerNegotiation: playerStage,
      });

      expect(status).toBe("em_andamento");
    });

    it("transiciona para aguardando_confirmacao se clube E jogador aceitam (compra)", () => {
      const clubStage: ClubNegotiationStage = {
        partnerClub: "Las Palmas",
        transferFee: 60000000,
        status: "aceita",
      };
      const playerStage: PlayerNegotiationStage = {
        weeklyWage: 200000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "aceita",
      };

      const status = calculateOverallProposalStatus({
        type: "compra",
        clubNegotiation: clubStage,
        playerNegotiation: playerStage,
      });

      expect(status).toBe("aguardando_confirmacao");
    });

    it("transiciona para aguardando_confirmacao se clube E jogador aceitam (emprestimo_entrada)", () => {
      const clubStage: ClubNegotiationStage = {
        partnerClub: "Bayern München",
        status: "aceita",
      };
      const playerStage: PlayerNegotiationStage = {
        weeklyWage: 150000,
        durationYears: 1,
        squadRole: "Importante",
        status: "aceita",
      };

      const status = calculateOverallProposalStatus({
        type: "emprestimo_entrada",
        clubNegotiation: clubStage,
        playerNegotiation: playerStage,
      });

      expect(status).toBe("aguardando_confirmacao");
    });

    it("transiciona para rejeitada se qualquer uma das etapas for rejeitada", () => {
      expect(
        calculateOverallProposalStatus({
          type: "compra",
          clubNegotiation: { partnerClub: "Las Palmas", status: "rejeitada" },
          playerNegotiation: {
            weeklyWage: 100000,
            durationYears: 3,
            squadRole: "Crucial",
            status: "aceita",
          },
        }),
      ).toBe("rejeitada");

      expect(
        calculateOverallProposalStatus({
          type: "compra",
          clubNegotiation: { partnerClub: "Las Palmas", status: "aceita" },
          playerNegotiation: {
            weeklyWage: 100000,
            durationYears: 3,
            squadRole: "Crucial",
            status: "rejeitada",
          },
        }),
      ).toBe("rejeitada");
    });

    it("transiciona para cancelada se qualquer uma das etapas for cancelada", () => {
      expect(
        calculateOverallProposalStatus({
          type: "compra",
          clubNegotiation: { partnerClub: "Las Palmas", status: "cancelada" },
          playerNegotiation: {
            weeklyWage: 100000,
            durationYears: 3,
            squadRole: "Crucial",
            status: "aceita",
          },
        }),
      ).toBe("cancelada");

      expect(
        calculateOverallProposalStatus({
          type: "compra",
          clubNegotiation: { partnerClub: "Las Palmas", status: "aceita" },
          playerNegotiation: {
            weeklyWage: 100000,
            durationYears: 3,
            squadRole: "Crucial",
            status: "cancelada",
          },
        }),
      ).toBe("cancelada");
    });
  });

  describe("Cálculo de OverallProposalStatus para Venda e Empréstimo de Saída", () => {
    it("transiciona para aguardando_confirmacao quando clube aceita proposta de venda", () => {
      const status = calculateOverallProposalStatus({
        type: "venda",
        clubNegotiation: {
          partnerClub: "Paris Saint-Germain",
          transferFee: 120000000,
          status: "aceita",
        },
      });
      expect(status).toBe("aguardando_confirmacao");
    });

    it("transiciona para aguardando_confirmacao quando clube aceita proposta de empréstimo de saída", () => {
      const status = calculateOverallProposalStatus({
        type: "emprestimo_saida",
        clubNegotiation: {
          partnerClub: "Girona",
          status: "aceita",
        },
      });
      expect(status).toBe("aguardando_confirmacao");
    });

    it("retorna em_andamento se clube de destino está em negociação", () => {
      expect(
        calculateOverallProposalStatus({
          type: "venda",
          clubNegotiation: {
            partnerClub: "Arsenal",
            transferFee: 90000000,
            status: "em_negociacao",
          },
        }),
      ).toBe("em_andamento");
    });

    it("retorna rejeitada se clube de destino rejeitou os termos", () => {
      expect(
        calculateOverallProposalStatus({
          type: "venda",
          clubNegotiation: {
            partnerClub: "Arsenal",
            status: "rejeitada",
          },
        }),
      ).toBe("rejeitada");
    });

    it("retorna cancelada se negociação de venda for cancelada", () => {
      expect(
        calculateOverallProposalStatus({
          type: "venda",
          clubNegotiation: {
            partnerClub: "Arsenal",
            status: "cancelada",
          },
        }),
      ).toBe("cancelada");
    });
  });

  describe("Cálculo de OverallProposalStatus para Renovação Contratual", () => {
    it("transiciona para aguardando_confirmacao quando jogador aceita renovação", () => {
      const status = calculateOverallProposalStatus({
        type: "renovacao",
        playerNegotiation: {
          weeklyWage: 250000,
          durationYears: 5,
          squadRole: "Crucial",
          status: "aceita",
        },
      });
      expect(status).toBe("aguardando_confirmacao");
    });

    it("retorna em_andamento enquanto jogador estiver avaliando", () => {
      const status = calculateOverallProposalStatus({
        type: "renovacao",
        playerNegotiation: {
          weeklyWage: 250000,
          durationYears: 5,
          squadRole: "Crucial",
          status: "em_negociacao",
        },
      });
      expect(status).toBe("em_andamento");
    });

    it("retorna rejeitada quando jogador rejeita termos de renovação", () => {
      const status = calculateOverallProposalStatus({
        type: "renovacao",
        playerNegotiation: {
          weeklyWage: 250000,
          durationYears: 5,
          squadRole: "Crucial",
          status: "rejeitada",
        },
      });
      expect(status).toBe("rejeitada");
    });

    it("retorna cancelada quando renovação for cancelada", () => {
      const status = calculateOverallProposalStatus({
        type: "renovacao",
        playerNegotiation: {
          weeklyWage: 250000,
          durationYears: 5,
          squadRole: "Crucial",
          status: "cancelada",
        },
      });
      expect(status).toBe("cancelada");
    });
  });

  describe("Regras Estritas de Etapas e Veto ao agentFee em Renovações", () => {
    it("lança erro se renovação contiver agentFee > 0", () => {
      expect(() =>
        validateProposalStageRules({
          type: "renovacao",
          playerNegotiation: {
            weeklyWage: 180000,
            durationYears: 4,
            squadRole: "Crucial",
            status: "em_negociacao",
            agentFee: 500000, // PROIBIDO
          },
        }),
      ).toThrow("Taxa de agência é proibida em propostas de renovação");
    });

    it("permite renovação com luvas (signingBonus) sem agentFee", () => {
      expect(() =>
        validateProposalStageRules({
          type: "renovacao",
          playerNegotiation: {
            weeklyWage: 180000,
            durationYears: 4,
            squadRole: "Crucial",
            status: "em_negociacao",
            signingBonus: 2000000,
          },
        }),
      ).not.toThrow();
    });

    it("lança erro se proposta de renovação incluir etapa de clube", () => {
      expect(() =>
        validateProposalStageRules({
          type: "renovacao",
          clubNegotiation: {
            partnerClub: "Qualquer",
            status: "aceita",
          },
          playerNegotiation: {
            weeklyWage: 180000,
            durationYears: 4,
            squadRole: "Crucial",
            status: "em_negociacao",
          },
        }),
      ).toThrow("Negociação com o clube não é aplicável a propostas de renovação");
    });

    it("lança erro se proposta de venda contiver etapa com jogador", () => {
      expect(() =>
        validateProposalStageRules({
          type: "venda",
          clubNegotiation: {
            partnerClub: "Chelsea",
            status: "aceita",
          },
          playerNegotiation: {
            weeklyWage: 180000,
            durationYears: 4,
            squadRole: "Crucial",
            status: "aceita",
          },
        }),
      ).toThrow(
        "Negociação com o atleta não é aplicável a propostas de venda ou empréstimo de saída",
      );
    });

    it("lança erro se proposta de empréstimo de saída contiver etapa com jogador", () => {
      expect(() =>
        validateProposalStageRules({
          type: "emprestimo_saida",
          clubNegotiation: {
            partnerClub: "Real Betis",
            status: "aceita",
          },
          playerNegotiation: {
            weeklyWage: 50000,
            durationYears: 1,
            squadRole: "Rodízio",
            status: "aceita",
          },
        }),
      ).toThrow(
        "Negociação com o atleta não é aplicável a propostas de venda ou empréstimo de saída",
      );
    });
  });

  describe("Contrapropostas In-Place e Não Duplicação de Histórico", () => {
    it("sobrescreve valor de compra no clube, redefine etapa para em_negociacao e atualiza status geral", () => {
      const initialProposal: TransferProposal = {
        id: "prop_pedri_initial",
        ...baseBarcelonaPlayer,
        type: "compra",
        overallStatus: "aguardando_confirmacao",
        clubNegotiation: {
          partnerClub: "Las Palmas",
          transferFee: 50000000,
          status: "aceita",
          sellOnPercentage: 10,
        },
        playerNegotiation: {
          weeklyWage: 200000,
          durationYears: 5,
          squadRole: "Crucial",
          status: "aceita",
        },
      };

      // Clube parceiro faz contraproposta pedindo 65M e 15% de mais-valia
      const counterProposal = applyCounterOffer(initialProposal, "club", {
        transferFee: 65000000,
        sellOnPercentage: 15,
      });

      // Validações in-place
      expect(counterProposal.clubNegotiation?.transferFee).toBe(65000000);
      expect(counterProposal.clubNegotiation?.sellOnPercentage).toBe(15);
      expect(counterProposal.clubNegotiation?.status).toBe("em_negociacao");
      // Etapa do jogador permanece aceita
      expect(counterProposal.playerNegotiation?.status).toBe("aceita");
      // Status geral retrocede de aguardando_confirmacao para em_andamento
      expect(counterProposal.overallStatus).toBe("em_andamento");
      expect(counterProposal.updatedAt).toBeDefined();
    });

    it("sobrescreve salário e luvas em contraproposta do atleta, redefinindo status geral", () => {
      const initialProposal: TransferProposal = {
        id: "prop_yamal_initial",
        playerId: "player_lamine_yamal",
        playerName: "Lamine Yamal",
        playerNation: "Espanha",
        playerPosition: "ED",
        playerSector: "Ataque",
        playerOverall: 84,
        playerAge: 19,
        careerId: "career_barca_01",
        seasonId: "season_2026_2027",
        type: "renovacao",
        overallStatus: "aguardando_confirmacao",
        playerNegotiation: {
          weeklyWage: 150000,
          durationYears: 5,
          squadRole: "Crucial",
          signingBonus: 2000000,
          status: "aceita",
        },
      };

      // Lamine Yamal pede 200k semanais e 3.5M em luvas
      const counterProposal = applyCounterOffer(initialProposal, "player", {
        weeklyWage: 200000,
        signingBonus: 3500000,
      });

      expect(counterProposal.playerNegotiation?.weeklyWage).toBe(200000);
      expect(counterProposal.playerNegotiation?.signingBonus).toBe(3500000);
      expect(counterProposal.playerNegotiation?.status).toBe("em_negociacao");
      expect(counterProposal.overallStatus).toBe("em_andamento");
    });
  });

  describe("Geração Segura de Identificador", () => {
    it("gera ID iniciando com prop_ e tamanho apropriado", () => {
      const id1 = generateProposalId();
      const id2 = generateProposalId();

      expect(id1).toMatch(/^prop_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^prop_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});

