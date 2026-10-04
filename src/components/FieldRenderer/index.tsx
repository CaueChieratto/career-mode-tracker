import { useMemo } from "react";
import { ModalType } from "../../common/types/enums/ModalType";
import FormField from "../FormField";
import { Field, FormSectionProps } from "../FormSection";
import FormSegmentedControl from "../FormSegmentedControl";
import FormSelect from "../FormSelect";
import SearchableSelect from "../SearchableSelect";
import { positionOptionsBySector } from "../../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/constants/SquadFormFields";

type RendererProps = FieldRendererProps & {
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
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
      return (
        positionOptionsBySector[
          formValues.sector as keyof typeof positionOptionsBySector
        ] || []
      );
    }
    return field.options || [];
  }, [field.id, field.options, formValues?.sector]);

  const isDisabled =
    isSelectDisabled || (field.id === "position" && !formValues?.sector);
  const value = formValues?.[field.id] ?? "";

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
  "formValues" | "onInputChange" | "onKeyDown" | "onKeyUp" | "onBooleanChange"
> & {
  field: Field;
  clubColor: string;
  isSelectDisabled?: boolean;
  onActionClick?: (modal: ModalType) => void;
};

const FieldRenderer = (props: FieldRendererProps) => {
  const { field, onInputChange, onKeyDown, onKeyUp, formValues, clubColor } =
    props;
  const value = formValues?.[field.id] ?? "";

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
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
        disabled={field.disabled}
        useAlternateStyle={field.id === "nation"}
      />
    );
  }

  if (field.inputType === "segmented" && field.options) {
    return (
      <FormSegmentedControl
        name={field.id}
        clubColor={clubColor}
        options={field.options}
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
