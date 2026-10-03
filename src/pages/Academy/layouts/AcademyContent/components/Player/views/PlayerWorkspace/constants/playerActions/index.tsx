import {
  FaChartLine,
  FaCopy,
  FaStickyNote,
  FaTrophy,
  FaUserEdit,
} from "react-icons/fa";
import { EntityAction } from "../../../../../EntityActionLink";

export const getPlayerActions = (
  hasAnnotations: boolean,
  isReadOnlyNote?: boolean,
): EntityAction[] => [
  { id: "manage-player", label: "Gerenciar Jogador", icon: <FaUserEdit /> },
  {
    id: "add-note",
    label: isReadOnlyNote
      ? "Ver Anotações"
      : hasAnnotations
        ? "Ver Anotações"
        : "Adicionar Anotação",
    icon: <FaStickyNote />,
  },
  {
    id: "development",
    label: "Acompanhar Desenvolvimento",
    icon: <FaChartLine />,
  },
  {
    id: "performance",
    label: "Acompanhar Desempenho",
    icon: <FaTrophy />,
  },
  {
    id: "copy-player",
    label: "Copiar jogador",
    subtitle: "Toque para copiar",
    icon: <FaCopy />,
  },
];
