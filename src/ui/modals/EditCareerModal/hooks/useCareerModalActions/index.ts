import { FormEvent } from "react";
import { Career } from "../../../../../common/interfaces/Career";
import { ServiceCareer } from "../../../../../common/services/ServiceCareer";
import { UseCreateCareer } from "../../../../../common/hooks/Career/UseCreateCareer";
import { CloudinaryService } from "../../../../../common/services/CloudinaryService";
import { SaveEditClub } from "../SaveEditClub";
import { convertStringToDate } from "../../helpers/convertStringToDate";
import { CAREER_COUNTRY_OPTIONS } from "../../constants/countryOptions";
import { CareerModalMode } from "../useClubImgAndColor";
import { toast } from "../../../../../common/services/ToastService";

export type UseCareerModalActionsProps = {
  mode: CareerModalMode;
  selectedCareer?: Career;
  setSelectedCareer?: React.Dispatch<React.SetStateAction<Career>>;
  closeModal: () => void;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  clubName: string;
  nation: string;
  managerName: string;
  createdAt: string;
  primaryColor: string;
  secondaryColor: string;
  file: File | null;
};

export const useCareerModalActions = ({
  mode,
  selectedCareer,
  setSelectedCareer,
  closeModal,
  setIsLoading,
  clubName,
  nation,
  managerName,
  createdAt,
  primaryColor,
  secondaryColor,
  file,
}: UseCareerModalActionsProps) => {
  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === "create") {
      if (!clubName.trim() || !nation.trim() || !managerName.trim()) {
        toast.warning(
          "Preencha todos os campos obrigatórios (Clube, País e Técnico)!",
        );
        return;
      }

      if (!CAREER_COUNTRY_OPTIONS.includes(nation.trim())) {
        toast.warning("Selecione um país válido da lista!");
        return;
      }

      if (!primaryColor || !secondaryColor) {
        toast.warning("Selecione as 2 cores do clube!");
        return;
      }

      setIsLoading(true);

      try {
        const newCareer = await UseCreateCareer({
          club: clubName,
          manager: managerName,
          nation,
          createdAt,
          primaryColor,
          secondaryColor,
        });

        await ServiceCareer.saveCareer(newCareer);
        toast.success("Carreira criada com sucesso!");
        closeModal();
      } catch (error) {
        console.error("Erro ao criar carreira:", error);
        const msg =
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao criar a carreira.";
        if (msg.toLowerCase().includes("preencha")) {
          toast.warning(msg);
        } else {
          toast.error(msg);
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!selectedCareer) {
      toast.warning("Nenhuma carreira selecionada.");
      return;
    }

    if (mode === "edit" && (!clubName.trim() || !managerName.trim())) {
      toast.warning("Clube e Técnico não podem ficar vazios!");
      return;
    }

    setIsLoading(true);

    try {
      let finalImageUrl: string | undefined = undefined;

      if (file) {
        finalImageUrl = await CloudinaryService.uploadImage(file);
      }

      const dateToSave = convertStringToDate(createdAt);

      const updatedCareer = await SaveEditClub(
        selectedCareer,
        primaryColor,
        secondaryColor,
        finalImageUrl,
        clubName.trim(),
        managerName.trim(),
        dateToSave,
      );

      setSelectedCareer?.(updatedCareer);
      toast.success("Carreira atualizada com sucesso!");
      closeModal();
    } catch (error) {
      console.error("Erro ao atualizar o clube:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao atualizar o clube.";
      if (
        msg.toLowerCase().includes("preencha") ||
        msg.toLowerCase().includes("vazio")
      ) {
        toast.warning(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSave };
};
