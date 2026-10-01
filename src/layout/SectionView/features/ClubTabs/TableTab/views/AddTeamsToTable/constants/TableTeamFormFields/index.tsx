import { GiPoliceBadge } from "react-icons/gi";
import { GoNumber } from "react-icons/go";
import { FaTrashCan, FaTrophy } from "react-icons/fa6";
import { Field } from "../../../../../../../../../components/FormSection";
import { TableTeamStatField } from "../../helpers/tableTeamFormStats";

export const getTableTeamFormFields = (
  teamOptions: readonly string[],
  hasSelectedTeam: boolean,
  isEditing: boolean,
  numericPlaceholders: Partial<Record<TableTeamStatField, string>> = {},
): {
  title: string;
  editOnly?: boolean;
  fields: Field[][];
}[] => {
  const sections: { title: string; editOnly?: boolean; fields: Field[][] }[] = [
    {
      title: "Seleção de Equipe",
      fields: [
        [
          {
            id: "teamName",
            name: "Selecione o Time",
            inputType: "searchable-select",
            placeholder: "Nome da equipe",
            icon: <GiPoliceBadge />,
            options: teamOptions,
          },
        ],
      ],
    },
  ];

  if (hasSelectedTeam) {
    sections.push({
      title: "Classificação Manual",
      fields: [
        [
          {
            id: "customZone",
            name: "Competição (Opcional)",
            inputType: "custom-select",
            placeholder: "Padrão (Automático)",
            icon: <FaTrophy />,
            options: [
              "Padrão",
              "Campeão",
              "Liga dos Campeões",
              "Liga Europeia",
              "Conference League",
              "Rebaixamento",
              "Acesso",
              "Play-off para Promoção",
              "Nenhuma",
            ],
          },
        ],
      ],
    });

    sections.push({
      title: "Estatísticas de Partidas",
      fields: [
        [
          {
            id: "played",
            name: "Jogos (J)",
            inputType: "number",
            placeholder: numericPlaceholders.played,
            maxLength: 2,
            icon: <GoNumber />,
          },
          {
            id: "won",
            name: "Vitórias (V)",
            inputType: "number",
            placeholder: numericPlaceholders.won,
            maxLength: 2,
            icon: <GoNumber />,
          },
        ],
        [
          {
            id: "drawn",
            name: "Empates (E)",
            inputType: "number",
            placeholder: numericPlaceholders.drawn,
            maxLength: 2,
            icon: <GoNumber />,
          },
          {
            id: "lost",
            name: "Derrotas (D)",
            inputType: "number",
            placeholder: numericPlaceholders.lost,
            maxLength: 2,
            icon: <GoNumber />,
          },
        ],
      ],
    });

    sections.push({
      title: "Estatísticas de Gols",
      fields: [
        [
          {
            id: "goalsFor",
            name: "Gols Pró (GP)",
            inputType: "number",
            placeholder: numericPlaceholders.goalsFor,
            maxLength: 3,
            icon: <GoNumber />,
          },
          {
            id: "goalsAgainst",
            name: "Gols Contra (GC)",
            inputType: "number",
            placeholder: numericPlaceholders.goalsAgainst,
            maxLength: 3,
            icon: <GoNumber />,
          },
        ],
      ],
    });
  }

  if (isEditing) {
    sections.push({
      title: "Manutenção",
      editOnly: true,
      fields: [
        [
          {
            id: "delete",
            name: "Deletar esse time da tabela?",
            icon: <FaTrashCan />,
            checkbox: true,
            action: "DELETE_TEAM",
          },
        ],
      ],
    });
  }

  return sections;
};
