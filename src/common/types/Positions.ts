export type Positions = {
  goalkeepers: "GOL";
  defenders: ["LE", "ZAG", "LD"];
  midfielders: ["ME", "VOL", "MC", "MEI", "MD"];
  attackers: ["PE", "ATA", "PD"];
};

type PositionGroupInfo = {
  key: string;
  name: string;
  color: string;
  positions: string[];
  sortOrder?: string[];
};

export const POSITION_DATA: PositionGroupInfo[] = [
  {
    key: "attackers",
    name: "Atacantes",
    color: "#cb1818",
    positions: ["PE", "ATA", "PD"],
    sortOrder: ["ATA", "PD", "PE"],
  },
  {
    key: "midfielders",
    name: "Meias",
    color: "#0bb32a",
    positions: ["ME", "VOL", "MC", "MEI", "MD"],
    sortOrder: ["MD", "MEI", "MC", "ME", "VOL"],
  },
  {
    key: "defenders",
    name: "Defensores",
    color: "#374df5",
    positions: ["LE", "ZAG", "LD"],
    sortOrder: ["LD", "ZAG", "LE"],
  },
  {
    key: "goalkeepers",
    name: "Goleiros",
    color: "#e59c03",
    positions: ["GOL"],
  },
  {
    key: "loaned",
    name: "Emprestados",
    color: "#60a5fa",
    positions: [],
  },
];

const positionToGroupMap = new Map<string, PositionGroupInfo>();
POSITION_DATA.forEach((group) => {
  group.positions.forEach((pos) => {
    positionToGroupMap.set(pos, group);
  });
});

export const positionOptionsBySector = {
  Ataque: ["PE", "PD", "ATA"],
  Meia: ["VOL", "ME", "MC", "MD", "MEI"],
  Defesa: ["LE", "ZAG", "LD"],
  Goleiro: ["GOL"],
} as const;

export const SECTOR_OPTIONS = ["Ataque", "Meia", "Defesa", "Goleiro"] as const;

export const getGroupForPosition = (position: string) =>
  positionToGroupMap.get(position);
