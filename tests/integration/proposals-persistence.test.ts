import { describe, expect, it } from "vitest";
import { ServiceProposals } from "../../src/common/services/ServiceProposals";
import { career, player, season } from "../../src/test/factories/domain";
import { careerPath, read, seedCareer } from "./helpers";
import { TransferProposal } from "../../src/common/interfaces/proposals/transferProposal";

describe("Integração: Persistência e Isolamento de Propostas no Firestore Emulator", () => {
  const barcaCareer = () =>
    career({
      id: "c_barca",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
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

  it("cria propostas de compra e venda na subcoleção proposals sem alterar o elenco ou finanças", async () => {
    const seed = barcaCareer();
    await seedCareer(seed);

    // 1. Proposta de compra de alvo externo (Nico Williams)
    const buyProposalData: Omit<TransferProposal, "id"> = {
      careerId: "c_barca",
      seasonId: "s_2026_2027",
      type: "compra",
      overallStatus: "em_andamento",
      playerId: "target_nico_williams",
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
        weeklyWage: 180000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "em_negociacao",
      },
    };

    const createdBuy = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      buyProposalData,
    );
    expect(createdBuy.id).toBeDefined();
    expect(createdBuy.id).toMatch(/^prop_/);
    expect(createdBuy.overallStatus).toBe("em_andamento");

    // 2. Proposta de venda de atleta do elenco (Pedri)
    const sellProposalData: Omit<TransferProposal, "id"> = {
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
      timing: "Proxima janela",
      clubNegotiation: {
        partnerClub: "Bayern München",
        transferFee: 110000000,
        status: "em_negociacao",
      },
    };

    const createdSell = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      sellProposalData,
    );
    expect(createdSell.id).toBeDefined();

    // 3. Verifica persistência direta no Firestore Emulator
    const directDocBuy = await read(
      `users/${seed.id ? "emulator-fixture-a" : ""}/careers/c_barca/seasons/s_2026_2027/proposals/${createdBuy.id}`,
    );
    expect(directDocBuy).toBeDefined();
    expect((directDocBuy as TransferProposal).playerName).toBe("Nico Williams");

    // 4. Validação de isolamento: os atletas do elenco original permanecem intocados
    const currentCareerDoc = (await read(careerPath("c_barca"))) as typeof seed;
    const currentSeason = currentCareerDoc.clubData[0];
    expect(currentSeason.players).toHaveLength(2);

    const pedri = currentSeason.players.find((p) => p.id === "player_pedri_8");
    expect(pedri?.sell).toBe(false);
    expect(pedri?.salary).toBe(180000);

    // Nico Williams NÃO foi inserido no elenco definitivo
    const nicoInSquad = currentSeason.players.find(
      (p) => p.name === "Nico Williams",
    );
    expect(nicoInSquad).toBeUndefined();
  });

  it("suporta múltiplas propostas simultâneas concorrentes para o mesmo atleta (Pedri recebendo Arsenal e Bayern)", async () => {
    await seedCareer(barcaCareer());

    // Proposta 1: Bayern München oferece 95M
    const propBayern = await ServiceProposals.createProposal(
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
          partnerClub: "Bayern München",
          transferFee: 95000000,
          status: "em_negociacao",
        },
      },
    );

    // Proposta 2: Arsenal oferece 105M
    const propArsenal = await ServiceProposals.createProposal(
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
          partnerClub: "Arsenal",
          transferFee: 105000000,
          status: "em_negociacao",
        },
      },
    );

    expect(propBayern.id).not.toBe(propArsenal.id);

    // Consulta todas as propostas da temporada
    const allProposals = await ServiceProposals.getProposalsBySeason(
      "c_barca",
      "s_2026_2027",
    );

    const pedriProposals = allProposals.filter(
      (p) => p.playerId === "player_pedri_8",
    );
    expect(pedriProposals).toHaveLength(2);

    const clubs = pedriProposals.map((p) => p.clubNegotiation?.partnerClub);
    expect(clubs).toContain("Bayern München");
    expect(clubs).toContain("Arsenal");
  });

  it("atualiza proposta in-place e recalcula overallStatus de forma automática", async () => {
    await seedCareer(barcaCareer());

    // Cria proposta de renovação para Lamine Yamal em negociação
    const prop = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      {
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        type: "renovacao",
        overallStatus: "em_andamento",
        playerId: "player_yamal_19",
        playerName: "Lamine Yamal",
        playerNation: "Espanha",
        playerPosition: "ED",
        playerSector: "Ataque",
        playerOverall: 84,
        playerAge: 19,
        playerNegotiation: {
          weeklyWage: 150000,
          durationYears: 5,
          squadRole: "Crucial",
          status: "em_negociacao",
        },
      },
    );

    expect(prop.overallStatus).toBe("em_andamento");

    // Jogador aceita os termos após rodada de negociação
    await ServiceProposals.updateProposal("c_barca", "s_2026_2027", prop.id, {
      playerNegotiation: {
        weeklyWage: 180000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "aceita",
      },
    });

    // Reconsulta proposta e valida novo status
    const updated = await ServiceProposals.getProposalById(
      "c_barca",
      "s_2026_2027",
      prop.id,
    );

    expect(updated).not.toBeNull();
    expect(updated?.playerNegotiation?.weeklyWage).toBe(180000);
    expect(updated?.playerNegotiation?.status).toBe("aceita");
    expect(updated?.overallStatus).toBe("aguardando_confirmacao");
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(prop.createdAt || 0);
  });

  it("exclui proposta e garante que apenas o documento da subcoleção é apagado", async () => {
    await seedCareer(barcaCareer());

    const prop = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      {
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        type: "venda",
        overallStatus: "rejeitada",
        playerId: "player_pedri_8",
        playerName: "Pedri",
        playerNation: "Espanha",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerOverall: 89,
        playerAge: 23,
        clubNegotiation: {
          partnerClub: "Paris Saint-Germain",
          transferFee: 70000000,
          status: "rejeitada",
        },
      },
    );

    // Exclui a proposta rejeitada
    await ServiceProposals.deleteProposal("c_barca", "s_2026_2027", prop.id);

    const checkDeleted = await ServiceProposals.getProposalById(
      "c_barca",
      "s_2026_2027",
      prop.id,
    );
    expect(checkDeleted).toBeNull();

    // Integridade do elenco intacta
    const careerDoc = (await read(careerPath("c_barca"))) as ReturnType<
      typeof barcaCareer
    >;
    expect(careerDoc.clubData[0].players).toHaveLength(2);
  });

  it("permite escutar mudanças em tempo real via listenProposals com cancelamento seguro", async () => {
    await seedCareer(barcaCareer());

    const receivedBatches: TransferProposal[][] = [];

    const unsubscribe = ServiceProposals.listenProposals(
      "c_barca",
      "s_2026_2027",
      (proposals) => {
        receivedBatches.push(proposals);
      },
    );

    expect(typeof unsubscribe).toBe("function");

    // Cria uma proposta para disparar o listener
    const prop = await ServiceProposals.createProposal(
      "c_barca",
      "s_2026_2027",
      {
        careerId: "c_barca",
        seasonId: "s_2026_2027",
        type: "compra",
        overallStatus: "em_andamento",
        playerId: "target_gavi_test",
        playerName: "Gavi",
        playerNation: "Espanha",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerOverall: 86,
        playerAge: 22,
        timing: "Imediata",
      },
    );

    // Cancela o listener limpo
    unsubscribe();
    expect(prop.id).toBeDefined();
  });
});
