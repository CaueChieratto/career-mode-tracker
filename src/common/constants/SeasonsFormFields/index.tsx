import { FaStar, FaUser } from "react-icons/fa";
import { GiGoalKeeper, GiSoccerBall, GiTrophyCup } from "react-icons/gi";
import { MdPeopleOutline } from "react-icons/md";
import { TbSoccerField } from "react-icons/tb";

export const seasonsFormFields = (
  leagueNames: readonly string[],
  playerNames: readonly string[],
) => [
  {
    title: "Selecione o Jogador",
    fields: [
      [
        {
          id: "playerName",
          name: "Jogador",
          placeholder: "Selecione...",
          icon: <FaUser />,
          inputType: "custom-select",
          options: playerNames,
        },
        {
          id: "ballonDor",
          name: "Bola de ouro",
          icon: <GiSoccerBall color="#ffd700ff" />,
          checkbox: true,
        },
      ],
    ],
  },
  {
    title: "Selecione a Liga",
    fields: [
      [
        {
          id: "leagueName",
          name: "Liga",
          placeholder: "Selecione...",
          icon: <GiTrophyCup />,
          inputType: "custom-select",
          options: leagueNames,
        },
      ],
      [
        {
          id: "games",
          name: "Jogos",
          inputType: "number",
          placeholder: "Ex: 38",
          icon: <TbSoccerField />,
        },
        {
          id: "goals",
          name: "Gols",
          inputType: "number",
          placeholder: "Ex: 26",
          icon: <GiSoccerBall />,
        },
        {
          id: "cleanSheets",
          name: "Jogos sem sofrer gols",
          inputType: "number",
          placeholder: "Ex: 15",
          icon: <GiGoalKeeper />,
        },
      ],
      [
        {
          id: "assists",
          name: "Assistências",
          inputType: "number",
          placeholder: "Ex: 18",
          icon: <MdPeopleOutline />,
        },
        {
          id: "rating",
          name: "Nota",
          inputType: "number",
          placeholder: "Ex: 8.35",
          icon: <FaStar />,
        },
      ],
    ],
  },
];
