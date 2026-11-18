import { describe, expect, it } from "vitest";
import { ServiceFinance } from "../../src/common/services/ServiceFinance";
import { career, player, season } from "../../src/test/factories/domain";
import { careerPath, read, seedCareer } from "./helpers";
import { Match } from "../../src/common/interfaces/Match";
import { ClubData } from "../../src/common/interfaces/club/clubData";
import { Career } from "../../src/common/interfaces/Career";

describe("Integração: Persistência de Despesas Salariais e Ajuste Manual no Firestore Emulator", () => {
  const barcaCareer = (): Career =>
    career({
      id: "c_barca_finance",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      currency: "€",
      nation: "ESP",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      clubData: [],
    });

  it("executa o fluxo completo: contabilização -> edição manual -> Firestore Emulator -> limpeza de localStorage -> recuperação -> nova partida", async () => {
    const careerObj = barcaCareer();
    const careerId = careerObj.id;
    const seasonId = "s_2026_2027";
    const salaryEntryId = `salary_season_${seasonId}`;

    // Atleta com 700.000/semana (exatamente 100.000/dia)
    const pedri = player({
      id: "pedri_8",
      name: "Pedri",
      salary: 700000,
      contract: [
        {
          salary: 700000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01T00:00:00.000Z"),
        },
      ],
    });

    // Partida 1: 09/10/2026 -> exatamente 100 dias desde 01/07 = 10.000.000
    const match1: Match = {
      matchesId: "match_fcb_p1",
      date: "09/10/2026",
      league: "La Liga",
      homeTeam: "FC Barcelona",
      awayTeam: "Sevilla FC",
      homeScore: 3,
      awayScore: 0,
      result: "V",
      status: "FINISHED",
    };

    const seasonData: ClubData = season({
      id: seasonId,
      seasonNumber: 1,
      players: [pedri],
      matches: [match1],
    });

    careerObj.clubData = [seasonData];
    await seedCareer(careerObj);

    // 1. Contabilizar uma despesa salarial inicial sincronizando com o Firestore Emulator
    const syncedReport = await ServiceFinance.syncReconciledReport(
      careerId,
      seasonId,
      seasonData,
      false,
      careerObj,
    );

    expect(syncedReport).not.toBeNull();
    const initialSalary = syncedReport?.entries.find((e) => e.id === salaryEntryId);
    expect(initialSalary).toBeDefined();
    expect(initialSalary?.amount).toBe(10000000);
    expect(initialSalary?.calculatedAmount).toBe(10000000);
    expect(initialSalary?.manualAdjustment).toBeUndefined();

    // 2. Corrigir manualmente o valor total na tela "+ Nova Movimentação" de 10M para 12M
    const updatedSalary = await ServiceFinance.updateEntry(
      careerId,
      seasonId,
      salaryEntryId,
      { amount: 12000000 },
    );

    expect(updatedSalary.amount).toBe(12000000);
    expect(updatedSalary.calculatedAmount).toBe(10000000);
    expect(updatedSalary.manualAdjustment).toBe(2000000);

    // 3. Confirmar a gravação física de manualAdjustment no Firestore Emulator
    const reportPathInFirestore = `${careerPath(careerId)}/seasons/${seasonId}/finance/report`;
    const firestoreSnapshot = (await read(reportPathInFirestore)) as {
      entries?: Array<{
        id: string;
        amount: number;
        calculatedAmount: number;
        manualAdjustment: number;
        source: string;
      }>;
    };

    expect(firestoreSnapshot).toBeDefined();
    expect(firestoreSnapshot?.entries).toBeDefined();
    const firestoreEntry = firestoreSnapshot.entries?.find((e) => e.id === salaryEntryId);
    expect(firestoreEntry).toBeDefined();
    expect(firestoreEntry?.amount).toBe(12000000);
    expect(firestoreEntry?.calculatedAmount).toBe(10000000);
    expect(firestoreEntry?.manualAdjustment).toBe(2000000);
    expect(firestoreEntry?.source).toBe("salary");

    // 4. Limpar o localStorage simulando novo dispositivo, reload ou fechamento de aba
    localStorage.clear();
    expect(localStorage.getItem(`finance_report_${careerId}_${seasonId}`)).toBeNull();

    // 5. Recuperar o relatório financeiro do Firestore
    const recoveredReport = await ServiceFinance.getReportBySeason(
      careerId,
      seasonId,
      1,
      seasonData,
      careerObj,
    );

    // 6. Confirmar que a correção manual permanece integralmente após ler do Firestore
    const recoveredSalary = recoveredReport.entries.find((e) => e.id === salaryEntryId);
    expect(recoveredSalary).toBeDefined();
    expect(recoveredSalary?.amount).toBe(12000000);
    expect(recoveredSalary?.calculatedAmount).toBe(10000000);
    expect(recoveredSalary?.manualAdjustment).toBe(2000000);

    // 7. Finalizar uma nova partida 10 dias depois (19/10/2026 -> +1.000.000)
    const match2: Match = {
      matchesId: "match_fcb_p2",
      date: "19/10/2026",
      league: "La Liga",
      homeTeam: "Valencia CF",
      awayTeam: "FC Barcelona",
      homeScore: 1,
      awayScore: 2,
      result: "V",
      status: "FINISHED",
    };

    const seasonDataWithMatch2: ClubData = {
      ...seasonData,
      matches: [match1, match2],
    };

    // 8. Reconciliar após a nova partida e confirmar que somente a nova despesa é acrescentada (12M + 1M = 13M)
    const reportAfterMatch2 = await ServiceFinance.getReportBySeason(
      careerId,
      seasonId,
      1,
      seasonDataWithMatch2,
      careerObj,
    );

    const salaryAfterMatch2 = reportAfterMatch2.entries.find((e) => e.id === salaryEntryId);
    expect(salaryAfterMatch2).toBeDefined();
    expect(salaryAfterMatch2?.calculatedAmount).toBe(11000000); // 100 dias + 10 dias = 110 dias a 100k/dia
    expect(salaryAfterMatch2?.manualAdjustment).toBe(2000000);  // Correção manual de +2M preservada
    expect(salaryAfterMatch2?.amount).toBe(13000000);            // 11M calculado + 2M manual = 13M total
    expect(salaryAfterMatch2?.lastProcessedDate).toBe("19/10");

    // Validação extra: Confirmar bloqueio de exclusão da despesa de salários no serviço
    await expect(
      ServiceFinance.deleteEntry(careerId, seasonId, salaryEntryId),
    ).rejects.toThrow("A despesa automática de salários não pode ser excluída.");
  });
});
