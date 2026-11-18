import { describe, it, expect } from "vitest";
import { applyRevertToCareer } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/helpers/transferCareerStateReducers";
import { Career } from "../common/interfaces/Career";
import { Players } from "../common/interfaces/playersInfo/players";
import { ClubData } from "../common/interfaces/club/clubData";
import { player } from "./factories/domain";

describe("applyRevertToCareer - Preservação de Estados em Reversão de Transferência", () => {
  const createBaseCareer = (players: Players[]): Career => {
    const season: ClubData = {
      id: "season-2024-2025",
      seasonNumber: 1,
      players,
      matches: [],
      table: [],
    };

    return {
      id: "career-barca-1",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      currency: "€",
      nation: "Espanha",
      createdAt: "2024-07-01T00:00:00.000Z",
      clubData: [season],
    } as unknown as Career;
  };

  it("restaura sell: true e incomingLoan: false quando o atleta possuía venda anterior na temporada e o empréstimo de chegada é revertido", () => {
    // Pedri foi vendido ao PSG e posteriormente recontratado por empréstimo
    const pedri: Players = player({
      id: "pedri-id",
      name: "Pedri",
      age: 21,
      overall: 88,
      position: "CM",
      sector: "Meia",
      nation: "ESP",
      sell: false,
      incomingLoan: true, // Atualmente em empréstimo de chegada
      loan: false,
      contract: [
        {
          buyValue: 0,
          fromClub: "FC Barcelona",
          sellValue: 120000000,
          leftClub: "Paris Saint-Germain",
          isLoan: false,
          dataArrival: new Date(2024, 6, 1),
          dataExit: new Date(2024, 6, 15),
        },
        {
          buyValue: 0,
          fromClub: "Paris Saint-Germain",
          sellValue: 0,
          leftClub: "",
          isLoan: true,
          loanDuration: 1.6,
          dataArrival: new Date(2024, 7, 20),
          dataExit: null,
        },
      ],
    });

    const career = createBaseCareer([pedri]);

    // Reverte a chegada de empréstimo (índice 1 de contratos)
    const updatedCareer = applyRevertToCareer(
      career,
      "season-2024-2025",
      "pedri-id",
      1,
      "arrivals",
    );

    const updatedSeason = updatedCareer.clubData[0];
    const revertedPlayer = updatedSeason.players.find((p) => p.id === "pedri-id");

    expect(revertedPlayer).toBeDefined();
    // NÃO foi excluído do elenco
    expect(updatedSeason.players.length).toBe(1);
    // Estado retornado à venda original
    expect(revertedPlayer?.sell).toBe(true);
    expect(revertedPlayer?.incomingLoan).toBe(false);
    expect(revertedPlayer?.loan).toBe(false);
    expect(revertedPlayer?.contract?.length).toBe(1);
    expect(revertedPlayer?.contract?.[0].leftClub).toBe("Paris Saint-Germain");
    expect(revertedPlayer?.contract?.[0].sellValue).toBe(120000000);
  });

  it("remove o atleta do elenco ao reverter chegada direta de jogador sem histórico prévio", () => {
    // Novo atleta contratado pela 1ª vez
    const newPlayer: Players = player({
      id: "new-signing-id",
      name: "Wojciech Szczęsny",
      age: 34,
      overall: 80,
      position: "GK",
      sector: "Goleiro",
      nation: "POL",
      buy: true,
      sell: false,
      incomingLoan: false,
      contract: [
        {
          buyValue: 0,
          fromClub: "Passes Livres",
          sellValue: 0,
          leftClub: "",
          isLoan: false,
          dataArrival: new Date(2024, 9, 2),
          dataExit: null,
        },
      ],
    });

    const career = createBaseCareer([newPlayer]);

    const updatedCareer = applyRevertToCareer(
      career,
      "season-2024-2025",
      "new-signing-id",
      0,
      "arrivals",
    );

    const updatedSeason = updatedCareer.clubData[0];
    const revertedPlayer = updatedSeason.players.find((p) => p.id === "new-signing-id");

    // Deve ser excluído do elenco pois não havia contrato anterior
    expect(revertedPlayer).toBeUndefined();
    expect(updatedSeason.players.length).toBe(0);
  });

  it("restaura loan: true quando o contrato anterior era um empréstimo de saída", () => {
    // Atleta emprestado ao Brighton, com chegada revertida
    const ansu: Players = player({
      id: "ansu-id",
      name: "Ansu Fati",
      age: 21,
      overall: 79,
      position: "LW",
      sector: "Ataque",
      nation: "ESP",
      sell: false,
      incomingLoan: true,
      loan: false,
      contract: [
        {
          buyValue: 0,
          fromClub: "FC Barcelona",
          sellValue: 0,
          leftClub: "Brighton",
          isLoan: true,
          loanDuration: 1,
          dataArrival: new Date(2024, 6, 1),
          dataExit: new Date(2024, 7, 1),
        },
        {
          buyValue: 0,
          fromClub: "Brighton",
          sellValue: 0,
          leftClub: "",
          isLoan: true,
          loanDuration: 0.6,
          dataArrival: new Date(2024, 8, 1),
          dataExit: null,
        },
      ],
    });

    const career = createBaseCareer([ansu]);

    const updatedCareer = applyRevertToCareer(
      career,
      "season-2024-2025",
      "ansu-id",
      1,
      "arrivals",
    );

    const updatedSeason = updatedCareer.clubData[0];
    const revertedPlayer = updatedSeason.players.find((p) => p.id === "ansu-id");

    expect(revertedPlayer).toBeDefined();
    expect(revertedPlayer?.loan).toBe(true);
    expect(revertedPlayer?.sell).toBe(false);
    expect(revertedPlayer?.incomingLoan).toBe(false);
    expect(revertedPlayer?.contract?.length).toBe(1);
  });

  it("restaura atleta trocado do clube quando uma chegada com atleta envolvido na troca é revertida", () => {
    // Dani Olmo contratado pelo Barcelona com Ferran Torres envolvido na troca
    const ferranTorres: Players = player({
      id: "ferran-torres-id",
      name: "Ferran Torres",
      age: 24,
      overall: 82,
      position: "ATA",
      sector: "Ataque",
      nation: "ESP",
      sell: true, // Marcado como saído na troca
      contract: [
        {
          buyValue: 0,
          fromClub: "FC Barcelona",
          sellValue: 0,
          leftClub: "RB Leipzig",
          isLoan: false,
          dataArrival: new Date(2024, 6, 1),
          dataExit: new Date(2024, 6, 15),
          swapPlayer: {
            playerName: "Ferran Torres",
            playerValue: 30000000,
          },
        },
      ],
    });

    const daniOlmo: Players = player({
      id: "dani-olmo-id",
      name: "Dani Olmo",
      age: 26,
      overall: 86,
      position: "MEI",
      sector: "Meio-Campo",
      nation: "ESP",
      buy: true,
      sell: false,
      contract: [
        {
          buyValue: 55000000,
          fromClub: "RB Leipzig",
          sellValue: 0,
          leftClub: "",
          isLoan: false,
          dataArrival: new Date(2024, 6, 15),
          dataExit: null,
          swapPlayer: {
            playerId: "ferran-torres-id",
            playerName: "Ferran Torres",
            playerValue: 30000000,
          },
        },
      ],
    });

    const career = createBaseCareer([ferranTorres, daniOlmo]);

    // Reverte a chegada de Dani Olmo
    const updatedCareer = applyRevertToCareer(
      career,
      "season-2024-2025",
      "dani-olmo-id",
      0,
      "arrivals",
    );

    const updatedSeason = updatedCareer.clubData[0];
    // Dani Olmo foi removido da temporada
    expect(updatedSeason.players.find((p) => p.id === "dani-olmo-id")).toBeUndefined();

    // Ferran Torres foi restaurado no elenco do clube
    const restoredFerran = updatedSeason.players.find((p) => p.id === "ferran-torres-id");
    expect(restoredFerran).toBeDefined();
    expect(restoredFerran?.sell).toBe(false);
    expect(restoredFerran?.contract).toEqual([]);
  });
});
