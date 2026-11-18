import { AcademyMatches } from "../../../../../../../../../../../common/interfaces/AcademyData";
import { FieldConfig } from "../../../../../../Player/forms/types/FieldConfig";
import { MatchFormTexts } from "../../types/MatchFormTexts";

type GetMatchFormRowsParams = {
  texts: MatchFormTexts;
  teamOptions: string[];
  statusOptions: string[];
  opponentTeam: string;
  setOpponentTeam: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  initialData?: Partial<AcademyMatches>;
};

export const getMatchFormRows = ({
  texts,
  teamOptions,
  opponentTeam,
  setOpponentTeam,
  initialData,
  setStatus,
  status,
  statusOptions,
}: GetMatchFormRowsParams): FieldConfig[][] => {
  const dateField: FieldConfig = {
    name: "date",
    label: texts.dateLabel,
    placeholder: texts.datePlaceholder,
    type: "text",
    required: true,
    maxLength: 5,
    defaultValue: initialData?.date ? initialData.date.substring(0, 5) : "",
    onInput: (e) => {
      let val = e.currentTarget.value.replace(/\D/g, "");
      if (val.length > 2) {
        val = val.substring(0, 2) + "/" + val.substring(2, 4);
      }
      e.currentTarget.value = val;
    },
  };

  const statusField: FieldConfig = {
    name: "status",
    label: texts.statusLabel,
    placeholder: texts.statusPlaceholder,
    fieldType: "searchable-select",
    options: statusOptions,
    value: status,
    onChange: (e) => setStatus(e.target.value),
  };

  const opponentField: FieldConfig = {
    name: "opponentTeam",
    label: texts.opponentLabel,
    placeholder: texts.opponentPlaceholder,
    fieldType: "searchable-select",
    options: teamOptions,
    value: opponentTeam,
    onChange: (e) => setOpponentTeam(e.target.value),
  };

  return [[dateField, statusField], [opponentField]];
};
