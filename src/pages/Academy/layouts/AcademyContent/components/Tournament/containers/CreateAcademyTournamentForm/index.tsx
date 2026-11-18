import { AcademyService } from "../../../../services/AcademyService";
import { TournamentForm } from "../../forms/components/TournamentForm";
import { useAcademyContext } from "../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { getTournamentTexts } from "./constants/TEXTS";
import { getSeasonStartYear } from "../../../../utils/getSeasonStartYear";
import { isEuropeanSeason } from "../../../../utils/isEuropeanSeason";
import { TournamentDataPayload } from "../../forms/types/TournamentDataPayload";
import { toast, markErrorAsNotified } from "../../../../../../../../common/services/ToastService";

type CreateAcademyTournamentFormProps = {
  onComplete: () => void;
};

export const CreateAcademyTournamentForm = ({
  onComplete,
}: CreateAcademyTournamentFormProps) => {
  const { career, seasonId, tournamentsAcademy } = useAcademyContext();

  const tournamentName = career.academy!.tournament;
  const texts = getTournamentTexts(tournamentName);

  const addTournament = async (data: TournamentDataPayload) => {
    try {
      const [day, month] = data.date.split("/");
      let year = getSeasonStartYear(career, seasonId);

      const isEurope = isEuropeanSeason(career);
      if (isEurope && Number(month) < 7) {
        year += 1;
      }

      const finalDate = `${day}/${month}/${year}`;

      let totalPreviousEditions = 0;
      for (const season of career.clubData) {
        if (season.id === seasonId) break;
        const prevTournaments = await AcademyService.getTournamentsAcademy(
          career.id,
          season.id,
        );
        totalPreviousEditions += prevTournaments.length;
      }

      const editionNumber =
        totalPreviousEditions + tournamentsAcademy.length + 1;

      const tournamentData = {
        name: `${career.academy!.tournament} - ${editionNumber}ª Edição`,
        date: finalDate,
        totalMatches: 0,
        matches: [],
        tournamentResult: "Torneio Marcado",
        isChampion: false,
      };

      await AcademyService.addTournamentToAcademy(
        career.id,
        seasonId,
        tournamentData,
      );
      toast.success("Torneio da base criado com sucesso!");
      onComplete();
    } catch (error) {
      console.error("Erro ao adicionar torneio:", error);
      toast.error("Falha ao salvar o torneio. Tente novamente.");
      throw markErrorAsNotified(error);
    }
  };

  return <TournamentForm texts={texts} onSubmitData={addTournament} />;
};
