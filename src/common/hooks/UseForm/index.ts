import { useCallback, useState } from "react";
import { Field } from "../../../components/FormSection";
import { capitalizeWords } from "../Formatters/Capitalize";
import { formatDateInputShort } from "../../utils/Date";

export const useForm = () => {
  const [booleanValues, setBooleanValues] = useState<Record<string, boolean>>({
    isSigning: false,
    isCaptain: false,
  });
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      setIsShiftPressed(e.shiftKey);
    },
    [],
  );

  const handleKeyUp = useCallback(() => {
    setIsShiftPressed(false);
  }, []);

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      field: Field,
    ) => {
      const { name, value } = e.target;
      const oldValue = formValues[name] || "";
      let processedValue = value;

      if (["playerValue", "buyValue", "salary"].includes(field.id)) {
        processedValue = value.replace(",", ".");
      } else if (
        field.id === "dateArrival" ||
        field.id === "date" ||
        field.id === "returnDate"
      ) {
        processedValue = formatDateInputShort(value);
      } else if (field.transform === "uppercase") {
        processedValue = processedValue.toUpperCase();
      } else if (field.transform === "capitalize") {
        processedValue = capitalizeWords(
          processedValue,
          isShiftPressed,
          oldValue,
        );
      }

      if (field.maxLength) {
        processedValue = processedValue.slice(0, field.maxLength);
      }

      if (field.inputType === "number") {
        const numValue = parseInt(processedValue, 10);
        if (
          !isNaN(numValue) &&
          field.max !== undefined &&
          numValue > field.max
        ) {
          processedValue = String(field.max);
        }
      }

      setFormValues((prev) => ({
        ...prev,
        [name]: processedValue,
      }));
    },
    [formValues, isShiftPressed],
  );

  const handleBooleanChange = (name: string, value: boolean) => {
    setBooleanValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormValues((prev) => ({
      ...prev,
      [name]: value ? "true" : "false",
    }));

    if (name === "isSigning" && !value) {
      setFormValues((prev) => {
        const newValues = { ...prev };
        delete newValues.buyValue;
        return newValues;
      });
    }
  };

  const handleSigningChange = useCallback((checked: boolean) => {
    handleBooleanChange("isSigning", checked);
  }, []);

  const handleCaptainChange = useCallback((checked: boolean) => {
    handleBooleanChange("isCaptain", checked);
  }, []);

  return {
    booleanValues,
    formValues,
    setFormValues,
    handleInputChange,
    handleKeyDown,
    handleKeyUp,
    handleBooleanChange,
    handleSigningChange,
    handleCaptainChange,
  };
};
