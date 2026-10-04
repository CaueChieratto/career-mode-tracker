import { LuCalendarClock } from "react-icons/lu";
import { Field } from "../../../../../../../../../components/FormSection";
import { IoMdTrophy } from "react-icons/io";
import { GiHouse, GiPoliceBadge } from "react-icons/gi";
import { FaTrashCan } from "react-icons/fa6";
import { MdOutlineStadium } from "react-icons/md";
import { IoShieldHalfOutline } from "react-icons/io5";

export const getMatchFormFields = (
  leagueOptions: readonly string[],
  selectedMonth: string = "Tudo",
  teamOptions: readonly string[] = [],
  stadiumOptions: readonly string[] = [],
  stageOptions: readonly string[] = [],
  venue: string = "Casa",
  isKnockout: boolean = false,
  showReturnMatch: boolean = false,
): {
  title: string;
  fields: readonly (readonly Field[])[];
}[] => {
  const isSpecificMonth = selectedMonth !== "Tudo";

  const scheduleFields: Field[][] = [
    [
      {
        id: "date",
        name: isSpecificMonth ? `Dia de ${selectedMonth}` : "Data",
        inputType: "text",
        placeholder: isSpecificMonth ? "DD" : "DD/MM",
        icon: <LuCalendarClock />,
        maxLength: isSpecificMonth ? 2 : 5,
      },
      {
        id: "league",
        name: "Competição",
        inputType: "custom-select",
        placeholder: "Selecione...",
        icon: <IoMdTrophy />,
        options: leagueOptions,
      },
    ],
    [
      {
        id: "opponentTeam",
        name: "Adversário",
        inputType: "searchable-select",
        placeholder: "Nome da equipe",
        icon: <GiPoliceBadge />,
        options: teamOptions,
      },
    ],
    [
      {
        id: "matchVenue",
        name: "Mandante",
        icon: <GiHouse />,
        inputType: "segmented",
        options: ["Casa", "Neutro", "Fora"],
      },
    ],
  ];

  if (venue === "Neutro") {
    scheduleFields.push([
      {
        id: "neutralHost",
        name: "Mandante oficial",
        icon: <GiHouse />,
        inputType: "segmented",
        options: ["Meu clube", "Adversário"],
      },
    ]);
    scheduleFields.push([
      {
        id: "stadium",
        name: "Estádio",
        inputType: "searchable-select",
        placeholder: "Nome do estádio",
        icon: <MdOutlineStadium />,
        options: stadiumOptions,
      },
    ]);
  }

  scheduleFields.push([
    {
      id: "isKnockout",
      name: "É eliminatório?",
      icon: <IoShieldHalfOutline />,
      checkbox: true,
    },
  ]);

  if (isKnockout) {
    scheduleFields.push([
      {
        id: "stage",
        name: "Fase",
        inputType: "searchable-select",
        placeholder: "Ex: Final, Quartas",
        icon: <IoMdTrophy />,
        options: stageOptions,
      },
    ]);

    if (showReturnMatch) {
      scheduleFields.push([
        {
          id: "isReturnMatch",
          name: "É jogo de volta?",
          icon: <IoShieldHalfOutline />,
          checkbox: true,
        },
      ]);
    }
  }

  return [
    {
      title: "Ações",
      fields: [
        [
          {
            id: "deleteMatch",
            name: "Deletar essa partida?",
            icon: <FaTrashCan />,
            checkbox: true,
            action: "DELETE_MATCH",
            editOnly: true,
          },
        ],
      ],
    },
    {
      title: "Agendar partida",
      fields: scheduleFields,
    },
  ];
};
