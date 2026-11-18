import { TournamentDataPayload } from "../../types/TournamentDataPayload";
import { TournamentFormTexts } from "../../types/TournamentFormTexts";
import { useTournamentForm } from "../../hooks/useTournamentForm";
import { AcademyTournaments } from "../../../../../../../../../common/interfaces/AcademyData";
import { AcademyFormRenderer } from "../../../../AcademyFormRenderer";

type TournamentFormProps = {
  texts: TournamentFormTexts;
  onSubmitData: (data: TournamentDataPayload) => Promise<void>;
  isEdit?: boolean;
  initialData?: Partial<AcademyTournaments>;
};

export const TournamentForm = (props: TournamentFormProps) => {
  const { isLoading, submit, formRows } = useTournamentForm(props);

  return (
    <AcademyFormRenderer
      formRows={formRows}
      onSubmit={submit}
      submitText={props.texts.submitText}
      loadingText={props.texts.loadingText}
      isLoading={isLoading}
      alwaysGridRow
    />
  );
};
