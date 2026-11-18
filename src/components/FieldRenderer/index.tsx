import { useMemo } from "react";
import { ModalType } from "../../common/types/enums/ModalType";
import FormField from "../FormField";
import { Field, FormSectionProps } from "../FormSection/types";
import FormSegmentedControl from "../FormSegmentedControl";
import FormSelect from "../FormSelect";
import SearchableSelect from "../SearchableSelect";
import { positionOptionsBySector } from "../../common/types/Positions";

type RendererProps = FieldRendererProps & {
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
};

const EMPTY_OPTIONS: readonly string[] = [];

const LEGACY_SECTOR_MAP: Record<string, keyof typeof positionOptionsBySector> = {
  Atacantes: "Ataque",
  Ataque: "Ataque",
  Meias: "Meia",
  Meia: "Meia",
  Defensores: "Defesa",
  Defesa: "Defesa",
  Goleiros: "Goleiro",
  Goleiro: "Goleiro",
};

const normalizeSector = (
  sec?: string,
): keyof typeof positionOptionsBySector | undefined => {
  if (!sec) return undefined;
  return LEGACY_SECTOR_MAP[sec];
};

const CustomSelectRenderer = ({
  field,
  formValues,
  isSelectDisabled,
  onChange,
}: Omit<RendererProps, "onChange"> & {
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) => {
  const options = useMemo(() => {
    if (field.id === "position" && formValues?.sector) {
      const norm = normalizeSector(formValues.sector);
      return (norm && positionOptionsBySector[norm]) || EMPTY_OPTIONS;
    }
    if (field.id === "swapPlayerPosition" && formValues?.swapPlayerSector) {
      const norm = normalizeSector(formValues.swapPlayerSector);
      return (norm && positionOptionsBySector[norm]) || EMPTY_OPTIONS;
    }
    return field.options || EMPTY_OPTIONS;
  }, [field.id, field.options, formValues?.sector, formValues?.swapPlayerSector]);

  const isDisabled =
    isSelectDisabled ||
    (field.id === "position" && !formValues?.sector) ||
    (field.id === "swapPlayerPosition" && !formValues?.swapPlayerSector);

  let value = formValues?.[field.id] ?? "";
  if (field.id === "timing") {
    if (value === "Imediato") value = "Imediata";
    if (value === "Próxima Janela" || value === "Proxima janela") value = "Proxima Janela";
    if (value === "Próxima Temporada" || value === "Proxima temporada") value = "Proxima Temporada";
  }
  if (field.id === "installmentsPercentage") {
    if (!value || value === "Sem parcelas") {
      value = "Nenhum";
    } else {
      const matched =
        options.find((opt) => opt === value) ||
        options.find((opt) => opt.startsWith(value.slice(0, 3))) ||
        options.find((opt) => opt.startsWith(value.split(" ")[0]));
      if (matched) value = matched;
    }
  }
  if (field.id === "installmentsYears") {
    const pct = formValues?.installmentsPercentage;
    const isPctNone = !pct || pct === "Nenhum" || pct === "Sem parcelas";
    if (isPctNone || !value || value === "Nenhum") {
      value = "Nenhum";
    } else {
      const matched =
        options.find((opt) => opt === value) ||
        options.find((opt) => opt.startsWith(value.split(" ")[0] + " "));
      if (matched) value = matched;
    }
  }

  return (
    <FormSelect
      field={{ ...field, options }}
      value={value}
      isDisabled={isDisabled}
      onChange={onChange}
    />
  );
};

const CheckboxRenderer = ({
  field,
  clubColor,
  onActionClick,
  formValues,
  onBooleanChange,
}: FieldRendererProps) => {
  if ("action" in field && field.action) {
    return (
      <FormSegmentedControl
        name={field.id}
        clubColor={clubColor}
        action={() => onActionClick?.(field.action as ModalType)}
      />
    );
  }

  const isChecked = formValues?.[field.id] === "true";

  return (
    <FormSegmentedControl
      name={field.id}
      value={isChecked}
      clubColor={clubColor}
      onChange={(value) => onBooleanChange?.(field.id, value)}
    />
  );
};

type FieldRendererProps = Pick<
  FormSectionProps,
  | "formValues"
  | "onInputChange"
  | "onKeyDown"
  | "onKeyUp"
  | "onBooleanChange"
  | "onSelectOption"
> & {
  field: Field;
  clubColor: string;
  isSelectDisabled?: boolean;
  onActionClick?: (modal: ModalType | string) => void;
};

const FieldRenderer = (props: FieldRendererProps) => {
  const {
    field,
    onInputChange,
    onKeyDown,
    onKeyUp,
    formValues,
    clubColor,
    onSelectOption,
  } = props;
  const value = formValues?.[field.id] ?? "";

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | {
          target: {
            name: string;
            value: string;
            isExplicitSelection?: boolean;
          };
        },
  ) => {
    onInputChange?.(e as React.ChangeEvent<HTMLInputElement>, field);
  };

  if (field.inputType === "custom-select") {
    return <CustomSelectRenderer {...props} onChange={handleInputChange} />;
  }

  if (field.inputType === "searchable-select") {
    return (
      <SearchableSelect
        name={field.id}
        options={field.options || []}
        value={value}
        placeholder={field.placeholder}
        onChange={handleInputChange}
        onSelectOption={(opt) => onSelectOption?.(opt, field)}
        disabled={field.disabled}
        useAlternateStyle={field.useAlternateStyle}
      />
    );
  }

  if (field.inputType === "segmented" && field.options) {
    return (
      <FormSegmentedControl
        name={field.id}
        clubColor={clubColor}
        options={field.options}
        orientation={field.orientation}
        value={value || field.options[0]}
        onOptionChange={(option) =>
          handleInputChange({ target: { name: field.id, value: option } })
        }
      />
    );
  }

  if (field.checkbox) {
    return <CheckboxRenderer {...props} />;
  }

  return (
    <FormField
      field={field}
      value={value}
      onChange={handleInputChange}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    />
  );
};

export default FieldRenderer;
