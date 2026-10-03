import { Field } from "../FormSection";
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
}: FormFieldProps) => (
  <Input
    className={Styles.input}
    id={field.id}
    name={field.id}
    type={field.inputType || "text"}
    placeholder={field.placeholder}
    value={value}
    disabled={field.disabled}
    onChange={onChange}
    onKeyDown={onKeyDown}
    onKeyUp={onKeyUp}
  />
);

export default FormField;
