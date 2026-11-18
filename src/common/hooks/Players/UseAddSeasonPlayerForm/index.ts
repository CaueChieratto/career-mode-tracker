import { useCallback, useMemo, useState } from "react";
import { Field } from "../../../../components/FormSection";
import { formatRating } from "../../../utils/FormatRating";
import { mergeFormValues } from "../../UseForm";

export const useAddSeasonPlayerForm = () => {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [booleanValues, setBooleanValues] = useState<Record<string, boolean>>({
    ballonDor: false,
  });

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      field: Field
    ) => {
      const { name, value } = e.target;
      let processedValue = value;

      if (field.id === "rating") {
        processedValue = formatRating(value.replace(",", "."));
      }

      setFormValues((prev) => ({
        ...prev,
        [name]: processedValue,
      }));
    },
    []
  );

  const handleBooleanChange = useCallback((name: string, value: boolean) => {
    setBooleanValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const mergedFormValues = useMemo(
    () => mergeFormValues(formValues, booleanValues),
    [formValues, booleanValues],
  );

  return {
    formValues,
    setFormValues,
    handleInputChange,
    booleanValues,
    mergedFormValues,
    handleBooleanChange,
  };
};
