import { Players } from "../../../../../../../common/interfaces/playersInfo/players";

export const SECTOR_ORDER = ["Ataque", "Meia", "Defesa", "Goleiro"];

export const POSITION_GROUP_ORDER: Record<string, number> = {
  ATA: 0,
  PD: 1,
  PE: 1,
  MEI: 2,
  MD: 3,
  ME: 3,
  MC: 4,
  VOL: 5,
  LD: 6,
  LE: 6,
  ZAG: 7,
  GOL: 8,
};

export const POSITION_ORDER = [
  "ATA",
  "PD",
  "PE",
  "MD",
  "MEI",
  "MC",
  "ME",
  "VOL",
  "LD",
  "ZAG",
  "LE",
  "GOL",
];

export const sortPlayers = (
  players: Players[],
  criteria: string,
  isAsc: boolean,
): Players[] => {
  if (criteria === "Ordenar por padrão" || criteria === "Padrão")
    return players;

  return [...players].sort((a, b) => {
    let result = 0;

    switch (criteria) {
      case "Ordenar por posição": {
        const indexA = POSITION_ORDER.indexOf(String(a.position));
        const indexB = POSITION_ORDER.indexOf(String(b.position));

        const weightA = indexA !== -1 ? indexA : 999;
        const weightB = indexB !== -1 ? indexB : 999;

        result = weightA - weightB;
        break;
      }
      case "Ordenar por número da camisa":
        result = Number(a.shirtNumber) - Number(b.shirtNumber);
        break;
      case "Ordenar por idade":
        result = a.age - b.age;
        break;
      case "Ordenar por salário":
        result = (a.salary || 0) - (b.salary || 0);
        break;
      case "Ordenar por valor de mercado":
        result = (a.playerValue || 0) - (b.playerValue || 0);
        break;
      case "Ordenar por tempo de contrato":
        result = (a.contractTime || 0) - (b.contractTime || 0);
        break;
      default:
        return 0;
    }

    return isAsc ? -result : result;
  });
};
