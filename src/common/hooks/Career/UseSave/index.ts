import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import { Career } from "../../../interfaces/Career";
import { League } from "../../../interfaces/League";
import { ServiceCareer } from "../../../services/ServiceCareer";
import { toast } from "../../../services/ToastService";

type useSaveProps = {
  setView?: (view: "titles" | "add" | "menu") => void;
  selectedCareer?: Career;
  setSelectedCareer?: Dispatch<SetStateAction<Career>>;
};

export function useSave({
  setView,
  selectedCareer,
  setSelectedCareer,
}: useSaveProps) {
  const [isSaving, setIsSaving] = useState(false);

  const saveTrophies = async (
    event: FormEvent<HTMLFormElement>,
    careerId: string,
    selectedTrophies: string[],
    seasonName: string,
    availableLeagues?: League[],
  ) => {
    event.preventDefault();

    if (!seasonName) {
      toast.error("Erro: Temporada não identificada!");
      return;
    }

    setIsSaving(true);

    try {
      const updatedTrophies = await ServiceCareer.syncSeasonTrophies(
        careerId,
        seasonName,
        selectedTrophies || [],
        availableLeagues,
      );

      if (selectedCareer && setSelectedCareer) {
        setSelectedCareer({
          ...selectedCareer,
          trophies: updatedTrophies,
        });
      }

      toast.success("Títulos salvos com sucesso!");
      setView?.("menu");
    } catch (error) {
      console.error("Erro ao salvar troféus:", error);
      toast.error("Ocorreu um erro ao salvar os títulos selecionados.");
    } finally {
      setIsSaving(false);
    }
  };

  return { saveTrophies, isSaving };
}
