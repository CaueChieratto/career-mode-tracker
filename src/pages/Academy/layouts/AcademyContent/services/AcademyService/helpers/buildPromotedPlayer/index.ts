import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { AcademyPlayers } from "../../../../interfaces/AcademyPlayers/AcademyPlayers";
import { AcademyTournaments } from "../../../../interfaces/AcademyTournaments/AcademyTournaments";

export const buildPromotedPlayer = (
  academyPlayer: AcademyPlayers,
  promotionDate: string,
  academyTournaments: AcademyTournaments[],
  academyNickname?: string,
): Omit<Players, "id"> => {
  let parsedArrivalDate = new Date();
  const parts = promotionDate.split("/");

  if (parts.length === 3) {
    parsedArrivalDate = new Date(
      Number(parts[2]),
      Number(parts[1]) - 1,
      Number(parts[0]),
    );
  }

  const compactAcademyData: Partial<AcademyPlayers> = { ...academyPlayer };

  delete compactAcademyData.name;
  delete compactAcademyData.nationality;
  delete compactAcademyData.age;
  delete compactAcademyData.position;
  delete compactAcademyData.sector;
  delete compactAcademyData.overall;
  delete compactAcademyData.shirtNumber;
  delete compactAcademyData.evolutionHistory;

  return {
    name: academyPlayer.name,
    nation: academyPlayer.nationality,
    age: academyPlayer.age,
    position: academyPlayer.position,
    sector: academyPlayer.sector,
    overall: academyPlayer.overall,
    salary: 0,
    playerValue: 0,
    shirtNumber: "",
    buy: false,
    sell: false,
    loan: false,
    incomingLoan: false,
    captain: false,
    contractTime: 0,
    contract: [
      {
        buyValue: 0,
        sellValue: 0,
        fromClub: "Base",
        leftClub: "",
        dataArrival: parsedArrivalDate,
        dataExit: null,
      },
    ],
    statsLeagues: [],
    ballonDor: 0,
    isAcademy: true,
    ...(academyNickname !== undefined ? { academyNickname } : {}),
    academyData: compactAcademyData as AcademyPlayers,
    academyHistory: academyPlayer.evolutionHistory,
    academyTournaments,
  };
};
