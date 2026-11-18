// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  createTransferInstallments,
  validateLoanTerms,
  validateSellOnPercentage,
  LoanTerms,
} from "../common/interfaces/playersInfo/transferTerms";

import {
  validateContractDetails,
  ContractDetails,
  SQUAD_ROLES,
} from "../common/interfaces/playersInfo/contractClauses";
import {
  buildTransferCopyText,
} from "../components/TransfersModal/components/TransfersPanel/utils/buildTransferCopyText";
import {
  getTransferBadges,
} from "../components/TransfersModal/components/TransfersPanel/helpers/resolveTransferDisplayValue";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { mapFormDataToPlayerData, mapPlayerToFormValues } from "../common/helpers/Mappers";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import ContractInfoSection from "../layout/SectionView/features/PlayerTabs/InfoPlayerTab/components/ContractInfoSection";

// Mocks do Firebase e Firestore
vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "user-test-123" } },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/services/ServicePlayers/helpers/authHelpers", () => ({
  requireAuth: () => ({ uid: "user-test-123" }),
}));

let mockCareer: Career;
vi.mock("../common/helpers/Getters", () => ({
  getCareerById: async () => mockCareer,
}));

describe("Bloco 2 - Regras de Transferências, Contratos e Empréstimos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCareer = {
      id: "career-test-1",
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
              id: "player-swap-out",
              name: "Jogador de Troca",
              sell: false,
              loan: false,
              buy: false,
              salary: 15000,
              contractTime: 2,
              contract: [
                {
                  fromClub: "Clube Original",
                  buyValue: 0,
                  sellValue: 0,
                  leftClub: "",
                  dataArrival: new Date("2024-01-01"),
                },
              ],
            } as unknown as Players,
          ],
        } as unknown as ClubData,
      ],
    } as unknown as Career;
  });

  // -------------------------------------------------------------
  // 1. Validação de Parcelamento
  // -------------------------------------------------------------
  describe("1. Validação de Parcelamento (createTransferInstallments)", () => {
    it("calcula corretamente upfront e parcelas para 60% em 3 anos com 1ª parcela na temporada seguinte", () => {
      const installments = createTransferInstallments({
        totalValue: 60000000,
        percentage: 60,
        totalInstallments: 3,
        currentSeasonNumber: 1,
        direction: "payable",
        partnerClub: "Real Madrid",
      });

      expect(installments.direction).toBe("payable");
      expect(installments.status).toBe("pending");
      expect(installments.percentage).toBe(60);
      expect(installments.totalInstallments).toBe(3);
      expect(installments.remainingInstallments).toBe(3);
      // Upfront = 40% de 60M = 24M
      expect(installments.upfrontValue).toBe(24000000);
      // Parcela anual = (60% de 60M) / 3 = 36M / 3 = 12M
      expect(installments.annualInstallmentValue).toBe(12000000);
      // Primeira parcela na temporada seguinte: seasonNumber 1 + 1 = 2
      expect(installments.firstPaymentSeasonNumber).toBe(2);
      expect(installments.partnerClub).toBe("Real Madrid");
    });

    it("calcula corretamente parcelamento de 100% (upfront zerado)", () => {
      const installments = createTransferInstallments({
        totalValue: 100000000,
        percentage: 100,
        totalInstallments: 5,
        currentSeasonNumber: 2,
        direction: "receivable",
        partnerClub: "Chelsea",
      });

      expect(installments.upfrontValue).toBe(0);
      expect(installments.annualInstallmentValue).toBe(20000000);
      expect(installments.firstPaymentSeasonNumber).toBe(3);
      expect(installments.totalInstallments).toBe(5);
    });

    it("rejeita percentuais de parcelamento fora da escala oficial (20, 40, 60, 80, 100)", () => {
      expect(() =>
        createTransferInstallments({
          totalValue: 50000000,
          percentage: 35,
          totalInstallments: 2,
          currentSeasonNumber: 1,
          direction: "payable",
          partnerClub: "Benfica",
        }),
      ).toThrow("Percentual de parcelamento inválido: 35%");
    });

    it("rejeita quantidade de parcelas fora da faixa de 1 a 7 anos", () => {
      expect(() =>
        createTransferInstallments({
          totalValue: 50000000,
          percentage: 40,
          totalInstallments: 0,
          currentSeasonNumber: 1,
          direction: "payable",
          partnerClub: "Benfica",
        }),
      ).toThrow("Número de parcelas inválido: 0");

      expect(() =>
        createTransferInstallments({
          totalValue: 50000000,
          percentage: 40,
          totalInstallments: 8,
          currentSeasonNumber: 1,
          direction: "payable",
          partnerClub: "Benfica",
        }),
      ).toThrow("Número de parcelas inválido: 8");
    });
  });

  // -------------------------------------------------------------
  // 2. Trocas Atômicas de Jogadores
  // -------------------------------------------------------------
  describe("2. Trocas Atômicas de Atletas (signPlayerWithTerms e sellPlayerFromSeason)", () => {
    it("processa a saída imediata do jogador envolvido na troca na compra de um novo atleta", async () => {
      const season = mockCareer.clubData[0];
      const playerToSwap = season.players[0];
      expect(playerToSwap.sell).toBe(false);

      const newPlayer = await PlayersContractService.signPlayerWithTerms({
        careerId: "career-test-1",
        seasonId: "season-1",
        player: {
          name: "Craque Contratado",
          position: "ATA",
          overall: 85,
        },
        contract: {
          buyValue: 30000000,
          fromClub: "Barcelona",
        },
        swapPlayer: {
          playerId: "player-swap-out",
          playerName: "Jogador de Troca",
        },
      });

      expect(newPlayer.name).toBe("Craque Contratado");
      expect(newPlayer.buy).toBe(true);

      // Jogador de troca deve ter saído do elenco
      expect(playerToSwap.sell).toBe(true);
      const swappedContract = playerToSwap.contract[playerToSwap.contract.length - 1];
      expect(swappedContract.leftClub).toBe("Barcelona");
      expect(swappedContract.swapPlayer?.playerName).toBe("Craque Contratado");
    });

    it("adiciona no elenco o atleta recebido em troca atômica durante uma venda", async () => {
      const season = mockCareer.clubData[0];
      const initialCount = season.players.length;

      await PlayersContractService.sellPlayerFromSeason(
        "career-test-1",
        "season-1",
        "player-swap-out",
        "50M",
        "Juventus",
        "15/07",
        {
          swapPlayer: {
            playerName: "Atleta Recebido na Troca",
            estimatedValue: 20000000,
            incomingSwap: true,
          },
        },
      );

      expect(season.players.length).toBe(initialCount + 1);
      const incoming = season.players.find(
        (p) => p.name === "Atleta Recebido na Troca",
      );
      expect(incoming).toBeDefined();
      expect(incoming?.buy).toBe(true);
      expect(incoming?.playerValue).toBe(20000000);
      expect(incoming?.contract[0].fromClub).toBe("Juventus");
    });
  });

  // -------------------------------------------------------------
  // 3. Restrição de Taxa de Agência em Renovações
  // -------------------------------------------------------------
  describe("3. Restrição de Taxa de Agência em Renovações Contratuais", () => {
    it("permite taxa de agência em nova transferência (isRenewal === false / undefined)", () => {
      const contractDetails: ContractDetails = {
        weeklyWage: 50000,
        durationYears: 4,
        squadRole: "Importante",
        agentFee: 1500000,
        isRenewal: false,
      };

      expect(() => validateContractDetails(contractDetails)).not.toThrow();
    });

    it("rejeita terminantemente taxa de agência em renovação (isRenewal === true)", () => {
      const contractDetails: ContractDetails = {
        weeklyWage: 80000,
        durationYears: 3,
        squadRole: "Crucial",
        agentFee: 500000,
        isRenewal: true,
      };

      expect(() => validateContractDetails(contractDetails)).toThrow(
        "Taxa de agência não é permitida em renovações contratuais.",
      );
    });

    it("lança erro no mapFormDataToPlayerData quando isRenewal é true e agentFee é informada", () => {
      const formData = new FormData();
      formData.append("playerName", "Jogador Renovando");
      formData.append("salary", "100k");
      formData.append("contractTime", "3");
      formData.append("isRenewal", "true");
      formData.append("agentFee", "200k");

      expect(() =>
        mapFormDataToPlayerData(
          formData,
          mockCareer,
          mockCareer.clubData[0],
        ),
      ).toThrow("Taxa de agência não é permitida em renovações contratuais.");
    });
  });

  // -------------------------------------------------------------
  // 4. Status no Elenco (SquadRole), Luvas e Validação de Contratos
  // -------------------------------------------------------------
  describe("4. Status no Elenco e Termos Contratuais Ricos", () => {
    it("valida e aceita todas as 5 opções oficiais de SquadRole", () => {
      for (const role of SQUAD_ROLES) {
        const details: ContractDetails = {
          weeklyWage: 30000,
          durationYears: 3,
          squadRole: role,
          signingBonus: 1000000,
        };
        expect(() => validateContractDetails(details)).not.toThrow();
      }
    });

    it("rejeita SquadRole inválido", () => {
      const details = {
        weeklyWage: 30000,
        durationYears: 3,
        squadRole: "Invalido" as unknown,
      } as ContractDetails;
      expect(() => validateContractDetails(details)).toThrow(
        "Status no elenco inválido: Invalido",
      );
    });

    it("valida faixas de ajuste automático salarial de 5% a 25% (de 5 em 5)", () => {
      const validPercentages = [5, 10, 15, 20, 25];
      for (const pct of validPercentages) {
        const details: ContractDetails = {
          weeklyWage: 40000,
          durationYears: 3,
          squadRole: "Rodízio",
          wageAdjustment: {
            enabled: true,
            percentage: pct,
            competitionBasis: "league",
            targetObjective: "Classificar para Europa",
          },
        };
        expect(() => validateContractDetails(details)).not.toThrow();
      }

      // Inválido (fora da escala)
      const invalidDetails: ContractDetails = {
        weeklyWage: 40000,
        durationYears: 3,
        squadRole: "Rodízio",
        wageAdjustment: {
          enabled: true,
          percentage: 12,
          competitionBasis: "league",
          targetObjective: "Classificar para Europa",
        },
      };
      expect(() => validateContractDetails(invalidDetails)).toThrow(
        "Percentual de ajuste salarial inválido: 12%",
      );
    });

    it("persiste squadRole e contractDetails via mapFormDataToPlayerData", () => {
      const formData = new FormData();
      formData.append("playerName", "Novo Atleta");
      formData.append("salary", "45k");
      formData.append("contractTime", "5");
      formData.append("squadRole", "Crucial");
      formData.append("signingBonus", "2M");
      formData.append("releaseClause", "120M");

      const mapped = mapFormDataToPlayerData(
        formData,
        mockCareer,
        mockCareer.clubData[0],
      );

      expect(mapped.squadRole).toBe("Crucial");
      expect(mapped.contractDetails?.weeklyWage).toBe(45000);
      expect(mapped.contractDetails?.durationYears).toBe(5);
      expect(mapped.contractDetails?.squadRole).toBe("Crucial");
      expect(mapped.contractDetails?.signingBonus).toBe(2000000);
      expect(mapped.contractDetails?.releaseClause).toBe(120000000);
    });

    it("converte campos ricos para formulário via mapPlayerToFormValues", () => {

      const richPlayer: Players = {
        id: "p-form",
        name: "Jogador Form",
        squadRole: "Importante",
        salary: 50000,
        playerValue: 40000000,
        contractTime: 4,
        contract: [
          {
            buyValue: 40000000,
            sellValue: 0,
            fromClub: "Sevilla",
            leftClub: "",
            dataArrival: new Date("2024-07-01"),
            timing: "Imediata",
            contractDetails: {
              weeklyWage: 50000,
              durationYears: 4,
              squadRole: "Importante",
              signingBonus: 3000000,
              agentFee: 1000000,
              releaseClause: 80000000,
            },
          },
        ],
      } as unknown as Players;

      const formValues = mapPlayerToFormValues(richPlayer, "€");
      expect(formValues.squadRole).toBe("Importante");
      expect(formValues.signingBonus).toBe("€3M");
      expect(formValues.agentFee).toBe("€1M");
      expect(formValues.releaseClause).toBe("€80M");
      expect(formValues.timing).toBe("Imediata");
    });
  });

  // -------------------------------------------------------------
  // 5. Empréstimos com Opção de Compra e Futura Venda
  // -------------------------------------------------------------
  describe("5. Empréstimos com Opção de Compra e Futura Venda", () => {
    it("valida termos de empréstimo corretos com opção de compra e futura venda", () => {
      const loanTerms: LoanTerms = {
        durationYears: 1,
        ourWagePercentage: 60,
        theirWagePercentage: 40,
        hasBuyOption: true,
        buyOptionFee: 25000000,
        sellOnPercentage: 15,
        partnerClub: "Monaco",
      };

      expect(() => validateLoanTerms(loanTerms)).not.toThrow();
    });

    it("rejeita duração de empréstimo fora de 1 ou 2 anos", () => {
      const loanTerms: LoanTerms = {
        durationYears: 3 as unknown as 1 | 2,
        ourWagePercentage: 50,
        theirWagePercentage: 50,
        hasBuyOption: false,
      };

      expect(() => validateLoanTerms(loanTerms)).toThrow(
        "Duração de empréstimo deve ser de 1 ou 2 anos.",
      );
    });

    it("rejeita taxas de futura venda fora de 5% a 30% (de 5 em 5)", () => {
      const valid = [5, 10, 15, 20, 25, 30];
      for (const pct of valid) {
        expect(() => validateSellOnPercentage(pct)).not.toThrow();
      }

      expect(() => validateSellOnPercentage(12)).toThrow(
        "Taxa de futura venda inválida: 12%",
      );
      expect(() => validateSellOnPercentage(35)).toThrow(
        "Taxa de futura venda inválida: 35%",
      );
    });

    it("persiste loanTerms em loanPlayerFromSeason", async () => {
      const terms: LoanTerms = {
        durationYears: 2,
        ourWagePercentage: 80,
        theirWagePercentage: 20,
        hasBuyOption: true,
        buyOptionFee: 15000000,
        sellOnPercentage: 10,
      };

      await PlayersContractService.loanPlayerFromSeason(
        "career-test-1",
        "season-1",
        "player-swap-out",
        "15M",
        "Sevilla",
        "20/07",
        "2",
        "80",
        terms,
      );

      const player = mockCareer.clubData[0].players.find(
        (p) => p.id === "player-swap-out",
      )!;
      expect(player.loan).toBe(true);
      const lastContract = player.contract[player.contract.length - 1];
      expect(lastContract.loanTerms).toEqual(terms);
      expect(lastContract.leftClub).toBe("Sevilla");
    });
  });

  // -------------------------------------------------------------
  // 6. Integração Narrativa em buildTransferCopyText e Badges
  // -------------------------------------------------------------
  describe("6. buildTransferCopyText e Badges de Cláusulas", () => {
    it("inclui narrativa de parcelamento e recompra no texto de compra", () => {
      const player: Players = {
        id: "p1",
        name: "Lamine Yamal",
        position: "PD",
        age: 18,
        nation: "ESP",
        contractTime: 5,
        salary: 120000,
        buy: true,
        sell: false,
        contract: [],
      } as unknown as Players;

      const contract: Contract = {
        fromClub: "Barcelona",
        leftClub: "",
        buyValue: 120000000,
        sellValue: 0,
        dataArrival: new Date("2024-07-01"),
        installments: {
          id: "inst-1",
          direction: "payable",
          status: "pending",
          percentage: 60,
          totalInstallments: 3,
          remainingInstallments: 3,
          annualInstallmentValue: 24000000,
          upfrontValue: 48000000,
          firstPaymentSeasonNumber: 2,
          partnerClub: "Barcelona",
        },
        transferClauses: {
          buybackValue: 180000000,
          sellOnPercentage: 20,
        },
      };

      const copyText = buildTransferCopyText({
        player,
        contract,
        direction: "arrivals",
        currency: "EUR",
      });

      expect(copyText).toContain("com pagamento de 60% parcelado em 3x anuais");
      expect(copyText).toContain("com cláusula de recompra fixada em 180 milhões de euros");
      expect(copyText).toContain("com 20% de taxa de futura venda");
    });

    it("inclui narrativa de troca de atleta na venda", () => {
      const player: Players = {
        id: "p2",
        name: "Rodrygo",
        position: "PD",
        age: 24,
        nation: "BRA",
        contractTime: 3,
        salary: 150000,
        buy: false,
        sell: true,
        contract: [],
      } as unknown as Players;

      const contract: Contract = {
        fromClub: "",
        leftClub: "Manchester City",
        buyValue: 0,
        sellValue: 80000000,
        dataArrival: null,
        dataExit: new Date("2024-08-01"),
        swapPlayer: {
          playerName: "Julián Álvarez",
        },
      };


      const copyText = buildTransferCopyText({
        player,
        contract,
        direction: "exit",
        currency: "EUR",
      });

      expect(copyText).toContain("envolvendo a chegada de Julián Álvarez na negociação");
    });

    it("retorna badges corretas para exibição visual no TransfersPanel", () => {
      const contract: Contract = {
        fromClub: "Porto",
        leftClub: "",
        buyValue: 40000000,
        sellValue: 0,
        dataArrival: new Date("2024-07-01"),
        installments: {
          id: "inst-2",
          direction: "payable",
          status: "pending",
          percentage: 40,
          totalInstallments: 2,
          remainingInstallments: 2,
          annualInstallmentValue: 8000000,
          upfrontValue: 24000000,
          firstPaymentSeasonNumber: 2,
          partnerClub: "Porto",
        },
        swapPlayer: { playerName: "Jogador Cedido" },
        transferClauses: {
          buybackValue: 60000000,
          loanBackDuration: 1,
          sellOnPercentage: 15,
        },
        bonuses: [
          {
            id: "b-1",
            direction: "payable",
            category: "performance",
            name: "Meta de 15 gols",
            value: 2000000,
            status: "pending",
          },
        ],
      };

      const badges = getTransferBadges(contract);
      const labels = badges.map((b) => b.label);

      expect(labels).toContain("Parcelado em 2x");
      expect(labels).toContain("Troca de atletas");
      expect(labels).toContain("Cláusula de Recompra");
      expect(labels).toContain("Emprestado de Volta (1a)");
      expect(labels).toContain("15% Futura Venda");
      expect(labels).toContain("Bônus por Objetivos");
    });
  });

  // -------------------------------------------------------------
  // 7. Renderização no ContractInfoSection
  // -------------------------------------------------------------
  describe("7. Renderização dos Novos Termos no ContractInfoSection", () => {
    it("renderiza status no elenco, luvas, taxa de agência, multa rescisória e ajuste salarial", () => {
      const playerWithFullContract: Players = {
        id: "p-rich",
        name: "Erling Haaland",
        position: "ATA",
        age: 24,
        nation: "NOR",
        playerValue: 180000000,
        salary: 400000,
        contractTime: 5,
        squadRole: "Crucial",
        buy: true,
        sell: false,
        contract: [],
        contractDetails: {
          weeklyWage: 400000,
          durationYears: 5,
          squadRole: "Crucial",
          signingBonus: 10000000,
          agentFee: 5000000,
          releaseClause: 200000000,
          wageAdjustment: {
            enabled: true,
            percentage: 15,
            competitionBasis: "league",
            targetObjective: "Campeão da Premier League",
          },
        },
      } as unknown as Players;

      render(
        <ContractInfoSection
          player={playerWithFullContract}
          currency="€"
        />,
      );

      expect(screen.getByText("Informações do contrato")).toBeTruthy();
      expect(screen.queryByText("Status no elenco")).toBeNull();
      expect(screen.queryByText("Crucial")).toBeNull();
      expect(screen.getByText("Multa rescisória")).toBeTruthy();
      expect(screen.getByText("€200M")).toBeTruthy();
      expect(screen.getByText("Luvas")).toBeTruthy();
      expect(screen.getByText("€10M")).toBeTruthy();
      expect(screen.getByText("Taxa de agência")).toBeTruthy();
      expect(screen.getByText("€5M")).toBeTruthy();
      expect(screen.getByText("Ajuste salarial")).toBeTruthy();
      expect(
        screen.getByText("±15% (Campeão da Premier League)"),
      ).toBeTruthy();
    });
  });
});

