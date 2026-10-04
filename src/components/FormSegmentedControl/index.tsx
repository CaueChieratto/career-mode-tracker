import Button from "../Button";
import Styles from "./FormSection.module.css";

type FormSegmentedControlProps = {
  name: string;
  clubColor: string;
  options?: readonly string[];
  value?: boolean | string;
  onChange?: (value: boolean) => void;
  onOptionChange?: (value: string) => void;
  action?: () => void;
};

const FormSegmentedControl = ({
  name,
  value,
  clubColor,
  options,
  onChange,
  onOptionChange,
  action,
}: FormSegmentedControlProps) => {
  if (action) {
    return (
      <div className={Styles.segmented_control}>
        <input type="hidden" name={name} value={String(value)} />
        <Button
          type="button"
          style={{ backgroundColor: clubColor, color: "white", flex: 1 }}
          onClick={action}
        >
          Sim
        </Button>
      </div>
    );
  }

  if (options && options.length > 0) {
    const currentValue =
      typeof value === "string" ? value : (options[0] ?? "");

    return (
      <div className={Styles.segmented_control}>
        <input type="hidden" name={name} value={currentValue} />
        {options.map((option) => {
          const isActive = currentValue === option;
          return (
            <Button
              key={option}
              type="button"
              className={isActive ? Styles.active : ""}
              style={isActive ? { backgroundColor: clubColor } : {}}
              onClick={() => onOptionChange?.(option)}
            >
              {option}
            </Button>
          );
        })}
      </div>
    );
  }

  const isChecked = typeof value === "boolean" ? value : value === "true";

  return (
    <div className={Styles.segmented_control}>
      <input type="hidden" name={name} value={String(isChecked)} />
      <Button
        type="button"
        className={!isChecked ? Styles.active : ""}
        style={!isChecked ? { backgroundColor: clubColor } : {}}
        onClick={() => onChange?.(false)}
      >
        Não
      </Button>
      <Button
        type="button"
        className={isChecked ? Styles.active : ""}
        style={isChecked ? { backgroundColor: clubColor } : {}}
        onClick={() => onChange?.(true)}
      >
        Sim
      </Button>
    </div>
  );
};

export default FormSegmentedControl;
