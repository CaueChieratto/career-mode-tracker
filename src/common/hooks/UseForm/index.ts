import { useCallback, useMemo, useState } from "react";
import { Field } from "../../../components/FormSection";
import { capitalizeWords } from "../Formatters/Capitalize";
import { formatDateInputShort } from "../../utils/Date";

export const mergeFormValues = <
  TFormValues extends Record<string, string | undefined> = Record<
    string,
    string
  >,
>(
  formValues: TFormValues,
  booleanValues: Record<string, boolean>,
): Record<string, string> => ({
  ...(formValues as Record<string, string>),
  ...Object.fromEntries(
    Object.entries(booleanValues).map(([k, v]) => [k, String(v)]),
  ),
});

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
      const key = name || field.id;
      const oldValue = formValues[key] || "";
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
        [key]: processedValue,
      }));
    },
    [formValues, isShiftPressed],
  );

  const handleBooleanChange = useCallback((name: string, value: boolean) => {
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
  }, []);

  const handleSigningChange = useCallback(
    (checked: boolean) => {
      handleBooleanChange("isSigning", checked);
    },
    [handleBooleanChange],
  );

  const handleCaptainChange = useCallback(
    (checked: boolean) => {
      handleBooleanChange("isCaptain", checked);
    },
    [handleBooleanChange],
  );

  const mergedFormValues = useMemo(
    () => mergeFormValues(formValues, booleanValues),
    [formValues, booleanValues],
  );

  return {
    booleanValues,
    formValues,
    mergedFormValues,
    setFormValues,
    handleInputChange,
    handleKeyDown,
    handleKeyUp,
    handleBooleanChange,
    handleSigningChange,
    handleCaptainChange,
  };
};
