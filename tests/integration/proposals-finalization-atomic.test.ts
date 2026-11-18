import { describe, expect, it } from "vitest";
import { ServiceProposals } from "../../src/common/services/ServiceProposals";
import {
  ProposalFinalizationService,
  ProposalAlreadyFinalizedError,
  PlayerIneligibleError,
} from "../../src/common/services/ServiceProposals/proposalFinalizationService";
import { career, player, season } from "../../src/test/factories/domain";
import { careerPath, read, seedCareer, list, put } from "./helpers";
import { Players } from "../../src/common/interfaces/playersInfo/players";
import { ServiceFinance } from "../../src/common/services/ServiceFinance";
import { FinancialEntry } from "../../src/common/interfaces/finance";

describe("Integração: Finalização Atômica e Concorrência de Propostas no Firestore Emulator", () => {
  const barcaCareer = () =>
    career({
      id: "c_barca",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      currency: "€",
      createdAt: new Date("2026-08-01"),
      clubData: [
        season({
          id: "s_2026_2027",
          seasonNumber: 1,
          players: [
            player({
              id: "player_pedri_8",
              name: "Pedri",
              nation: "Espanha",
              position: "MC",
              sector: "Meio-Campo",
              overall: 89,
              salary: 180000,
              playerValue: 90000000,
              buy: false,
              sell: false,
              loan: false,
            }),
            player({
              id: "player_yamal_19",
              name: "Lamine Yamal",
              nation: "Espanha",
              position: "ED",
              sector: "Ataque",
              overall: 84,
              salary: 120000,
              playerValue: 100000000,
              buy: false,
              sell: false,
              loan: false,
            }),
          ],
        }),
      ],
    });

  it("finaliza contratação completa, cria atleta no elenco, lança finanças e marca proposta como concluida", async () => {
    await seedCareer(barcaCareer());

    // 1. Criar proposta de compra de Nico Williams
    const buyProp = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      {
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        type: "compra",
        overallStatus: "aguardando_confirmacao",
        playerId: "player_nico_williams_11",
        playerName: "Nico Williams",
        playerNation: "Espanha",
        playerPosition: "EE",
        playerSector: "Ataque",
        playerOverall: 85,
        playerAge: 24,
        timing: "Imediata",
        clubNegotiation: {
          partnerClub: "Athletic Club",
          transferFee: 58000000,
          status: "aceita",
        },
        playerNegotiation: {
          weeklyWage: 200000,
          durationYears: 5,
          squadRole: "Crucial",
          status: "aceita",
        },
      },
    );

    expect(buyProp.overallStatus).toBe("aguardando_confirmacao");

    // 2. Executar finalização atômica
    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s_2026_2027",
      proposalId: buyProp.id,
      agreementDate: "15/08/2026",
    });

    // 3. Verificar proposta atualizada para "concluida"
    const finishedProp = await ServiceProposals.getProposalById(
      "c_barca",
      "s_2026_2027",
      buyProp.id,
    );
    expect(finishedProp?.overallStatus).toBe("concluida");
    expect(finishedProp?.finalizedAt).toBeGreaterThan(0);
    expect(finishedProp?.agreementDate).toBe("15/08/2026");

    // 4. Verificar que atleta foi persistido na subcoleção players
    const playersList = await list<Players>(
      `${careerPath("c_barca")}/seasons/s_2026_2027/players`,
    );
    const nicoInSquad = playersList.find(
      (p) => p.name === "Nico Williams" || p.id === "player_nico_williams_11",
    );
    expect(nicoInSquad).toBeDefined();
    expect(nicoInSquad?.overall).toBe(85);
    expect(nicoInSquad?.contract).toBeDefined();
    expect(nicoInSquad?.contract?.[0].fromClub).toBe("Athletic Club");

    // 5. Verificar lançamento financeiro determinístico da compra
    const financeReport = await ServiceFinance.getReportBySeason(
      "c_barca",
      "s_2026_2027",
    );
    const buyEntry = financeReport.entries.find((e: FinancialEntry) =>
      e.id.includes("transfer_buy_"),
    );
    expect(buyEntry).toBeDefined();
    expect(buyEntry?.amount).toBe(58000000);
    expect(buyEntry?.type).toBe("expense");
  });

  it("impede dupla finalização concorrente (idempotência e bloqueio via ProposalAlreadyFinalizedError)", async () => {
    await seedCareer(barcaCareer());

    const buyProp = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      {
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        type: "compra",
        overallStatus: "aguardando_confirmacao",
        playerId: "player_kimmich_6",
        playerName: "Joshua Kimmich",
        playerNation: "Alemanha",
        playerPosition: "VOL",
        playerSector: "Meio-Campo",
        playerOverall: 88,
        playerAge: 31,
        clubNegotiation: {
          partnerClub: "Bayern München",
          transferFee: 35000000,
          status: "aceita",
        },
        playerNegotiation: {
          weeklyWage: 220000,
          durationYears: 3,
          squadRole: "Importante",
          status: "aceita",
        },
      },
    );

    // Primeira finalização tem sucesso
    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s_2026_2027",
      proposalId: buyProp.id,
      agreementDate: "20/08/2026",
    });

    // Segunda tentativa concorrente deve falhar controladamente com ProposalAlreadyFinalizedError
    await expect(
      ProposalFinalizationService.finalizeProposal({
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        proposalId: buyProp.id,
      }),
    ).rejects.toThrow(ProposalAlreadyFinalizedError);
  });

  it("cancela propostas concorrentes para o mesmo atleta ao finalizar uma proposta vencedora", async () => {
    await seedCareer(barcaCareer());

    // Também semeia o Pedri na subcoleção players para resolução direta
    await put(
      `${careerPath("c_barca")}/seasons/s_2026_2027/players/player_pedri_8`,
      {
        id: "player_pedri_8",
        name: "Pedri",
        overall: 89,
        position: "MC",
        sector: "Meio-Campo",
        sell: false,
        loan: false,
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "Las Palmas",
            leftClub: "",
            dataArrival: "01/08/2026",
          },
        ],
      },
    );

    // Proposta 1: Venda do Pedri para o Arsenal
    const propArsenal = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      {
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        type: "venda",
        overallStatus: "aguardando_confirmacao",
        playerId: "player_pedri_8",
        playerName: "Pedri",
        playerNation: "Espanha",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerOverall: 89,
        playerAge: 23,
        clubNegotiation: {
          partnerClub: "Arsenal",
          transferFee: 110000000,
          status: "aceita",
        },
      },
    );

    // Proposta 2: Venda concorrente do Pedri para o Paris Saint-Germain
    const propPsg = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      {
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        type: "venda",
        overallStatus: "em_andamento",
        playerId: "player_pedri_8",
        playerName: "Pedri",
        playerNation: "Espanha",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerOverall: 89,
        playerAge: 23,
        clubNegotiation: {
          partnerClub: "Paris Saint-Germain",
          transferFee: 125000000,
          status: "em_negociacao",
        },
      },
    );

    // Finalizar a proposta do Arsenal
    await ProposalFinalizationService.finalizeProposal({
      careerId: "c_barca",
      seasonId: "s_2026_2027",
      proposalId: propArsenal.id,
      agreementDate: "25/08/2026",
    });

    // 1. Proposta do Arsenal deve estar concluída
    const updatedArsenal = await ServiceProposals.getProposalById(
      "c_barca",
      "s_2026_2027",
      propArsenal.id,
    );
    expect(updatedArsenal?.overallStatus).toBe("concluida");

    // 2. Proposta concorrente do PSG deve ter sido cancelada automaticamente
    const updatedPsg = await ServiceProposals.getProposalById(
      "c_barca",
      "s_2026_2027",
      propPsg.id,
    );
    expect(updatedPsg?.overallStatus).toBe("cancelada");
    expect(updatedPsg?.cancelReason).toBe("Atleta negociado em outra proposta");

    // 3. Documento do Pedri em players/ deve estar com sell: true
    const pedriSnap = (await read(
      `${careerPath("c_barca")}/seasons/s_2026_2027/players/player_pedri_8`,
    )) as Players;
    expect(pedriSnap.sell).toBe(true);

    // 4. Receita registrada no caixa da temporada
    const financeReport = await ServiceFinance.getReportBySeason(
      "c_barca",
      "s_2026_2027",
    );
    const sellEntry = financeReport.entries.find((e: FinancialEntry) =>
      e.id.includes("transfer_sell_player_pedri_8"),
    );
    expect(sellEntry).toBeDefined();
    expect(sellEntry?.amount).toBe(110000000);
    expect(sellEntry?.type).toBe("revenue");
  });

  it("aborta com PlayerIneligibleError ao tentar homologar proposta de atleta já vendido", async () => {
    await seedCareer(barcaCareer());

    // Marca Pedri previamente como vendido (sell: true)
    await put(
      `${careerPath("c_barca")}/seasons/s_2026_2027/players/player_pedri_8`,
      {
        id: "player_pedri_8",
        name: "Pedri",
        overall: 89,
        position: "MC",
        sector: "Meio-Campo",
        sell: true,
        loan: false,
      },
    );

    const prop = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      {
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        type: "venda",
        overallStatus: "aguardando_confirmacao",
        playerId: "player_pedri_8",
        playerName: "Pedri",
        playerNation: "Espanha",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerOverall: 89,
        playerAge: 23,
        clubNegotiation: {
          partnerClub: "Chelsea",
          transferFee: 100000000,
          status: "aceita",
        },
      },
    );

    // Deve abortar seguramente e rejeitar com PlayerIneligibleError
    await expect(
      ProposalFinalizationService.finalizeProposal({
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        proposalId: prop.id,
      }),
    ).rejects.toThrow(PlayerIneligibleError);
  });
});
