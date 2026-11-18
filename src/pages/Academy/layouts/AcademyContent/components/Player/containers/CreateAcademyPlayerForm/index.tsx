import { AcademyService } from "../../../../services/AcademyService";
import { PlayerForm } from "../../forms/components/PlayerForm";
import { PlayerDataPayload } from "../../forms/types/PlayerDataPayload";
import { TEXTS } from "./constants/TEXTS";
import { useAcademyContext } from "../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { getSeasonStartYear } from "../../../../utils/getSeasonStartYear";
import { isEuropeanSeason } from "../../../../utils/isEuropeanSeason";
import { toast, markErrorAsNotified } from "../../../../../../../../common/services/ToastService";

type CreateAcademyPlayerFormProps = {
  onComplete: () => void;
};

export const CreateAcademyPlayerForm = ({
  onComplete,
}: CreateAcademyPlayerFormProps) => {
  const { career, seasonId } = useAcademyContext();

  const addPlayer = async (data: PlayerDataPayload) => {
    try {
      const [day, month] = data.arrivalDate.split("/");
      let year = getSeasonStartYear(career, seasonId);

      const isEurope = isEuropeanSeason(career);
      if (isEurope && Number(month) < 7) {
        year += 1;
      }

      const finalArrivalDate = `${day}/${month}/${year}`;
      const playerData = { ...data, arrivalDate: finalArrivalDate };

      await AcademyService.addPlayerToAcademy(career.id, seasonId, playerData);
      toast.success("Jogador da base cadastrado com sucesso!");
      onComplete();
    } catch (error) {
      console.error("Erro ao adicionar jogador:", error);
      toast.error("Falha ao salvar o jogador. Tente novamente.");
      throw markErrorAsNotified(error);
    }
  };

  return <PlayerForm texts={TEXTS} onSubmitData={addPlayer} />;
};
