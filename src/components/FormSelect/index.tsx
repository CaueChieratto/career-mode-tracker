import CustomSelect from "../CustomSelect";
import { Field } from "../FormSection/types";

type FormSelectProps = {
  field: Field;
  value: string;
  isDisabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};

const FormSelect = ({
  field,
  value,
  isDisabled,
  onChange,
}: FormSelectProps) => {
  const handleChangeAdapter = (event: {
    target: { name: string; value: string };
  }) => {
    const syntheticEvent = {
      target: {
        name: event.target.name,
        value: event.target.value,
      },
    } as React.ChangeEvent<HTMLSelectElement>;

    onChange(syntheticEvent);
  };

  return (
    <>
      <input type="hidden" name={field.id} value={value} />
      <CustomSelect
        name={field.id}
        value={value}
        options={field.options || []}
        placeholder={isDisabled ? "Selecione o setor" : field.placeholder}
        disabled={isDisabled}
        onChange={handleChangeAdapter}
      />
    </>
  );
};

export default FormSelect;
