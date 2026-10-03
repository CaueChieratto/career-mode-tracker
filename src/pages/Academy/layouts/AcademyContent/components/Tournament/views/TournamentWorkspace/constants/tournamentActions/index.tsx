import { FaCalendarAlt, FaTrophy, FaList, FaCopy } from "react-icons/fa";
import { EntityAction } from "../../../../../EntityActionLink";

export const tournamentActions: EntityAction[] = [
  { id: "add-matches", label: "Adicionar Partidas", icon: <FaCalendarAlt /> },
  { id: "view-matches", label: "Ver Partidas", icon: <FaList /> },
  {
    id: "copy-tournament",
    label: "Copiar Torneio",
    subtitle: "Toque para copiar",
    icon: <FaCopy />,
  },
  { id: "manage-tournaments", label: "Gerenciar Torneio", icon: <FaTrophy /> },
];
