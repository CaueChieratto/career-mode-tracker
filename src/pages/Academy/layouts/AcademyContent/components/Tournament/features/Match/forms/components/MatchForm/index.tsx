import { MatchFormTexts } from "../../types/MatchFormTexts";
import { useMatchForm } from "../../hooks/useMatchForm";
import { AcademyMatches } from "../../../../../../../../../../../common/interfaces/AcademyData";
import { MatchDataPayload } from "../../types/MatchDataPayload";
import { AcademyFormRenderer } from "../../../../../../AcademyFormRenderer";

type MatchFormProps = {
  texts: MatchFormTexts;
  teamOptions: string[];
  statusOptions: string[];
  onSubmitData: (data: MatchDataPayload) => Promise<void>;
  initialData?: Partial<AcademyMatches>;
};

export const MatchForm = (props: MatchFormProps) => {
  const { isLoading, submit, formRows, opponentTeam, status } =
    useMatchForm(props);

  return (
    <AcademyFormRenderer
      formRows={formRows}
      onSubmit={submit}
      submitText={props.texts.submitText}
      loadingText={props.texts.loadingText}
      isLoading={isLoading}
      alwaysGridRow
      hiddenFields={[
        { name: "opponentTeam", value: opponentTeam },
        { name: "status", value: status },
      ]}
    />
  );
};
