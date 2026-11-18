// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  buildTransferSections,
  buildSaleClausesSections,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import { validateTransfer } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/validators/transferValidator";
import { useTransferForm } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useTransferForm";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import {
  DEFAULT_OBJECTIVE_BONUSES,
  DEFAULT_AWARD_BONUSES,
  DEFAULT_PERFORMANCE_BONUSES,
} from "../common/interfaces/playersInfo/transferTerms";
import { player, career, season } from "./factories/domain";
import { Players } from "../common/interfaces/playersInfo/players";
import { Career } from "../common/interfaces/Career";
import { mapPlayerToFormValues } from "../common/helpers/Mappers";
import {
  shouldPlayerLeaveOnNextWindow,
  isPlayerActuallyDeparted,
} from "../common/services/ServicePlayers/helpers/transferTimingHelpers";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import { buildEditTransferFormSections } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/constants/buildEditTransferFormSections";
import {
  applyRevertToCareer,
  applyEditToCareer,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/helpers/transferCareerStateReducers";
import { Match } from "../common/interfaces/Match";
import { clearAllToasts, toastStore } from "../common/services/ToastService";
import { Field } from "../components/FormSection";

const mockField = (id: string): Field => ({ id, name: id, icon: null });

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockDoc = vi.fn((_db, path) => ({ id: path }));
const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockWriteBatch = vi.fn(() => ({
  set: mockBatchSet,
  update: vi.fn(),
  delete: vi.fn(),
  commit: mockBatchCommit,
}));

vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "user-test-123" } },
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(args[0], args[1]),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  collection: vi.fn().mockReturnValue({ id: "mock-coll" }),
  writeBatch: () => mockWriteBatch(),
  arrayUnion: (...args: unknown[]) => args,
  deleteField: vi.fn(),
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

vi.mock(
  "../common/services/ServiceMatches",
  () => ({
    ServiceMatches: {
      getAllTeamsAcrossUserCareers: vi
        .fn()
        .mockResolvedValue(["Barcelona", "Real Madrid"]),
      addTeamToSeason: vi.fn().mockResolvedValue(undefined),
    },
  }),
);

// Helper para acessar propriedades de campos nos testes com segurança de tipagem
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getField = (fields: any[] | undefined, id: string): any =>
  fields?.flat().find((f) => f.id === id);

