import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import { UseCreateCareer } from "../UseCreateCareer";
import { Career } from "../../../interfaces/Career";
import { ServiceCareer } from "../../../services/ServiceCareer";

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

  const saveCareer = async (
    event: React.FormEvent<HTMLFormElement>,
    createdAtInput: string,
  ) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const club = String(data.get("club") || "").trim();
    const nation = String(data.get("nation") || "").trim();
    const manager = String(data.get("manager") || "").trim();

    if (!club || !nation || !manager) {
      throw new Error("Preencha todos os campos!");
    }

    try {
      const career = await UseCreateCareer({
        club,
        manager,
        nation,
        createdAt: createdAtInput,
      });

      await ServiceCareer.saveCareer(career);
    } catch (error) {
      console.error("Erro ao salvar carreira:", error);
      throw error;
    }
  };

  const saveTrophies = async (
    event: FormEvent<HTMLFormElement>,
    careerId: string,
    selectedTrophies: string[],
    seasonName: string,
  ) => {
    event.preventDefault();

    if (!selectedTrophies || selectedTrophies.length === 0) {
      alert("Selecione pelo menos um título!");
      return;
    }

    if (!seasonName) {
      alert("Erro: Temporada não identificada!");
      return;
    }

    setIsSaving(true);

    const seasons = [seasonName];
    let updatedTrophies = selectedCareer?.trophies || [];

    try {
      updatedTrophies = await ServiceCareer.saveClubTrophies(
        careerId,
        selectedTrophies,
        seasons,
      );

      if (selectedCareer && setSelectedCareer) {
        setSelectedCareer({
          ...selectedCareer,
          trophies: updatedTrophies,
        });
      }

      setView?.("menu");
    } catch (error) {
      console.error("Erro ao salvar troféus:", error);
      alert("Ocorreu um erro ao salvar os títulos selecionados.");
    } finally {
      setIsSaving(false);
    }
  };

  return { saveCareer, saveTrophies, isSaving };
}
