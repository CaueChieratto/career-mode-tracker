import { TournamentDataPayload } from "../../types/TournamentDataPayload";
import { TournamentFormTexts } from "../../types/TournamentFormTexts";
import { getTournamentFormRows } from "../../utils/getTournamentFormRows";
import { useAsyncForm } from "../../../../../hooks/useAsyncForm";
import { AcademyTournaments } from "../../../../../../../../../common/interfaces/AcademyData";

type UseTournamentFormProps = {
  texts: TournamentFormTexts;
  onSubmitData: (data: TournamentDataPayload) => Promise<void>;
  isEdit?: boolean;
  initialData?: Partial<AcademyTournaments>;
};

export const useTournamentForm = ({
  texts,
  onSubmitData,
  isEdit,
  initialData,
}: UseTournamentFormProps) => {
  const parseTournamentData = (formData: FormData): TournamentDataPayload => {
    return {
      date: (formData.get("date") as string) || "",
    };
  };

  const { isLoading, submit } = useAsyncForm<TournamentDataPayload>(
    onSubmitData,
    parseTournamentData,
  );

  const formRows = getTournamentFormRows({
    texts,
    isEdit,
    initialData,
  });

  return { isLoading, submit, formRows };
};
