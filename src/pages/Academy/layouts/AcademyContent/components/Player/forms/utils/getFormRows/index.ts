import { FieldConfig } from "../../types/FieldConfig";
import { PlayerFormTexts } from "../../types/PlayerFormTexts";
import { PlayerDataPayload } from "../../types/PlayerDataPayload";
import { getFormattedArrivalDate } from "../getFormattedArrivalDate";
import { FIFA_COUNTRY_CODES } from "../../../../../../../../../common/constants/FIFA_COUNTRY_CODES";
import { FIFA_NATIONALITIES } from "../../../../../../../../../common/constants/FIFA_NATIONALITIES";
import { formatDateInput } from "../../../../../../../../../common/utils/Date";

type GetFormRowsParams = {
  texts: PlayerFormTexts;
  initialData?: Partial<PlayerDataPayload>;
  sectorsList: string[];
  availablePositions: string[];
  sector: string;
  position: string;
  isEvolution?: boolean;
  setSector: (sector: string) => void;
  setPosition: (position: string) => void;
  nationality: string;
  setNationality: (nationality: string) => void;
  editingAttribute?: string;
  seasonStartYear?: number;
};

export const getFormRows = ({
  texts,
  initialData,
  sectorsList,
  availablePositions,
  sector,
  position,
  isEvolution,
  nationality,
  setSector,
  setPosition,
  setNationality,
  editingAttribute,
  seasonStartYear,
}: GetFormRowsParams): FieldConfig[][] => {
  const allCountries = Object.keys(FIFA_COUNTRY_CODES);
  const filteredCountries = nationality
    ? allCountries.filter((code) => code.includes(nationality))
    : allCountries;

  const ageField: FieldConfig = {
    name: "age",
    label: texts.ageLabel,
    placeholder: texts.agePlaceholder,
    type: "number",
    required: true,
    min: 13,
    max: 99,
    defaultValue: initialData?.age,
    onInput: (e) => (e.currentTarget.value = e.currentTarget.value.slice(0, 2)),
  };

  const birthDateField: FieldConfig = {
    name: "birthDate",
    label: texts.birthDateLabel || "Data de Nascimento",
    placeholder: texts.birthDatePlaceholder || "DD/MM/AAAA",
    type: "text",
    maxLength: 10,
    defaultValue:
      initialData?.birthDate ||
      (initialData?.age && seasonStartYear
        ? `01/01/${seasonStartYear - initialData.age}`
        : ""),
    hideOnEvolution: true,
    onInput: (e) => {
      e.currentTarget.value = formatDateInput(e.currentTarget.value);
    },
  };

  const shirtNumberField: FieldConfig = {
    name: "shirtNumber",
    label: texts.shirtNumberLabel || "Numeração",
    placeholder: texts.shirtNumberPlaceholder || "Ex: 10",
    type: "number",
    min: 1,
    max: 99,
    defaultValue: initialData?.shirtNumber,
    onInput: (e) => (e.currentTarget.value = e.currentTarget.value.slice(0, 2)),
    hideOnEvolution: true,
  };

  const nameField: FieldConfig = {
    name: "name",
    label: texts.nameLabel,
    placeholder: texts.namePlaceholder,
    type: "text",
    required: true,
    defaultValue: initialData?.name,
    hideOnEvolution: true,
  };

  const nationalityField: FieldConfig = {
    name: "nationality",
    label: FIFA_NATIONALITIES[nationality] || texts.nationalityLabel,
    placeholder: texts.nationalityPlaceholder,
    fieldType: "searchable-select",
    options: filteredCountries,
    value: nationality,
    onChange: (e) => {
      const formattedValue = e.target.value
        .replace(/[^a-zA-Z]/g, "")
        .toUpperCase()
        .slice(0, 3);
      setNationality(formattedValue);
    },
    hideOnEvolution: true,
  };

  const sectorField: FieldConfig = {
    name: "sector",
    fieldType: "select",
    label: texts.sectorLabel,
    placeholder: texts.sectorPlaceholder,
    options: sectorsList,
    value: sector,
    onChange: (e) => setSector(e.target.value),
  };

  const positionField: FieldConfig = {
    name: "position",
    fieldType: "select",
    label: texts.positionLabel,
    placeholder: texts.positionPlaceholder,
    options: availablePositions,
    value: position,
    onChange: (e) => setPosition(e.target.value),
    disabled: !sector || availablePositions.length === 0,
  };

  const overallField: FieldConfig = {
    name: "overall",
    label: texts.overallLabel,
    placeholder: texts.overallPlaceholder,
    type: "number",
    required: true,
    min: 30,
    max: 99,
    defaultValue: initialData?.overall,
    onInput: (e) => (e.currentTarget.value = e.currentTarget.value.slice(0, 2)),
  };

  const potentialField: FieldConfig = {
    name: "potential",
    label: texts.potentialLabel,
    placeholder: texts.potentialPlaceholder,
    type: "text",
    required: true,
    maxLength: 5,
    pattern: "\\d{2}-\\d{2}",
    defaultValue: initialData?.potential,
    onInput: (e) => {
      let val = e.currentTarget.value.replace(/\D/g, "");
      if (val.length > 2) {
        val = val.substring(0, 2) + "-" + val.substring(2, 4);
      }
      e.currentTarget.value = val;
    },
  };

  const heightField: FieldConfig = {
    name: "height",
    label: texts.heightLabel,
    placeholder: texts.heightPlaceholder,
    type: "number",
    required: true,
    min: 100,
    max: 999,
    defaultValue: initialData?.height,
    onInput: (e) => (e.currentTarget.value = e.currentTarget.value.slice(0, 3)),
  };

  const weightField: FieldConfig = {
    name: "weight",
    label: texts.weightLabel,
    placeholder: texts.weightPlaceholder,
    type: "number",
    required: true,
    min: 1,
    max: 99,
    defaultValue: initialData?.weight,
    onInput: (e) => (e.currentTarget.value = e.currentTarget.value.slice(0, 2)),
  };

  const arrivalDateField: FieldConfig = {
    name: "arrivalDate",
    label: texts.arrivalDateLabel,
    placeholder: texts.arrivalDatePlaceholder,
    type: "text",
    required: true,
    maxLength: 5,
    defaultValue: getFormattedArrivalDate(initialData?.arrivalDate),
    hideOnEvolution: true,
    onInput: (e) => {
      let val = e.currentTarget.value.replace(/\D/g, "");
      if (val.length > 2) {
        val = val.substring(0, 2) + "/" + val.substring(2, 4);
      }
      e.currentTarget.value = val;
    },
  };

  const evolutionDateField: FieldConfig = {
    name: "evolutionDate",
    label: texts.evolutionDateLabel,
    placeholder: texts.evolutionDatePlaceholder,
    type: "text",
    required: true,
    maxLength: 5,
    defaultValue: initialData?.evolutionDate,
    onInput: (e) => {
      let val = e.currentTarget.value.replace(/\D/g, "");
      if (val.length > 2) {
        val = val.substring(0, 2) + "/" + val.substring(2, 4);
      }
      e.currentTarget.value = val;
    },
  };

  if (editingAttribute) {
    const attributeMap: Record<string, FieldConfig> = {
      overall: overallField,
      potential: potentialField,
      age: ageField,
      height: heightField,
      weight: weightField,
      sector: sectorField,
      position: positionField,
      shirtNumber: shirtNumberField,
      birthDate: birthDateField,
    };

    const specificField = attributeMap[editingAttribute];
    if (specificField) {
      return [[specificField], [evolutionDateField]];
    }
  }

  if (isEvolution) {
    return [
      [sectorField, positionField],
      [overallField, potentialField],
      [heightField, weightField],
      [evolutionDateField],
    ];
  }

  return [
    [nameField, nationalityField],
    [sectorField, positionField],
    [overallField, potentialField],
    [heightField, weightField, shirtNumberField],
    [birthDateField, arrivalDateField],
  ];
};
