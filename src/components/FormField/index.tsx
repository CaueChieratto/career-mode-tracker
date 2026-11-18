import { Field } from "../FormSection/types";
import Input from "../Input";
import Styles from "./FormField.module.css";

type FormFieldProps = {
  field: Field;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

const FormField = ({
  field,
  value,
  onChange,
  onKeyDown,
  onKeyUp,
}: FormFieldProps) => {
  return (
    <Input
      id={field.id}
      name={field.id}
      type={field.inputType || "text"}
      placeholder={field.placeholder}
      className={Styles.input}
      value={value}
      onChange={onChange}
      disabled={field.disabled}
      maxLength={field.maxLength}
      max={field.max}
      min={field.min}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    />
  );
};

export default FormField;
