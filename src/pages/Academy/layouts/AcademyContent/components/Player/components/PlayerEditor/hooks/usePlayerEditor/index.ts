import { useState, useEffect } from "react";
import { Career } from "../../../../../../../../../../common/interfaces/Career";
import { AcademyPlayers } from "../../../../../../../../../../common/interfaces/AcademyData";
import { PlayerDataPayload } from "../../../../forms/types/PlayerDataPayload";
import { generateEvolutionHistory } from "../../utils/playerEvolution";
import { EditMode } from "../../types";
import { ServicePlayers } from "../../../../../../../../../../common/services/ServicePlayers";
import { getSeasonStartYear } from "../../../../../../utils/getSeasonStartYear";
import { isEuropeanSeason } from "../../../../../../utils/isEuropeanSeason";
import { useAcademyContext } from "../../../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { resolveSeasonDate } from "../../../../../../../../../../common/services/ServicePlayers/helpers/resolveSeasonDate";
import { toast } from "../../../../../../../../../../common/services/ToastService";

type UsePlayerEditorProps = {
  player: AcademyPlayers;
  career: Career;
  seasonId: string;
  onUpdatePlayer: (updatedPlayer: AcademyPlayers) => Promise<void>;
};

export const usePlayerEditor = ({
  player,
  career,
  seasonId,
  onUpdatePlayer,
}: UsePlayerEditorProps) => {
  const { editingEvolutionEvent, setEditingEvolutionEvent } =
    useAcademyContext();
  const isEditingEvolution = editingEvolutionEvent?.playerId === player.id;

  const [editMode, setEditMode] = useState<EditMode>(
    isEditingEvolution ? "edit-evolution" : "evolution",
  );

  useEffect(() => {
    if (isEditingEvolution) {
      setEditMode("edit-evolution");
    }
  }, [isEditingEvolution]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const initialExitDate = player.exitDate
    ? player.exitDate.substring(0, 5)
    : "";
  const [exitDate, setExitDate] = useState(initialExitDate);

  const evolutionMode = editMode === "evolution";

  const handleTabChange = (tab: EditMode) => {
    if (tab !== "edit-evolution" && isEditingEvolution) {
      setEditingEvolutionEvent(null);
    }
    setEditMode(tab);
  };

  const handleCloseModal = () => {
    setIsDeleteModalOpen(false);
    setIsReleaseModalOpen(false);
    setIsUndoModalOpen(false);
    document.body.classList.remove("modal-open");
  };

  const formatSeasonDate = (dayMonth: string) => {
    if (!dayMonth || dayMonth.length < 5) return dayMonth;
    const startYear = getSeasonStartYear(career, seasonId);
    const isEurope = isEuropeanSeason(career);
    const start = new Date(startYear, isEurope ? 6 : 0, 1);
    const end = new Date(
      isEurope ? startYear + 1 : startYear,
      isEurope ? 5 : 11,
      30,
    );
    return resolveSeasonDate(dayMonth, start, end);
  };

  const handleUpdate = async (newData: PlayerDataPayload) => {
    let updatedPlayer: AcademyPlayers;

    if (evolutionMode) {
      updatedPlayer = generateEvolutionHistory(
        player,
        newData,
        career,
        seasonId,
      );
    } else {
      let finalArrivalDate = player.arrivalDate;

      if (newData.arrivalDate && newData.arrivalDate.length === 5) {
        finalArrivalDate = formatSeasonDate(newData.arrivalDate);
      }

      const updatedHistory =
        player.evolutionHistory?.map((h) => {
          if (h.description === "Jogador recrutado para a categoria de base.") {
            return { ...h, date: finalArrivalDate };
          }
          return h;
        }) || [];

      updatedPlayer = {
        ...player,
        ...newData,
        arrivalDate: finalArrivalDate,
        evolutionHistory: updatedHistory,
      };
    }

    await onUpdatePlayer(updatedPlayer);
    toast.success("Dados do jogador atualizados com sucesso!");
  };

  const handleEditEvolution = async (newData: PlayerDataPayload) => {
    if (!editingEvolutionEvent) return;
    const targetHistoryIndex = player.evolutionHistory?.findIndex(
      (h) => h.id === editingEvolutionEvent.historyId,
    );
    if (targetHistoryIndex === undefined || targetHistoryIndex === -1) return;

    const historyItem = player.evolutionHistory![targetHistoryIndex];
    const attribute = editingEvolutionEvent.attribute;
    const formFieldKey =
      attribute === "sector" || attribute === "position"
        ? attribute
        : attribute;
    const newValue = newData[formFieldKey as keyof PlayerDataPayload];

    let evolutionDateFinal =
      newData.evolutionDate || new Date().toLocaleDateString("pt-BR");
    if (newData.evolutionDate && newData.evolutionDate.length === 5) {
      evolutionDateFinal = formatSeasonDate(newData.evolutionDate);
    } else if (newData.evolutionDate) {
      evolutionDateFinal = newData.evolutionDate;
    }

    const updatedHistory = [...player.evolutionHistory!];
    updatedHistory[targetHistoryIndex] = {
      ...historyItem,
      newValue: newValue as string | number,
      date: evolutionDateFinal,
      description: `Alterou ${attribute} de ${historyItem.oldValue || "Vazio"} para ${newValue || "Vazio"}`,
    };

    const updatedPlayer = {
      ...player,
      [attribute]: newValue,
      evolutionHistory: updatedHistory,
    };

    await onUpdatePlayer(updatedPlayer);
    toast.success("Dados do jogador atualizados com sucesso!");
    setEditingEvolutionEvent(null);
    setEditMode("evolution");
  };

  const handleUpdateDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exitDate.length < 5) {
      toast.warning("Por favor, preencha a data corretamente (DD/MM).");
      return;
    }
    setIsLoadingStatus(true);
    try {
      const finalExitDate = formatSeasonDate(exitDate);

      const newHistory =
        player.evolutionHistory?.map((h) => {
          if (h.newValue === player.status) {
            return { ...h, date: finalExitDate };
          }
          return h;
        }) || [];

      const updatedPlayer = {
        ...player,
        exitDate: finalExitDate,
        evolutionHistory: newHistory,
      };

      await onUpdatePlayer(updatedPlayer);
      toast.success("Dados do jogador atualizados com sucesso!");

      if (player.status === "promoted") {
        const proPlayers = await ServicePlayers.getPlayersBySeason(
          career.id,
          seasonId,
        );
        const proPlayer = proPlayers.find(
          (p) => p.isAcademy && p.academyData?.id === player.id,
        );

        if (proPlayer && proPlayer.contract && proPlayer.contract.length > 0) {
          const updatedContract = [...proPlayer.contract];
          const [exitD, exitM, exitY] = finalExitDate.split("/");

          updatedContract[0].dataArrival = new Date(
            Number(exitY),
            Number(exitM) - 1,
            Number(exitD),
          );

          await ServicePlayers.editPlayerInSeason(
            career.id,
            seasonId,
            proPlayer.id,
            { contract: updatedContract },
          );
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar data.");
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleUndoStatus = async () => {
    setIsLoadingStatus(true);
    try {
      if (player.status === "promoted") {
        const proPlayers = await ServicePlayers.getPlayersBySeason(
          career.id,
          seasonId,
        );
        const proPlayer = proPlayers.find(
          (p) => p.isAcademy && p.academyData?.id === player.id,
        );
        if (proPlayer) {
          await ServicePlayers.deletePlayerFromSeason(
            career.id,
            seasonId,
            proPlayer.id,
          );
        }
      }

      const newHistory =
        player.evolutionHistory?.filter(
          (h) => h.newValue !== "promoted" && h.newValue !== "released",
        ) || [];

      const updatedPlayer = {
        ...player,
        status: "academy" as const,
        evolutionHistory: newHistory,
      };
      delete updatedPlayer.exitDate;

      await onUpdatePlayer(updatedPlayer);
      toast.success("Ação desfeita com sucesso!");
      handleCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao desfazer ação.");
    } finally {
      setIsLoadingStatus(false);
    }
  };

  return {
    editMode,
    evolutionMode,
    isDeleteModalOpen,
    isReleaseModalOpen,
    isUndoModalOpen,
    isLoadingStatus,
    exitDate,
    setEditMode: handleTabChange,
    setIsReleaseModalOpen,
    setIsDeleteModalOpen,
    setIsUndoModalOpen,
    setExitDate,
    handleCloseModal,
    handleUpdate,
    handleEditEvolution,
    handleUpdateDates,
    handleUndoStatus,
    isEditingEvolution,
    editingEvolutionEvent,
  };
};
