import { PlayerDataPayload } from "../../types/PlayerDataPayload";
import { PlayerFormTexts } from "../../types/PlayerFormTexts";
import { usePlayerForm } from "../../hooks/usePlayerForm";
import { AcademyFormRenderer } from "../../../../AcademyFormRenderer";

type PlayerFormProps = {
  texts: PlayerFormTexts;
  onSubmitData: (data: PlayerDataPayload) => Promise<void>;
  initialData?: Partial<PlayerDataPayload>;
  isEvolution?: boolean;
  editingAttribute?: string;
};

export const PlayerForm = (props: PlayerFormProps) => {
  const { isLoading, sector, position, submit, formRows } =
    usePlayerForm(props);

  return (
    <AcademyFormRenderer
      formRows={formRows}
      onSubmit={submit}
      submitText={props.texts.submitText}
      loadingText={props.texts.loadingText}
      isLoading={isLoading}
      isEvolution={props.isEvolution}
      hiddenFields={[
        { name: "sector", value: sector },
        { name: "position", value: position },
      ]}
    />
  );
};
