import { FieldConfig } from "../../../../Player/forms/types/FieldConfig";
import { TournamentFormTexts } from "../../types/TournamentFormTexts";
import { AcademyTournaments } from "../../../../../../../../../common/interfaces/AcademyData";

type GetFormRowsParams = {
  texts: TournamentFormTexts;
  isEdit?: boolean;
  initialData?: Partial<AcademyTournaments>;
};

export const getTournamentFormRows = ({
  texts,
  isEdit,
  initialData,
}: GetFormRowsParams): FieldConfig[][] => {
  const defaultDateValue =
    isEdit && initialData?.date ? initialData.date.substring(0, 5) : undefined;

  const dateField: FieldConfig = {
    name: "date",
    label: texts.dateLabel,
    placeholder: texts.datePlaceholder,
    type: "text",
    required: true,
    maxLength: 5,
    defaultValue: defaultDateValue,
    onInput: (e) => {
      let val = e.currentTarget.value.replace(/\D/g, "");
      if (val.length > 2) {
        val = val.substring(0, 2) + "/" + val.substring(2, 4);
      }
      e.currentTarget.value = val;
    },
  };

  return [[dateField]];
};
