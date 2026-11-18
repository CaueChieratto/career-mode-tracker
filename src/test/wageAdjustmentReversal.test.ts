import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { player, season, career } from "./factories/domain";

vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: {
    currentUser: { uid: "user-test" },
  },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  arrayUnion: vi.fn(),
  getDocsFromServer: vi.fn().mockResolvedValue({ docs: [] }),
  collection: vi.fn(),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/services/ServicePlayers/helpers/authHelpers", () => ({
  requireAuth: () => ({ uid: "user-test" }),
}));

const mockGetCareerById = vi.fn();
vi.mock("../common/helpers/Getters", () => ({
  getCareerById: (...args: unknown[]) => mockGetCareerById(...args),
}));

describe("Reversão e Aplicação de Ajustes Salariais Automáticos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aplica reajuste salarial (+10%) salvando preAdjustmentSalary e novo salário", async () => {
    const playerWithRenewal = player({
      id: "p1",
      name: "Atleta Teste",
      salary: 200000,
      contractTime: 3,
      contract: [
        {
          isRenewal: true,
          salary: 200000,
          previousSalary: 50000, // Salário antes de renovar
          contractTime: 3,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 10,
              targetObjective: "Título de Liga",
              status: "pending",
              applied: false,
            },
          },
        },
      ],
    });

    const seasonData = season({
      id: "s1",
      seasonNumber: 1,
      players: [playerWithRenewal],
    });

    const careerData = career({
      id: "c1",
      clubData: [seasonData],
    });

    mockGetCareerById.mockResolvedValue(careerData);

    const newSalary = await PlayersContractService.applyRenewalWageAdjustment(
      "c1",
      "s1",
      "p1",
      0,
    );

    // 200.000 + 10% = 220.000
    expect(newSalary).toBe(220000);
    expect(playerWithRenewal.salary).toBe(220000);
    expect(playerWithRenewal.contract[0].salary).toBe(220000);

    const wageAdj = playerWithRenewal.contract[0].contractClauses?.wageAdjustment;
    expect(wageAdj?.applied).toBe(true);
    expect(wageAdj?.status).toBe("paid");
    expect(wageAdj?.preAdjustmentSalary).toBe(200000);
  });

  it("reverte reajuste salarial de aumento (+10%) restaurando o salário renovado e NÃO o previousSalary antigo", async () => {
    const playerWithAppliedAdjustment = player({
      id: "p1",
      name: "Atleta Teste",
      salary: 220000,
      contractTime: 3,
      contract: [
        {
          isRenewal: true,
          salary: 220000,
          previousSalary: 50000, // Salário de anos atrás (pré-renovação)
          contractTime: 3,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 10,
              targetObjective: "Título de Liga",
              status: "paid",
              applied: true,
              preAdjustmentSalary: 200000, // Salário correto antes do reajuste
            },
          },
        },
      ],
    });

    const seasonData = season({
      id: "s1",
      seasonNumber: 1,
      players: [playerWithAppliedAdjustment],
    });

    const careerData = career({
      id: "c1",
      clubData: [seasonData],
    });

    mockGetCareerById.mockResolvedValue(careerData);

    const revertedSalary = await PlayersContractService.revertRenewalWageAdjustment(
      "c1",
      "s1",
      "p1",
      0,
    );

    // DEVE restaurar 200.000, NUNCA 50.000 (previousSalary da renovação)
    expect(revertedSalary).toBe(200000);
    expect(playerWithAppliedAdjustment.salary).toBe(200000);
    expect(playerWithAppliedAdjustment.contract[0].salary).toBe(200000);

    const wageAdj = playerWithAppliedAdjustment.contract[0].contractClauses?.wageAdjustment;
    expect(wageAdj?.applied).toBe(false);
    expect(wageAdj?.status).toBe("pending");
    expect(wageAdj?.preAdjustmentSalary).toBeUndefined();
    // contract.previousSalary deve permanecer intacto para o histórico da renovação
    expect(playerWithAppliedAdjustment.contract[0].previousSalary).toBe(50000);
  });

  it("reverte reajuste salarial de redução (-15%) restaurando o salário correto", async () => {
    // Ex: Salário renovado era 100.000. Caiu para 85.000 por cláusula de redução.
    const playerWithPenalty = player({
      id: "p2",
      name: "Atleta Penalizado",
      salary: 85000,
      contractTime: 2,
      contract: [
        {
          isRenewal: true,
          salary: 85000,
          previousSalary: 30000,
          contractTime: 2,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Diminuir",
              percentage: 15,
              targetObjective: "Rebaixamento evitado",
              status: "paid",
              applied: true,
              preAdjustmentSalary: 100000,
            },
          },
        },
      ],
    });

    const seasonData = season({
      id: "s1",
      seasonNumber: 1,
      players: [playerWithPenalty],
    });

    const careerData = career({
      id: "c1",
      clubData: [seasonData],
    });

    mockGetCareerById.mockResolvedValue(careerData);

    const restoredSalary = await PlayersContractService.revertRenewalWageAdjustment(
      "c1",
      "s1",
      "p2",
      0,
    );

    // Ao reverter redução de 15%, volta para 100.000 (e não para 30.000)
    expect(restoredSalary).toBe(100000);
    expect(playerWithPenalty.salary).toBe(100000);
    expect(playerWithPenalty.contract[0].salary).toBe(100000);
  });

  it("quando preAdjustmentSalary estiver ausente (legado), reverte via fator matemático seguro sem cair no previousSalary", async () => {
    // 100.000 + 10% = 110.000, sem preAdjustmentSalary previamente salvo
    const legacyPlayer = player({
      id: "p3",
      name: "Atleta Legado",
      salary: 110000,
      contractTime: 2,
      contract: [
        {
          isRenewal: true,
          salary: 110000,
          previousSalary: 40000, // Não deve ser usado como salário revertido!
          contractTime: 2,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 10,
              targetObjective: "G4",
              status: "applied",
              applied: true,
              // preAdjustmentSalary omitido intencionalmente
            },
          },
        },
      ],
    });

    const seasonData = season({
      id: "s1",
      seasonNumber: 1,
      players: [legacyPlayer],
    });

    const careerData = career({
      id: "c1",
      clubData: [seasonData],
    });

    mockGetCareerById.mockResolvedValue(careerData);

    const revertedSalary = await PlayersContractService.revertRenewalWageAdjustment(
      "c1",
      "s1",
      "p3",
      0,
    );

    // 110.000 / 1.1 = 100.000
    expect(revertedSalary).toBe(100000);
    expect(legacyPlayer.salary).toBe(100000);
    expect(legacyPlayer.contract[0].previousSalary).toBe(40000);
  });

  it("não corrompe o salário ativo do jogador quando contractIndex não é o último contrato", async () => {
    const playerWithMultipleContracts = player({
      id: "p4",
      name: "Atleta Multicontratos",
      salary: 300000, // Salário ativo do contrato mais recente (index 1)
      contractTime: 4,
      contract: [
        {
          // Contrato antigo (index 0) com ajuste salarial residual
          isRenewal: true,
          salary: 110000,
          contractTime: 2,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2023-01-01"),
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 10,
              targetObjective: "Objetivo Antigo",
              status: "applied",
              applied: true,
              preAdjustmentSalary: 100000,
            },
          },
        },
        {
          // Contrato atual mais recente (index 1)
          isRenewal: true,
          salary: 300000,
          contractTime: 4,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
        },
      ],
    });

    const seasonData = season({
      id: "s1",
      seasonNumber: 1,
      players: [playerWithMultipleContracts],
    });

    const careerData = career({
      id: "c1",
      clubData: [seasonData],
    });

    mockGetCareerById.mockResolvedValue(careerData);

    // Reverte o contrato no índice 0
    const reverted = await PlayersContractService.revertRenewalWageAdjustment(
      "c1",
      "s1",
      "p4",
      0,
    );

    expect(reverted).toBe(100000);
    expect(playerWithMultipleContracts.contract[0].salary).toBe(100000);
    // Salário no nível raiz do jogador deve continuar sendo 300.000 do contrato atual!
    expect(playerWithMultipleContracts.salary).toBe(300000);
  });

  it("garante idempotência em chamadas repetidas de aplicação e reversão", async () => {
    const testPlayer = player({
      id: "p5",
      name: "Atleta Idempotência",
      salary: 200000,
      contractTime: 3,
      contract: [
        {
          isRenewal: true,
          salary: 200000,
          previousSalary: 50000,
          contractTime: 3,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 10,
              targetObjective: "Título",
              status: "pending",
              applied: false,
            },
          },
        },
      ],
    });

    const seasonData = season({
      id: "s1",
      seasonNumber: 1,
      players: [testPlayer],
    });

    const careerData = career({
      id: "c1",
      clubData: [seasonData],
    });

    mockGetCareerById.mockResolvedValue(careerData);

    // 1ª Aplicação: 200.000 -> 220.000
    const firstApply = await PlayersContractService.applyRenewalWageAdjustment("c1", "s1", "p5", 0);
    expect(firstApply).toBe(220000);
    expect(testPlayer.salary).toBe(220000);

    // 2ª Aplicação: não duplica (+10% sobre 220k não ocorre)
    const secondApply = await PlayersContractService.applyRenewalWageAdjustment("c1", "s1", "p5", 0);
    expect(secondApply).toBe(220000);
    expect(testPlayer.salary).toBe(220000);

    // 1ª Reversão: 220.000 -> 200.000
    const firstRevert = await PlayersContractService.revertRenewalWageAdjustment("c1", "s1", "p5", 0);
    expect(firstRevert).toBe(200000);
    expect(testPlayer.salary).toBe(200000);

    // 2ª Reversão: não divide novamente
    const secondRevert = await PlayersContractService.revertRenewalWageAdjustment("c1", "s1", "p5", 0);
    expect(secondRevert).toBe(200000);
    expect(testPlayer.salary).toBe(200000);
  });

  it("restaura valor exato quando preAdjustmentSalary estiver salvo, sem arredondamentos imperfeitos", async () => {
    const oddSalary = 195433;
    const testPlayer = player({
      id: "p6",
      name: "Atleta Salário Ímpar",
      salary: oddSalary,
      contractTime: 3,
      contract: [
        {
          isRenewal: true,
          salary: oddSalary,
          contractTime: 3,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 15,
              targetObjective: "Libertadores",
              status: "pending",
              applied: false,
            },
          },
        },
      ],
    });

    const seasonData = season({
      id: "s1",
      seasonNumber: 1,
      players: [testPlayer],
    });

    const careerData = career({
      id: "c1",
      clubData: [seasonData],
    });

    mockGetCareerById.mockResolvedValue(careerData);

    await PlayersContractService.applyRenewalWageAdjustment("c1", "s1", "p6", 0);
    expect(testPlayer.contract[0].contractClauses?.wageAdjustment?.preAdjustmentSalary).toBe(oddSalary);

    const reverted = await PlayersContractService.revertRenewalWageAdjustment("c1", "s1", "p6", 0);
    expect(reverted).toBe(oddSalary);
    expect(testPlayer.salary).toBe(oddSalary);
  });

  it("garante preservação perfeita do valor idêntico ao reverter e aplicar novamente (+15%), inclusive após salvar cláusulas no drawer", async () => {
    const lamineSalary = 185000;
    const lamineYamal = player({
      id: "p-lamine",
      name: "Lamine Yamal",
      salary: lamineSalary,
      contractTime: 3,
      contract: [
        {
          isRenewal: true,
          salary: lamineSalary,
          contractTime: 3,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          contractDetails: {
            weeklyWage: lamineSalary,
            durationYears: 3,
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 15,
              targetObjective: "Título de La Liga",
              status: "pending",
              applied: false,
              baseSalary: lamineSalary,
            },
          },
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Aumentar",
              percentage: 15,
              targetObjective: "Título de La Liga",
              status: "pending",
              applied: false,
              baseSalary: lamineSalary,
            },
          },
        },
      ],
    });

    const seasonData = season({
      id: "s1",
      seasonNumber: 1,
      players: [lamineYamal],
    });

    const careerData = career({
      id: "c1",
      clubData: [seasonData],
    });

    mockGetCareerById.mockResolvedValue(careerData);

    // 1. Aplica o reajuste salarial (+15% de 185.000 = 212.750)
    const appliedSalary1 = await PlayersContractService.applyRenewalWageAdjustment(
      "c1",
      "s1",
      "p-lamine",
      0,
    );
    expect(appliedSalary1).toBe(212750);
    expect(lamineYamal.salary).toBe(212750);
    expect(lamineYamal.contract[0].salary).toBe(212750);
    expect(lamineYamal.contract[0].contractClauses?.wageAdjustment?.baseSalary).toBe(185000);
    expect(lamineYamal.contract[0].contractClauses?.wageAdjustment?.applied).toBe(true);

    // 2. Reverte o reajuste salarial (deve restaurar para 185.000)
    const revertedSalary1 = await PlayersContractService.revertRenewalWageAdjustment(
      "c1",
      "s1",
      "p-lamine",
      0,
    );
    expect(revertedSalary1).toBe(185000);
    expect(lamineYamal.salary).toBe(185000);
    expect(lamineYamal.contract[0].salary).toBe(185000);
    expect(lamineYamal.contract[0].contractClauses?.wageAdjustment?.baseSalary).toBe(185000);
    expect(lamineYamal.contract[0].contractClauses?.wageAdjustment?.applied).toBe(false);

    // 3. Simula salvamento das cláusulas no drawer (updateRenewalClauses) após reverter
    await PlayersContractService.updateRenewalClauses({
      careerId: "c1",
      seasonId: "s1",
      playerId: "p-lamine",
      contractIndex: 0,
      salary: "185k",
      wageAdjustment: {
        enabled: true,
        direction: "Aumentar",
        percentage: 15,
        targetObjective: "Título de La Liga",
        status: "pending",
        applied: false,
        baseSalary: 185000,
      },
    });

    // 4. Aplica novamente o reajuste salarial: DEVE ser exatamente 212.750 idêntico
    const appliedSalary2 = await PlayersContractService.applyRenewalWageAdjustment(
      "c1",
      "s1",
      "p-lamine",
      0,
    );
    expect(appliedSalary2).toBe(212750);
    expect(lamineYamal.salary).toBe(212750);
    expect(lamineYamal.contract[0].salary).toBe(212750);
    expect(appliedSalary2).toBe(appliedSalary1);

    // 5. Reverte novamente: volta para 185.000
    const revertedSalary2 = await PlayersContractService.revertRenewalWageAdjustment(
      "c1",
      "s1",
      "p-lamine",
      0,
    );
    expect(revertedSalary2).toBe(185000);
    expect(lamineYamal.salary).toBe(185000);
  });

  it("garante preservação perfeita do valor idêntico ao reverter e aplicar novamente com redução (-15%)", async () => {
    const pedriSalary = 100000;
    const pedriPlayer = player({
      id: "p-pedri",
      name: "Pedri",
      salary: pedriSalary,
      contractTime: 2,
      contract: [
        {
          isRenewal: true,
          salary: pedriSalary,
          contractTime: 2,
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "",
          dataArrival: new Date("2024-01-01"),
          contractDetails: {
            weeklyWage: pedriSalary,
            durationYears: 2,
            wageAdjustment: {
              enabled: true,
              direction: "Diminuir",
              percentage: 15,
              targetObjective: "Permanência",
              status: "pending",
              applied: false,
              baseSalary: pedriSalary,
            },
          },
          contractClauses: {
            wageAdjustment: {
              enabled: true,
              direction: "Diminuir",
              percentage: 15,
              targetObjective: "Permanência",
              status: "pending",
              applied: false,
              baseSalary: pedriSalary,
            },
          },
        },
      ],
    });

    const seasonData = season({
      id: "s1",
      seasonNumber: 1,
      players: [pedriPlayer],
    });

    const careerData = career({
      id: "c1",
      clubData: [seasonData],
    });

    mockGetCareerById.mockResolvedValue(careerData);

    // 1. Aplica redução (-15% de 100.000 = 85.000)
    const appliedSalary1 = await PlayersContractService.applyRenewalWageAdjustment(
      "c1",
      "s1",
      "p-pedri",
      0,
    );
    expect(appliedSalary1).toBe(85000);
    expect(pedriPlayer.salary).toBe(85000);

    // 2. Reverte redução (volta para 100.000)
    const revertedSalary1 = await PlayersContractService.revertRenewalWageAdjustment(
      "c1",
      "s1",
      "p-pedri",
      0,
    );
    expect(revertedSalary1).toBe(100000);
    expect(pedriPlayer.salary).toBe(100000);

    // 3. Aplica novamente a redução: volta exatamente para 85.000
    const appliedSalary2 = await PlayersContractService.applyRenewalWageAdjustment(
      "c1",
      "s1",
      "p-pedri",
      0,
    );
    expect(appliedSalary2).toBe(85000);
    expect(pedriPlayer.salary).toBe(85000);
    expect(appliedSalary2).toBe(appliedSalary1);
  });
});
