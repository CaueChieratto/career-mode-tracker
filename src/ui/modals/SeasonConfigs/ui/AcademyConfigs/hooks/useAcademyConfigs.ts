import { Dispatch, SetStateAction, useState } from "react";
import { ServiceSeasons } from "../../../../../../common/services/ServiceSeasons";
import { AcademyData } from "../../../../../../common/interfaces/AcademyData";
import { Career } from "../../../../../../common/interfaces/Career";
import { toast } from "../../../../../../common/services/ToastService";

type UseAcademyConfigsParams = {
  career: Career;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
};

export const useAcademyConfigs = ({
  career,
  setSelectedCareer,
}: UseAcademyConfigsParams) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAcademy = async (
    name: string,
    tournament: string,
    nickname: string,
  ) => {
    try {
      setIsSaving(true);
      const academyData: AcademyData = { name, tournament, nickname };

      await ServiceSeasons.updateAcademy(career.id, academyData);

      setSelectedCareer({ ...career, academy: academyData });
      toast.success("Configurações da base salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar dados da base:", error);
      toast.error("Ocorreu um erro ao salvar os dados da base.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleSaveAcademy,
  };
};