describe("Reestruturação do Fluxo de Transferência (Modalidade Venda)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCareer = {
      id: "career-1",
      clubName: "Meu Clube",
      managerName: "Treinador",
      createdAt: new Date("2024-07-01"),
      teamBadge: "",
      nation: "BRA",
      colorsTeams: ["#000000"],
      trophies: [],
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          teams: [],
          players: [],
          matches: [],
        },
      ],
    };
  });

  describe("1. Renderização de Estrutura e Correção Semântica", () => {
    it("renderiza o controle 'Data de saída' com custom-select em linha cheia e opções Imediata, Proxima Janela e Proxima Temporada", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };
      const sections = buildTransferSections(bools, ["Barcelona"]);
      const statusSection = sections.find((s) => s.title === "Status de Saída");
      expect(statusSection).toBeDefined();

      const timingField = getField(statusSection?.fields, "timing");
      expect(timingField).toBeDefined();
      expect(timingField?.name).toBe("Data de saída");
      expect(timingField?.inputType).toBe("custom-select");
      expect(timingField?.options).toEqual([
        "Imediata",
        "Proxima Janela",
        "Proxima Temporada",
      ]);
      expect(timingField?.orientation).toBeUndefined();
    });

    it("exibe rótulo corrigido 'Taxa de transferência' e não exibe 'Data do acordo' na venda normal", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };
      const sections = buildTransferSections(bools, ["FC Barcelona"]);
      const detailsSection = sections.find(
        (s) => s.title === "Detalhes da Transferência",
      );
      expect(detailsSection).toBeDefined();

      const feeField = getField(detailsSection?.fields, "sellValue");
      expect(feeField?.name).toBe("Taxa de transferência");

      const dateField = getField(detailsSection?.fields, "dateExit");
      expect(dateField).toBeUndefined();
    });

    it("exibe campo de data nas saídas especiais (Aposentadoria e Fim de Contrato)", () => {
      const retirementBools = {
        isRetirement: true,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };
      const retirementSections = buildTransferSections(retirementBools, ["FC Barcelona"]);
      const retirementDetails = retirementSections.find((s) => s.title === "Detalhes da Transferência");
      const retirementDateField = getField(retirementDetails?.fields, "dateExit");
      expect(retirementDateField?.name).toBe("Data da aposentadoria");

      const endContractBools = {
        isRetirement: false,
        isEndContract: true,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };
      const endContractSections = buildTransferSections(endContractBools, ["FC Barcelona"]);
      const endContractDetails = endContractSections.find((s) => s.title === "Detalhes da Transferência");
      const endContractDateField = getField(endContractDetails?.fields, "dateExit");
      expect(endContractDateField?.name).toBe("Data da saída");
    });

    it("retorna exclusivamente as 2 seções básicas na venda, desacoplando as cláusulas para buildSaleClausesSections", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };
      const sections = buildTransferSections(bools, ["Barcelona"]);
      expect(sections).toHaveLength(2);
      expect(sections.map((s) => s.title)).toEqual([
        "Status de Saída",
        "Detalhes da Transferência",
      ]);

      const clausesSections = buildSaleClausesSections(bools);
      expect(clausesSections.installmentsSection).toBeDefined();
      expect(clausesSections.playerSwapSection).toBeDefined();
      expect(clausesSections.bonusSection).toBeDefined();
      expect(clausesSections.otherClausesSection).toBeDefined();
    });

    it("oculta 'Data de saída' quando 'Aposentou?' ou 'Fim de Contrato?' for verdadeiro", () => {
      const boolsRetirement = {
        isRetirement: true,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };
      const sectionsRet = buildTransferSections(boolsRetirement);
      const statusRet = sectionsRet.find((s) => s.title === "Status de Saída");
      expect(
        statusRet?.fields.flat().find((f) => f.id === "timing"),
      ).toBeUndefined();

      const boolsEndContract = {
        isRetirement: false,
        isEndContract: true,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };
      const sectionsEnd = buildTransferSections(boolsEndContract);
      const statusEnd = sectionsEnd.find((s) => s.title === "Status de Saída");
      expect(
        statusEnd?.fields.flat().find((f) => f.id === "timing"),
      ).toBeUndefined();
    });
  });

  describe("2. Cálculo de Parcelas e Validação", () => {
    it("para taxa de 37.2M e 20%, exibe 7,44M parcelado e 29,76M à vista; e para 4 temporadas exibe 1,86M por temporada", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: true,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };
      const formValues = {
        sellValue: "37.2M",
        installmentsPercentage: "20",
        installmentsYears: "4",
      };
      const { installmentsSection } = buildSaleClausesSections(
        bools,
        formValues,
      );
      expect(installmentsSection).toBeDefined();

      const pctField = getField(
        installmentsSection?.fields,
        "installmentsPercentage",
      );
      expect(pctField?.options).toContain("Nenhum");
      expect(pctField?.options).toContain("20% do total");

      const yearsField = getField(
        installmentsSection?.fields,
        "installmentsYears",
      );
      expect(yearsField?.options).toContain("4 Parcelas");
    });

    it("valida que o início do pagamento é atribuído à temporada subsequente (seasonNumber + 1)", () => {
      const formValues = {
        sellValue: "37.2M",
        toClub: "Barcelona",
        dateExit: "15/07",
        installmentsPercentage: "20%",
        installmentsYears: "4 temporadas",
      };
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: true,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };

      const result = validateTransfer(formValues, bools, 3);
      expect(result.isValid).toBe(true);
      expect(result.data?.installments).toBeDefined();
      expect(result.data?.installments?.firstPaymentSeasonNumber).toBe(4); // 3 + 1
      expect(result.data?.installments?.percentage).toBe(20);
      expect(result.data?.installments?.totalInstallments).toBe(4);
      expect(result.data?.installments?.direction).toBe("receivable");
      expect(result.data?.installments?.partnerClub).toBe("Barcelona");
      expect(result.data?.installments?.annualInstallmentValue).toBe(1860000);
      expect(result.data?.installments?.upfrontValue).toBe(29760000);
    });

    it("rejeita parcelamento com porcentagem ou número de temporadas inválidos", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: true,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };

      const invalidPct = validateTransfer(
        {
          sellValue: "10M",
          toClub: "Real",
          dateExit: "01/07",
          installmentsPercentage: "35%",
        },
        bools,
      );
      expect(invalidPct.isValid).toBe(false);
      expect(invalidPct.error).toContain("porcentagem válida");

      const invalidYears = validateTransfer(
        {
          sellValue: "10M",
          toClub: "Real",
          dateExit: "01/07",
          installmentsPercentage: "20%",
          installmentsYears: "9",
        },
        bools,
      );
      expect(invalidYears.isValid).toBe(false);
      expect(invalidYears.error).toContain("número de temporadas");
    });
  });

  describe("3. Atleta para Troca", () => {
    it("exibe campos de nome, valor, setor e posição quando 'hasPlayerSwap' estiver ativo", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: true,
        hasBonus: false,
        hasOtherClauses: false,
      };
      const { playerSwapSection: swapSection } =
        buildSaleClausesSections(bools);
      expect(swapSection).toBeDefined();

      const fields = swapSection?.fields.flat();
      expect(fields?.map((f) => f.id)).toEqual([
        "swapPlayerName",
        "swapPlayerValue",
        "swapPlayerSector",
        "swapPlayerPosition",
      ]);
    });

    it("filtra posições dinamicamente pelo setor selecionado", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: true,
        hasBonus: false,
        hasOtherClauses: false,
      };

      const { playerSwapSection: ataqueSec } = buildSaleClausesSections(bools, {
        swapPlayerSector: "Ataque",
      });
      const posFieldAtaque = getField(ataqueSec?.fields, "swapPlayerPosition");
      expect(posFieldAtaque?.options).toEqual(["PE", "PD", "ATA"]);

      const { playerSwapSection: defesaSec } = buildSaleClausesSections(bools, {
        swapPlayerSector: "Defesa",
      });
      const posFieldDefesa = getField(defesaSec?.fields, "swapPlayerPosition");
      expect(posFieldDefesa?.options).toEqual(["LE", "ZAG", "LD"]);
    });

    it("valida campos obrigatórios da troca do atleta", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: true,
        hasBonus: false,
        hasOtherClauses: false,
      };

      const noName = validateTransfer(
        { sellValue: "10M", toClub: "Arsenal", dateExit: "10/08" },
        bools,
      );
      expect(noName.isValid).toBe(false);
      expect(noName.error).toContain("nome do atleta");

      const noSector = validateTransfer(
        {
          sellValue: "10M",
          toClub: "Arsenal",
          dateExit: "10/08",
          swapPlayerName: "Jogador X",
        },
        bools,
      );
      expect(noSector.isValid).toBe(false);
      expect(noSector.error).toContain("setor do atleta");

      const noPosition = validateTransfer(
        {
          sellValue: "10M",
          toClub: "Arsenal",
          dateExit: "10/08",
          swapPlayerName: "Jogador X",
          swapPlayerSector: "Meia",
        },
        bools,
      );
      expect(noPosition.isValid).toBe(false);
      expect(noPosition.error).toContain("posição do atleta");

      const validSwap = validateTransfer(
        {
          sellValue: "10M",
          toClub: "Arsenal",
          dateExit: "10/08",
          swapPlayerName: "Jogador X",
          swapPlayerSector: "Ataque",
          swapPlayerPosition: "ATA",
          swapPlayerValue: "5M",
        },
        bools,
      );
      expect(validSwap.isValid).toBe(true);
      expect(validSwap.data?.swapPlayer).toEqual({
        playerName: "Jogador X",
        estimatedValue: 5000000,
        incomingSwap: true,
        sector: "Ataque",
        position: "ATA",
      });
    });
  });

  describe("4. Bônus de Conquistas", () => {
    it("alterna opções de objetivo por categoria e exibe contagem exclusivamente em 'Desempenho'", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: true,
        hasOtherClauses: false,
      };

      // Categoria: Objetivo atingido
      const { bonusSection: bonusSecObj } = buildSaleClausesSections(bools, {
        bonusCategory: "Objetivo atingido",
      });
      const objField = getField(bonusSecObj?.fields, "bonusObjective");
      expect(objField?.options).toEqual(
        expect.arrayContaining([...DEFAULT_OBJECTIVE_BONUSES]),
      );
      expect(
        bonusSecObj?.fields.flat().find((f) => f.id === "bonusCount"),
      ).toBeUndefined();

      // Categoria: Prêmio
      const { bonusSection: bonusSecAward } = buildSaleClausesSections(bools, {
        bonusCategory: "Prêmio",
      });
      const awardField = getField(bonusSecAward?.fields, "bonusObjective");
      expect(awardField?.options).toEqual(
        expect.arrayContaining([...DEFAULT_AWARD_BONUSES]),
      );
      expect(
        bonusSecAward?.fields.flat().find((f) => f.id === "bonusCount"),
      ).toBeUndefined();

      // Categoria: Desempenho
      const { bonusSection: bonusSecPerf } = buildSaleClausesSections(bools, {
        bonusCategory: "Desempenho",
      });
      const perfField = getField(bonusSecPerf?.fields, "bonusObjective");
      expect(perfField?.options).toEqual(
        expect.arrayContaining([...DEFAULT_PERFORMANCE_BONUSES]),
      );
      const countField = getField(bonusSecPerf?.fields, "bonusCount");
      expect(countField).toBeDefined();
      expect(countField?.name).toBe("Contagem");
    });

    it("mantém lista de objetivos vazia quando nenhuma categoria de bônus estiver selecionada", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: true,
        hasOtherClauses: false,
      };

      const { bonusSection, objectiveOptions } = buildSaleClausesSections(
        bools,
        {
          bonusCategory: "",
        },
      );
      expect(objectiveOptions).toEqual([]);
      const objField = getField(bonusSection?.fields, "bonusObjective");
      expect(objField?.options).toEqual([]);
      expect(objField?.placeholder).toBe("Selecione primeiro a opção de bônus");
    });

    it("incorpora objetivos personalizados da carreira nas opções", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: true,
        hasOtherClauses: false,
      };
      const customOptions = {
        "Objetivo atingido": ["Conquistar vaga na Libertadores"],
      };

      const { bonusSection } = buildSaleClausesSections(
        bools,
        { bonusCategory: "Objetivo atingido" },
        customOptions,
      );
      const objField = getField(bonusSection?.fields, "bonusObjective");
      expect(objField?.options).toContain("Conquistar vaga na Libertadores");
    });

    it("valida campos de bônus e exige contagem entre 1 e 100 em Desempenho", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: true,
        hasOtherClauses: false,
      };

      const noCount = validateTransfer(
        {
          sellValue: "10M",
          toClub: "PSG",
          dateExit: "10/08",
          bonusCategory: "Desempenho",
          bonusObjective: "Gols marcados",
          bonusValue: "1M",
        },
        bools,
      );
      expect(noCount.isValid).toBe(false);
      expect(noCount.error).toContain("contagem de desempenho");

      const invalidCount = validateTransfer(
        {
          sellValue: "10M",
          toClub: "PSG",
          dateExit: "10/08",
          bonusCategory: "Desempenho",
          bonusObjective: "Gols marcados",
          bonusCount: "150",
          bonusValue: "1M",
        },
        bools,
      );
      expect(invalidCount.isValid).toBe(false);
      expect(invalidCount.error).toContain("entre 1 e 100");

      const validPerf = validateTransfer(
        {
          sellValue: "10M",
          toClub: "PSG",
          dateExit: "10/08",
          bonusCategory: "Desempenho",
          bonusObjective: "Gols marcados",
          bonusCount: "20",
          bonusValue: "1.5M",
        },
        bools,
      );
      expect(validPerf.isValid).toBe(true);
      expect(validPerf.data?.bonuses?.[0]).toMatchObject({
        category: "performance",
        name: "Gols marcados",
        metricTarget: 20,
        metric: "goals",
        value: 1500000,
        direction: "receivable",
        partnerClub: "PSG",
      });
    });
  });

  describe("5. Seção Outros (Emprestar de volta, recompra, preferência, venda futura)", () => {
    it("exibe opções de empréstimo de volta, recompra, preferência e taxa futura", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: true,
      };
      const { otherClausesSection } = buildSaleClausesSections(bools);
      expect(otherClausesSection).toBeDefined();

      const loanBack = getField(
        otherClausesSection?.fields,
        "loanBackDuration",
      );
      expect(loanBack?.options).toEqual([
        "Nenhum",
        "1 temporada",
        "2 temporadas",
      ]);

      const buyback = getField(otherClausesSection?.fields, "buybackValue");
      expect(buyback?.name).toBe("Cláusula de recompra");

      const refusal = getField(otherClausesSection?.fields, "firstRefusal");
      expect(refusal?.name).toBe("Direito de preferência");
      expect(refusal?.checkbox).toBe(true);

      const sellOn = getField(otherClausesSection?.fields, "sellOnPercentage");
      expect(sellOn?.options).toEqual([
        "Nenhum",
        "5%",
        "10%",
        "15%",
        "20%",
        "25%",
        "30%",
      ]);
    });

    it("valida cláusulas e converte campos para TransferClauses", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: true,
        firstRefusal: true,
      };
      const formValues = {
        sellValue: "20M",
        toClub: "Juventus",
        dateExit: "12/08",
        loanBackDuration: "1 temporada",
        buybackValue: "40M",
        sellOnPercentage: "15%",
      };

      const result = validateTransfer(formValues, bools);
      expect(result.isValid).toBe(true);
      expect(result.data?.transferClauses).toEqual({
        loanBackDuration: 1,
        buybackValue: 40000000,
        firstRefusal: true,
        sellOnPercentage: 15,
        partnerClub: "Juventus",
        status: "pending",
      });
    });
  });

  describe("6. Remoção de Persistência no localStorage (Fluxo Limpo)", () => {
    it("não grava dados de formulário no localStorage durante alterações nem ao montar", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      const testPlayer = player({ id: "p-test-1", name: "Gabriel Barbosa" });
      const testSeason = season({ id: "s-1", seasonNumber: 1 });
      const testCareer = career({ id: "c-1", clubData: [testSeason] });
      const cacheKey = `transfer_sale_draft_c-1_s-1_p-test-1`;

      const { result, unmount } = renderHook(() =>
        useTransferForm({
          careerId: "c-1",
          season: testSeason,
          career: testCareer,
          player: testPlayer,
          currentPlayers: [testPlayer],
          handleGoBack: vi.fn(),
        }),
      );

      act(() => {
        result.current.handleCustomInputChange(
          {
            target: { name: "sellValue", value: "25M" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("sellValue"),
        );
        result.current.handleBooleanChangeWrapper("hasInstallments", true);
      });

      // Checa que nada foi gravado no localStorage
      expect(localStorage.getItem(cacheKey)).toBeNull();
      expect(setItemSpy).not.toHaveBeenCalled();

      unmount();

      // Monta novo hook para simular reabertura / reload sem persistência
      const { result: restoredResult } = renderHook(() =>
        useTransferForm({
          careerId: "c-1",
          season: testSeason,
          career: testCareer,
          player: testPlayer,
          currentPlayers: [testPlayer],
          handleGoBack: vi.fn(),
        }),
      );

      // Valores voltam aos padrões iniciais limpos
      expect(restoredResult.current.formValues.sellValue).toBeFalsy();
      expect(restoredResult.current.booleanValues.hasInstallments).toBe(false);
      setItemSpy.mockRestore();
    });

    it("salva a venda normalmente sem interagir com localStorage", async () => {
      const setItemSpy = vi.spyOn(window.localStorage, "setItem");
      const testPlayer = player({ id: "p-test-2", name: "Everton Ribeiro" });
      const testSeason = season({
        id: "s-1",
        seasonNumber: 1,
        players: [testPlayer],
      });
      const testCareer = career({ id: "c-1", clubData: [testSeason] });
      const cacheKey = `transfer_sale_draft_c-1_s-1_p-test-2`;

      mockCareer = testCareer;

      const goBackMock = vi.fn();
      const { result } = renderHook(() =>
        useTransferForm({
          careerId: "c-1",
          season: testSeason,
          career: testCareer,
          player: testPlayer,
          currentPlayers: [testPlayer],
          handleGoBack: goBackMock,
        }),
      );

      act(() => {
        result.current.handleCustomInputChange(
          {
            target: { name: "sellValue", value: "15M" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("sellValue"),
        );
        result.current.handleCustomInputChange(
          {
            target: { name: "toClub", value: "Flamengo" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("toClub"),
        );
        result.current.handleCustomInputChange(
          {
            target: { name: "dateExit", value: "20/07" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("dateExit"),
        );
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(localStorage.getItem(cacheKey)).toBeNull();
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(goBackMock).toHaveBeenCalled();
      setItemSpy.mockRestore();
    });
  });

  describe("7. Integração com PlayersContractService", () => {
    it("ao vender com loan-back, mantém o jogador no elenco como incomingLoan: true com novo contrato de empréstimo", async () => {
      const testPlayer = player({
        id: "p-lb",
        name: "Endrick",
        sell: false,
        incomingLoan: false,
      });
      const testSeason = season({
        id: "s-1",
        seasonNumber: 1,
        players: [testPlayer],
      });
      const testCareer = career({ id: "c-1", clubData: [testSeason] });
      mockCareer = testCareer;

      await PlayersContractService.sellPlayerFromSeason(
        "c-1",
        "s-1",
        "p-lb",
        "60M",
        "Real Madrid",
        "15/07",
        {
          transferClauses: {
            loanBackDuration: 1,
            partnerClub: "Real Madrid",
          },
        },
      );

      expect(mockSetDoc).toHaveBeenCalled();
      const savedPayload = mockSetDoc.mock.calls[0][1] as Players;

      expect(savedPayload.sell).toBe(false);
      expect(savedPayload.incomingLoan).toBe(true);
      expect(savedPayload.loan).toBe(false);
      expect(savedPayload.contractTime).toBe(1);

      // No modelo unificado, mantém 1 contrato de venda com cláusula de empréstimo de volta
      expect(savedPayload.contract?.length).toBe(1);
      const sellContract = savedPayload.contract![0];
      expect(sellContract.leftClub).toBe("Real Madrid");
      expect(sellContract.sellValue).toBe(60000000);
      expect(sellContract.transferClauses?.loanBackDuration).toBe(1);
    });

    it("ao vender com troca de jogador, insere o atleta recebido com setor e posição preservados", async () => {
      const testPlayer = player({ id: "p-swap-out", name: "Gerson" });
      const testSeason = season({
        id: "s-1",
        seasonNumber: 1,
        players: [testPlayer],
      });
      const testCareer = career({ id: "c-1", clubData: [testSeason] });
      mockCareer = testCareer;

      await PlayersContractService.sellPlayerFromSeason(
        "c-1",
        "s-1",
        "p-swap-out",
        "20M",
        "Olympique",
        "18/07",
        {
          swapPlayer: {
            playerName: "Dimitri Payet",
            estimatedValue: 10000000,
            incomingSwap: true,
            sector: "Meia",
            position: "MEI",
          },
        },
      );

      // Duas chamadas a setDoc: 1 para o jogador vendido, 1 para o jogador trocado recebido
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      const incomingPlayerPayload = mockSetDoc.mock.calls[1][1] as Players;

      expect(incomingPlayerPayload.name).toBe("Dimitri Payet");
      expect(incomingPlayerPayload.sector).toBe("Meia");
      expect(incomingPlayerPayload.position).toBe("MEI");
      expect(incomingPlayerPayload.playerValue).toBe(10000000);
      expect(incomingPlayerPayload.buy).toBe(true);
      expect(incomingPlayerPayload.sell).toBe(false);
    });

    it("salva novos objetivos de bônus na carreira e no save group sem duplicar", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          customBonusObjectives: { "Objetivo atingido": ["Objetivo Antigo"] },
        }),
      });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ customBonusObjectives: {} }),
      });

      await PlayersContractService.saveCustomBonusObjective(
        "c-1",
        "Objetivo atingido",
        "Novo Objetivo Inédito",
        "group-1",
      );

      const groupUpdate = mockUpdateDoc.mock.calls[1][1];
      expect(groupUpdate.customBonusObjectives["Objetivo atingido"]).toEqual([
        "Novo Objetivo Inédito",
      ]);
    });
  });

  describe("6. Jogador de Troca (incomingPlayer) sem preenchimento indevido", () => {
    it("cria o atleta recebido na troca com nation vazia, over/age/salary/contractTime zerados, e mapPlayerToFormValues mapeia para campos vazios", async () => {
      const testPlayer = player({ id: "p-sell-out", name: "Vinicius Jr." });
      const testSeason = season({
        id: "s-1",
        seasonNumber: 1,
        players: [testPlayer],
      });
      const testCareer = career({ id: "c-1", clubData: [testSeason] });
      mockCareer = testCareer;

      await PlayersContractService.sellPlayerFromSeason(
        "c-1",
        "s-1",
        "p-sell-out",
        "50M",
        "Liverpool",
        "10/07",
        {
          swapPlayer: {
            playerName: "Darwin Núñez",
            estimatedValue: 40000000,
            incomingSwap: true,
            sector: "Ataque",
            position: "ATA",
          },
        },
      );

      const incomingPlayerPayload = mockSetDoc.mock.calls[1][1] as Players;
      expect(incomingPlayerPayload.name).toBe("Darwin Núñez");
      expect(incomingPlayerPayload.nation).toBe("");
      expect(incomingPlayerPayload.overall).toBe(0);
      expect(incomingPlayerPayload.age).toBe(0);
      expect(incomingPlayerPayload.salary).toBe(0);
      expect(incomingPlayerPayload.contractTime).toBe(0);

      // Verificação do mapeamento para o formulário
      const mapped = mapPlayerToFormValues(incomingPlayerPayload);
      expect(mapped.overall).toBe("");
      expect(mapped.potential).toBe("");
      expect(mapped.age).toBe("");
      expect(mapped.nation).toBe("");
      expect(mapped.birthDate).toBe("");
      expect(mapped.salary).toBe("");
      expect(mapped.contractUntil).toBe("");
      expect(mapped.playerName).toBe("Darwin Núñez");
      expect(mapped.position).toBe("ATA");
    });
  });

  describe("7. Regra de Momento de Saída - Próxima Janela e Próxima Temporada", () => {
    it("Próxima Janela: jogador sai quando a última partida do mês antecedente é finalizada e o calendário atinge a janela", () => {
      const dateExit = new Date("2024-08-10"); // Venda acordada em Agosto -> Próxima janela é Janeiro (1)

      // Cenário 1: Última partida de Dezembro finalizada em 28/12, sem nenhuma partida após -> NÃO sai
      const matchesScenario1 = [
        {
          id: "m-1",
          status: "FINISHED",
          matchDate: "2024-12-28",
        },
      ];
      expect(
        shouldPlayerLeaveOnNextWindow(
          matchesScenario1 as unknown as Match[],
          dateExit,
        ),
      ).toBe(false);

      // Cenário 2: Última partida de Dezembro finalizada em 28/12 e próxima partida em Janeiro já agendada -> SAI da equipe
      const matchesScenario2 = [
        {
          id: "m-1",
          status: "FINISHED",
          matchDate: "2024-12-28",
        },
        {
          id: "m-2",
          status: "SCHEDULED",
          matchDate: "2025-01-02",
        },
      ];
      expect(
        shouldPlayerLeaveOnNextWindow(
          matchesScenario2 as unknown as Match[],
          dateExit,
        ),
      ).toBe(true);

      // Cenário 2b: Partida em Dezembro ainda pendente (SCHEDULED) -> NÃO sai enquanto o mês antecedente não concluir
      const matchesScenario2b = [
        {
          id: "m-1",
          status: "FINISHED",
          matchDate: "2024-12-28",
        },
        {
          id: "m-2",
          status: "SCHEDULED",
          matchDate: "2024-12-31",
        },
        {
          id: "m-3",
          status: "SCHEDULED",
          matchDate: "2025-01-02",
        },
      ];
      expect(
        shouldPlayerLeaveOnNextWindow(
          matchesScenario2b as unknown as Match[],
          dateExit,
        ),
      ).toBe(false);

      // Cenário 3: Partida após a última de Dezembro finalizada em 01/01 -> SAI da equipe
      const matchesScenario3 = [
        {
          id: "m-1",
          status: "FINISHED",
          matchDate: "2024-12-28",
        },
        {
          id: "m-2",
          status: "FINISHED",
          matchDate: "2025-01-01",
        },
      ];
      expect(
        shouldPlayerLeaveOnNextWindow(
          matchesScenario3 as unknown as Match[],
          dateExit,
        ),
      ).toBe(true);

      // Cenário 4: Mais de uma partida em Dezembro (28/12 e 31/12). A última de Dez é 31/12.
      // Se tiver uma partida finalizada em 02/01 posterior a 31/12 -> SAI
      const matchesScenario4 = [
        {
          id: "m-1",
          status: "FINISHED",
          matchDate: "2024-12-28",
        },
        {
          id: "m-2",
          status: "FINISHED",
          matchDate: "2024-12-31",
        },
        {
          id: "m-3",
          status: "FINISHED",
          matchDate: "2025-01-02",
        },
      ];
      expect(
        shouldPlayerLeaveOnNextWindow(
          matchesScenario4 as unknown as Match[],
          dateExit,
        ),
      ).toBe(true);

      // Cenário Xavi Espart: Venda em Julho (13/07/2026), última partida de Dezembro (31/12/26) FINISHED e jogo de 01/01/27 SCHEDULED -> SAI
      const xaviEspartMatches = [
        {
          status: "FINISHED",
          date: "31/12/26",
          matchesId: "88edff81-3c57-4cbb-aab8-a8af571a990b",
        },
        {
          status: "SCHEDULED",
          date: "01/01/27",
          matchesId: "99edff81-3c57-4cbb-aab8-a8af571a990c",
        },
      ];
      expect(
        shouldPlayerLeaveOnNextWindow(
          xaviEspartMatches as unknown as Match[],
          "2026-07-13T03:00:00.000Z",
        ),
      ).toBe(true);
    });

    it("Próxima Temporada: jogador permanece na temporada corrente (sell = false) e só sai ao criar próxima temporada", async () => {
      const sellerPlayer = player({
        id: "p-stay-season",
        name: "Luka Modric",
        contract: [
          {
            buyValue: 0,
            fromClub: "",
            dataArrival: null,
            leftClub: "Dinamo Zagreb",
            sellValue: 5000000,
            timing: "Próxima Temporada",
          },
        ],
      });

      const season1 = season({
        id: "s-1",
        seasonNumber: 1,
        players: [sellerPlayer],
      });

      const testCareer = career({
        id: "c-1",
        clubData: [season1],
      });
      mockCareer = testCareer;

      await ServiceSeasons.addSeason(testCareer);
      expect(mockWriteBatch).toHaveBeenCalled();
      const updatedPlayerCall = mockBatchSet.mock.calls.find(
        (c) => (c[1] as unknown as { id?: string })?.id === "p-stay-season",
      );
      expect(
        (updatedPlayerCall?.[1] as unknown as { sell?: boolean })?.sell,
      ).toBe(true);
    });
  });

  describe("8. Campo de Data de Saída e Placeholders nos CustomSelect", () => {
    it("timing possui custom-select com opções Imediata, Proxima Janela e Proxima Temporada no buildTransferSections e buildEditTransferFormSections", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: false,
        hasOtherClauses: false,
      };

      const transferSections = buildTransferSections(bools, ["Chelsea"]);
      const timingInTransfer = getField(transferSections[0].fields, "timing");
      expect(timingInTransfer?.inputType).toBe("custom-select");
      expect(timingInTransfer?.options).toEqual([
        "Imediata",
        "Proxima Janela",
        "Proxima Temporada",
      ]);
      expect(timingInTransfer?.orientation).toBeUndefined();

      const editSections = buildEditTransferFormSections(
        "exit",
        "Venda",
        ["Chelsea"],
        undefined,
        undefined,
      );
      const timingInEdit = getField(editSections[1].fields, "timing");
      expect(timingInEdit?.inputType).toBe("custom-select");
      expect(timingInEdit?.options).toEqual([
        "Imediato",
        "Próxima Janela",
        "Próxima Temporada",
      ]);
    });

    it("contém placeholders definidos para Opção de bônus, Emprestar de volta e Taxa de venda futura em buildSaleClausesSections", () => {
      const bools = {
        isRetirement: false,
        isEndContract: false,
        isReturnLoan: false,
        hasInstallments: false,
        hasPlayerSwap: false,
        hasBonus: true,
        hasOtherClauses: true,
      };

      const { bonusSection, otherClausesSection } =
        buildSaleClausesSections(bools);
      const bonusCategoryField = getField(
        bonusSection?.fields,
        "bonusCategory",
      );
      expect(bonusCategoryField?.placeholder).toBe("Selecione o tipo de bônus");

      const loanBackField = getField(
        otherClausesSection?.fields,
        "loanBackDuration",
      );
      expect(loanBackField?.placeholder).toBe("Duração");

      const sellOnField = getField(
        otherClausesSection?.fields,
        "sellOnPercentage",
      );
      expect(sellOnField?.placeholder).toBe("% de venda");
    });
  });

  describe("9. Bônus de conquista: Salvar Bônus, Cards e Regra de Objetivo Atingido", () => {
    it("permite adicionar 'Objetivo atingido' apenas uma vez, bloqueando adições duplicadas", () => {
      const testPlayer = player({ id: "p-bonus-player", name: "Rodrygo" });
      const testSeason = season({
        id: "s-1",
        seasonNumber: 1,
        players: [testPlayer],
      });
      const testCareer = career({ id: "c-1", clubData: [testSeason] });

      clearAllToasts();

      const { result } = renderHook(() =>
        useTransferForm({
          careerId: "c-1",
          season: testSeason,
          career: testCareer,
          player: testPlayer,
          currentPlayers: [testPlayer],
          handleGoBack: vi.fn(),
        }),
      );

      // Adiciona o primeiro Objetivo Atingido
      act(() => {
        result.current.handleCustomInputChange(
          {
            target: { name: "bonusCategory", value: "Objetivo atingido" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("bonusCategory"),
        );
        result.current.handleCustomInputChange(
          {
            target: {
              name: "bonusObjective",
              value: "Classificação para a Champions",
            },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("bonusObjective"),
        );
        result.current.handleCustomInputChange(
          {
            target: { name: "bonusValue", value: "5M" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("bonusValue"),
        );
      });

      act(() => {
        result.current.handleAddOrEditBonus();
      });

      expect(result.current.bonuses).toHaveLength(1);
      expect(result.current.bonuses[0].bonusCategory).toBe("Objetivo atingido");

      // Tenta adicionar um segundo Objetivo Atingido -> deve alertar e não adicionar
      act(() => {
        result.current.handleCustomInputChange(
          {
            target: { name: "bonusCategory", value: "Objetivo atingido" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("bonusCategory"),
        );
        result.current.handleCustomInputChange(
          {
            target: { name: "bonusObjective", value: "Título da Copa" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("bonusObjective"),
        );
        result.current.handleCustomInputChange(
          {
            target: { name: "bonusValue", value: "2M" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("bonusValue"),
        );
      });

      act(() => {
        result.current.handleAddOrEditBonus();
      });

      expect(
        toastStore
          .getSnapshot()
          .some(
            (t) =>
              t.type === "warning" &&
              t.message ===
                "O bônus de 'Objetivo atingido' só pode ser adicionado uma única vez.",
          ),
      ).toBe(true);
      expect(result.current.bonuses).toHaveLength(1);

      // Mas permite adicionar bônus de categoria 'Prêmio' ou 'Desempenho' livremente
      act(() => {
        result.current.handleCustomInputChange(
          {
            target: { name: "bonusCategory", value: "Prêmio" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("bonusCategory"),
        );
        result.current.handleCustomInputChange(
          {
            target: { name: "bonusObjective", value: "Bola de Ouro" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("bonusObjective"),
        );
        result.current.handleCustomInputChange(
          {
            target: { name: "bonusValue", value: "10M" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          mockField("bonusValue"),
        );
      });

      act(() => {
        result.current.handleAddOrEditBonus();
      });

      expect(result.current.bonuses).toHaveLength(2);
      expect(result.current.bonuses[1].bonusCategory).toBe("Prêmio");

      // Edição de bônus
      act(() => {
        result.current.handleEditBonus(1);
      });
      expect(result.current.editingBonusIndex).toBe(1);
      expect(result.current.formValues.bonusObjective).toBe("Bola de Ouro");

      // Exclusão de bônus
      act(() => {
        result.current.handleDeleteBonus(0);
      });
      expect(result.current.bonuses).toHaveLength(1);
      expect(result.current.bonuses[0].name).toBe("Bola de Ouro");
    });
  });

  describe("10. Reversão e Edição Completa de Transferências com Todas as Cláusulas", () => {
    it("ao reverter transferência, reverte tudo incondicionalmente, apagando jogador de troca do Firestore e limpando contratos", async () => {
      const swappedPlayer = player({
        id: "swapped-p1",
        name: "Atleta Trocado",
        buy: true,
        contract: [
          {
            fromClub: "Inter",
            buyValue: 15000000,
            sellValue: 0,
            leftClub: "",
            dataArrival: null,
          },
        ],
      });

      const soldPlayer = player({
        id: "sold-p1",
        name: "Jogador Vendido",
        sell: true,
        contract: [
          {
            leftClub: "Inter",
            sellValue: 40000000,
            buyValue: 0,
            fromClub: "",
            dataArrival: null,
            dataExit: new Date("2024-07-20"),
            swapPlayer: {
              playerId: "swapped-p1",
              playerName: "Atleta Trocado",
              playerValue: 15000000,
            },
            bonuses: [
              {
                id: "b1",
                direction: "receivable",
                category: "objective",
                bonusCategory: "Objetivo atingido",
                name: "Campeão",
                value: 3000000,
                partnerClub: "Inter",
                status: "pending",
              },
            ],
            installments: {
              id: "inst-1",
              status: "pending",
              percentage: 40,
              totalInstallments: 3,
              direction: "receivable",
              partnerClub: "Inter",
              annualInstallmentValue: 5333333,
              firstPaymentSeasonNumber: 2,
              remainingInstallments: 3,
              upfrontValue: 24000000,
            },
          },
        ],
      });

      const testSeason = season({
        id: "s-1",
        seasonNumber: 1,
        players: [soldPlayer, swappedPlayer],
      });
      const testCareer = career({ id: "c-1", clubData: [testSeason] });
      mockCareer = testCareer;

      await PlayersContractService.revertTransferInSeason({
        careerId: "c-1",
        seasonId: "s-1",
        playerId: "sold-p1",
        contractIndex: 0,
        direction: "exit",
      });

      // deleteDoc deve ter sido acionado para o jogador trocado
      expect(mockDeleteDoc).toHaveBeenCalled();

      // applyRevertToCareer localmente também remove o jogador trocado e limpa o contrato
      const revertedCareer = applyRevertToCareer(
        testCareer,
        "s-1",
        "sold-p1",
        0,
        "exit",
      );

      const updatedSeason = revertedCareer.clubData[0];
      expect(
        updatedSeason.players.find((p) => p.id === "swapped-p1"),
      ).toBeUndefined();
      const updatedSold = updatedSeason.players.find((p) => p.id === "sold-p1");
      expect(updatedSold?.sell).toBe(false);
      expect(updatedSold?.contract?.[0].swapPlayer).toBeUndefined();
      expect(updatedSold?.contract?.[0].bonuses).toBeUndefined();
      expect(updatedSold?.contract?.[0].installments).toBeUndefined();
      expect(updatedSold?.contract?.[0].leftClub).toBe("");
    });

    it("ao editar transferência, aplica e persiste todas as alterações de timing, parcelas, bônus e cláusulas", async () => {
      const soldPlayer = player({
        id: "p-edit-all",
        name: "Kylian Mbappé",
        sell: true,
        contract: [
          {
            buyValue: 0,
            fromClub: "",
            dataArrival: null,
            leftClub: "PSG",
            sellValue: 100000000,
            dataExit: new Date("2024-07-15"),
          },
        ],
      });
      const testSeason = season({
        id: "s-1",
        seasonNumber: 1,
        players: [soldPlayer],
      });
      const testCareer = career({ id: "c-1", clubData: [testSeason] });
      mockCareer = testCareer;

      await PlayersContractService.editTransferInSeason({
        careerId: "c-1",
        seasonId: "s-1",
        playerId: "p-edit-all",
        contractIndex: 0,
        direction: "exit",
        transferType: "Venda",
        clubName: "Real Madrid",
        transferValue: "120M",
        date: "20/07",
        timing: "Próxima Temporada",
        installments: {
          id: "inst-2",
          status: "pending",
          percentage: 20,
          totalInstallments: 2,
          direction: "receivable",
          partnerClub: "Real Madrid",
          annualInstallmentValue: 12000000,
          firstPaymentSeasonNumber: 2,
          remainingInstallments: 2,
          upfrontValue: 96000000,
        },
        bonuses: [
          {
            id: "b2",
            direction: "receivable",
            category: "award",
            bonusCategory: "Prêmio",
            name: "Artilheiro",
            value: 5000000,
            partnerClub: "Real Madrid",
            status: "pending",
          },
        ],
      });

      const updatedCareer = applyEditToCareer(
        testCareer,
        "s-1",
        "p-edit-all",
        0,
        "exit",
        {
          clubName: "Real Madrid",
          transferValue: 120000000,
          transferType: "Venda",
          date: new Date("2024-07-20"),
          timing: "Próxima Temporada",
          installments: {
            id: "inst-2",
            status: "pending",
            percentage: 20,
            totalInstallments: 2,
            direction: "receivable",
            partnerClub: "Real Madrid",
            annualInstallmentValue: 12000000,
            firstPaymentSeasonNumber: 2,
            remainingInstallments: 2,
            upfrontValue: 96000000,
          },
        },
      );

      const edSeason = updatedCareer.clubData[0];
      const edPlayer = edSeason.players.find((p) => p.id === "p-edit-all");
      expect(edPlayer?.contract?.[0].leftClub).toBe("Real Madrid");
      expect(edPlayer?.contract?.[0].timing).toBe("Próxima Temporada");
      expect(edPlayer?.contract?.[0].installments?.percentage).toBe(20);
      expect(edPlayer?.sell).toBe(false); // Porque o timing é Próxima Temporada
    });
  });

  describe("11. Modal de Transferências e Filtragem por Timing de Saída Real", () => {
    it("retorna false se o contrato não possuir leftClub preenchido", () => {
      const p = player({ sell: true });
      const c = {
        leftClub: "",
        sellValue: 0,
        fromClub: "",
        buyValue: 0,
        dataArrival: null,
      };
      expect(isPlayerActuallyDeparted(p, c)).toBe(false);
    });

    it("retorna false para timing 'Próxima Temporada' independentemente das partidas disputadas", () => {
      const p = player({ id: "p-next-season", sell: false });
      const c = {
        leftClub: "Chelsea",
        timing: "Próxima Temporada" as const,
        sellValue: 50000000,
        fromClub: "",
        buyValue: 0,
        dataArrival: null,
      };
      expect(isPlayerActuallyDeparted(p, c)).toBe(false);
      expect(
        isPlayerActuallyDeparted(p, c, [{ id: "m1" }] as unknown as Match[]),
      ).toBe(false);
    });

    it("retorna false para timing 'Próxima Janela' no primeiro turno da temporada", () => {
      const p = player({ id: "p-next-window", sell: false });
      const c = {
        leftClub: "Arsenal",
        timing: "Próxima Janela" as const,
        sellValue: 40000000,
        fromClub: "",
        buyValue: 0,
        dataArrival: null,
      };
      const firstHalfMatches = [
        { id: "m1", round: "1" },
        { id: "m2", round: "2" },
      ] as unknown as Match[];
      expect(isPlayerActuallyDeparted(p, c, firstHalfMatches)).toBe(false);
    });

    it("retorna true para timing 'Próxima Janela' quando a temporada já atingiu a janela de inverno", () => {
      const p = player({ id: "p-next-window-departed", sell: true });
      const c = {
        leftClub: "Arsenal",
        timing: "Próxima Janela" as const,
        sellValue: 40000000,
        fromClub: "",
        buyValue: 0,
        dataArrival: null,
      };
      const matches = Array.from({ length: 38 }, (_, i) => ({
        id: `m-${i + 1}`,
        round: String(i + 1),
      })) as unknown as Match[];
      expect(isPlayerActuallyDeparted(p, c, matches)).toBe(true);
    });

    it("retorna true para timing 'Imediato' com sell: true ou loan: true", () => {
      const pSold = player({ id: "p-sold-now", sell: true });
      const cSold = {
        leftClub: "Liverpool",
        timing: "Imediato" as const,
        sellValue: 30000000,
        fromClub: "",
        buyValue: 0,
        dataArrival: null,
      };
      expect(isPlayerActuallyDeparted(pSold, cSold)).toBe(true);

      const pLoaned = player({ id: "p-loaned-now", loan: true });
      const cLoaned = {
        leftClub: "Porto",
        timing: "Imediato" as const,
        sellValue: 0,
        fromClub: "",
        buyValue: 0,
        dataArrival: null,
      };
      expect(isPlayerActuallyDeparted(pLoaned, cLoaned)).toBe(true);
    });

    it("retorna false para timing 'Imediato' se o atleta ainda não teve sell/loan ativados", () => {
      const pPending = player({ id: "p-pending", sell: false, loan: false });
      const cPending = {
        leftClub: "Liverpool",
        timing: "Imediato" as const,
        sellValue: 30000000,
        fromClub: "",
        buyValue: 0,
        dataArrival: null,
      };
      expect(isPlayerActuallyDeparted(pPending, cPending)).toBe(false);
    });

    it("trata todas as variações de acentuação ('Próxima Janela', 'Proxima janela', 'Proxima Janela') de forma consistente", () => {
      const p = player({ id: "p-accent-test", sell: false });
      const variations = [
        "Próxima Janela",
        "Proxima janela",
        "Proxima Janela",
      ] as const;
      for (const timingVar of variations) {
        const c = {
          leftClub: "Sevilla",
          timing: timingVar,
          sellValue: 20000000,
          fromClub: "",
          buyValue: 0,
          dataArrival: null,
        };
        // Sem partidas suficientes, nenhuma variação deve reportar departed
        expect(isPlayerActuallyDeparted(p, c, [])).toBe(false);
      }
    });
  });

  describe("Empréstimo com Opção de Compra (Loan with Buy Option)", () => {
    it("buildEditTransferFormSections inclui seção 'Opção de Compra' para saídas de empréstimo", () => {
      const loanContract = {
        buyValue: 0,
        sellValue: 0,
        fromClub: "",
        leftClub: "Real Sociedad",
        dataArrival: null,
        dataExit: new Date("2024-07-15"),
        isLoan: true,
        loanDuration: 1,
        wagePercentage: 50,
      };

      const sections = buildEditTransferFormSections(
        "exit",
        "Emprestar",
        ["Real Sociedad"],
        loanContract,
        undefined,
        { hasBuyOption: true },
      );

      const buyOptionSection = sections.find(
        (s) => s.title === "Opção de Compra",
      );
      expect(buyOptionSection).toBeDefined();

      const hasBuyOptionField = getField(buyOptionSection?.fields, "hasBuyOption");
      expect(hasBuyOptionField).toBeDefined();

      const buyOptionField = getField(buyOptionSection?.fields, "buyOption");
      expect(buyOptionField).toBeDefined();

      const sellOnField = getField(buyOptionSection?.fields, "sellOnPercentage");
      expect(sellOnField).toBeDefined();
    });

    it("exerciseLoanBuyOption atualiza flags do atleta, marca empréstimo como exercido e cria contrato de venda vinculado", async () => {
      const p = player({
        id: "p-loan-exercise",
        loan: true,
        sell: false,
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "",
            leftClub: "Real Sociedad",
            dataArrival: null,
            dataExit: new Date("2024-07-15"),
            isLoan: true,
            loanDuration: 1,
            wagePercentage: 50,
            buyOptionValue: 15000000,
            loanTerms: {
              durationYears: 1,
              ourWagePercentage: 50,
              theirWagePercentage: 50,
              hasBuyOption: true,
              buyOptionFee: 15000000,
              sellOnPercentage: 10,
              partnerClub: "Real Sociedad",
            },
          },
        ],
      });

      const s = season({
        id: "season-1",
        seasonNumber: 1,
        players: [p],
      });

      mockCareer = career({
        id: "c1",
        clubData: [s],
      });

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => p,
      });

      await PlayersContractService.exerciseLoanBuyOption(
        "c1",
        "season-1",
        "p-loan-exercise",
        0,
        "25/08",
      );

      expect(mockSetDoc).toHaveBeenCalled();
      const savedPlayerCall = mockSetDoc.mock.calls.find(
        (call) => (call[1] as Players)?.id === "p-loan-sync",
      );
      const savedPlayer = (savedPlayerCall ? savedPlayerCall[1] : mockSetDoc.mock.calls[0][1]) as Players;

      // Flags do jogador: sell vira true, loan vira false
      expect(savedPlayer.sell).toBe(true);
      expect(savedPlayer.loan).toBe(false);

      // Contrato de empréstimo original marcado como exercido
      const loanContract = savedPlayer.contract![0];
      expect(loanContract.loanTerms?.buyOptionExercised).toBe(true);
      expect(loanContract.loanTerms?.exercisedDate).toBe("25/08");

      // Contrato derivado de venda criado
      expect(savedPlayer.contract!.length).toBe(2);
      const derivedSale = savedPlayer.contract![1];
      expect(derivedSale.fromLoanBuyOption).toBe(true);
      expect(derivedSale.sourceLoanContractIndex).toBe(0);
      expect(derivedSale.sellValue).toBe(15000000);
      expect(derivedSale.leftClub).toBe("Real Sociedad");
      expect(derivedSale.transferClauses?.sellOnPercentage).toBe(10);
    });

    it("editTransferInSeason sincroniza o contrato derivado de venda e mantém sell=true ao editar empréstimo exercido", async () => {
      const p = player({
        id: "p-loan-sync",
        loan: false,
        sell: true,
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "",
            leftClub: "Real Sociedad",
            dataArrival: null,
            dataExit: new Date("2024-07-15"),
            isLoan: true,
            loanDuration: 1,
            wagePercentage: 50,
            buyOptionValue: 15000000,
            loanTerms: {
              durationYears: 1,
              ourWagePercentage: 50,
              theirWagePercentage: 50,
              hasBuyOption: true,
              buyOptionFee: 15000000,
              buyOptionExercised: true,
              exercisedDate: "25/08",
              sellOnPercentage: 10,
              partnerClub: "Real Sociedad",
            },
          },
          {
            buyValue: 0,
            sellValue: 15000000,
            fromClub: "",
            leftClub: "Real Sociedad",
            dataArrival: null,
            dataExit: new Date("2024-08-25"),
            isLoan: false,
            fromLoanBuyOption: true,
            sourceLoanContractIndex: 0,
            transferClauses: {
              sellOnPercentage: 10,
              partnerClub: "Real Sociedad",
              status: "pending",
            },
          },
        ],
      });

      const s = season({
        id: "season-1",
        seasonNumber: 1,
        players: [p],
      });

      mockCareer = career({
        id: "c1",
        clubData: [s],
      });

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => p,
      });

      // Altera a opção de 15M para 20M e a porcentagem de 10% para 20%
      await PlayersContractService.editTransferInSeason({
        careerId: "c1",
        seasonId: "season-1",
        playerId: "p-loan-sync",
        contractIndex: 0,
        direction: "exit",
        transferType: "Emprestar",
        clubName: "Real Sociedad",
        transferValue: "0",
        date: "15/07",
        loanDuration: "1",
        wagePercentage: "50",
        buyOptionValue: "20m",
        loanTerms: {
          durationYears: 1,
          ourWagePercentage: 50,
          theirWagePercentage: 50,
          hasBuyOption: true,
          buyOptionFee: 20000000,
          sellOnPercentage: 20,
          partnerClub: "Real Sociedad",
        },
      });

      expect(mockSetDoc).toHaveBeenCalled();
      const savedPlayerCall = mockSetDoc.mock.calls.find(
        (call) => (call[1] as Players)?.id === "p-loan-sync",
      );
      const savedPlayer = (savedPlayerCall ? savedPlayerCall[1] : mockSetDoc.mock.calls[0][1]) as Players;

      // Mantém sell=true e loan=false
      expect(savedPlayer.sell).toBe(true);
      expect(savedPlayer.loan).toBe(false);

      // Empréstimo com nova taxa
      const loanContract = savedPlayer.contract![0];
      expect(loanContract.buyOptionValue).toBe(20000000);
      expect(loanContract.loanTerms?.buyOptionFee).toBe(20000000);
      expect(loanContract.loanTerms?.buyOptionExercised).toBe(true);

      // Contrato derivado sincronizado com novo valor e nova cláusula
      const derivedSale = savedPlayer.contract![1];
      expect(derivedSale.fromLoanBuyOption).toBe(true);
      expect(derivedSale.sellValue).toBe(20000000);
      expect(derivedSale.transferClauses?.sellOnPercentage).toBe(20);
    });

    it("revertTransferInSeason remove o contrato derivado de venda e limpa o empréstimo", async () => {
      const p = player({
        id: "p-loan-revert",
        loan: false,
        sell: true,
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "",
            leftClub: "Real Sociedad",
            dataArrival: null,
            dataExit: new Date("2024-07-15"),
            isLoan: true,
            loanDuration: 1,
            wagePercentage: 50,
            buyOptionValue: 15000000,
            loanTerms: {
              durationYears: 1,
              ourWagePercentage: 50,
              theirWagePercentage: 50,
              hasBuyOption: true,
              buyOptionFee: 15000000,
              buyOptionExercised: true,
              exercisedDate: "25/08",
              partnerClub: "Real Sociedad",
            },
          },
          {
            buyValue: 0,
            sellValue: 15000000,
            fromClub: "",
            leftClub: "Real Sociedad",
            dataArrival: null,
            dataExit: new Date("2024-08-25"),
            isLoan: false,
            fromLoanBuyOption: true,
            sourceLoanContractIndex: 0,
          },
        ],
      });

      const s = season({
        id: "season-1",
        seasonNumber: 1,
        players: [p],
      });

      mockCareer = career({
        id: "c1",
        clubData: [s],
      });

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => p,
      });

      await PlayersContractService.revertTransferInSeason({
        careerId: "c1",
        seasonId: "season-1",
        playerId: "p-loan-revert",
        contractIndex: 0,
        direction: "exit",
      });

      expect(mockSetDoc).toHaveBeenCalled();
      const savedPlayerCall = mockSetDoc.mock.calls.find(
        (call) => (call[1] as Players)?.id === "p-loan-sync",
      );
      const savedPlayer = (savedPlayerCall ? savedPlayerCall[1] : mockSetDoc.mock.calls[0][1]) as Players;

      expect(savedPlayer.sell).toBe(false);
      expect(savedPlayer.loan).toBe(false);

      // Contrato derivado removido
      expect(savedPlayer.contract?.some((c) => c.fromLoanBuyOption)).toBe(false);
    });

    it("exerciseLoanBuyOption e exerciseArrivalLoanBuyOption rejeitam empréstimos sem opção de compra definida", async () => {
      const pNoOption = player({
        id: "p-barca-no-option",
        name: "Ansu Fati",
        loan: true,
        sell: false,
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "FC Barcelona",
            leftClub: "AS Monaco",
            dataArrival: new Date("2024-07-01"),
            dataExit: new Date("2024-07-15"),
            isLoan: true,
            loanDuration: 1,
            wagePercentage: 50,
            loanTerms: {
              durationYears: 1,
              ourWagePercentage: 50,
              theirWagePercentage: 50,
              hasBuyOption: false,
              partnerClub: "AS Monaco",
            },
          },
        ],
      });

      const s = season({
        id: "season-1",
        seasonNumber: 1,
        players: [pNoOption],
      });

      mockCareer = career({
        id: "c1",
        clubData: [s],
      });

      await expect(
        PlayersContractService.exerciseLoanBuyOption(
          "c1",
          "season-1",
          "p-barca-no-option",
          0,
          "25/08",
        ),
      ).rejects.toThrow("Este empréstimo não possui opção de compra definida.");

      await expect(
        PlayersContractService.exerciseArrivalLoanBuyOption(
          "c1",
          "season-1",
          "p-barca-no-option",
          0,
        ),
      ).rejects.toThrow("Este empréstimo não possui opção de compra definida.");

      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });
});
