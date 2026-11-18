import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { FinancialEntry } from "../../../../../../../../common/interfaces/finance";
import { ServiceFinance } from "../../../../../../../../common/services/ServiceFinance";
import {
  formatCompactNumber,
  parseValue,
} from "../../../../../../../../common/utils/FormatValue";
import { Field } from "../../../../../../../../components/FormSection";
import { FaMoneyBillWave, FaTag, FaUndo } from "react-icons/fa";

export interface UseFinancialEntryFormProps {
  career: Career;
  notSeason?: boolean;
  isEditing?: boolean;
}

export const useFinancialEntryForm = ({
  career,
  notSeason,
  isEditing,
}: UseFinancialEntryFormProps) => {
  const [type, setType] = useState<"revenue" | "expense">("revenue");
  const [category, setCategory] = useState<string>("");
  const [amountStr, setAmountStr] = useState<string>("");
  const [customCategories, setCustomCategories] = useState<{
    revenues: string[];
    expenses: string[];
  }>({ revenues: [], expenses: [] });

  const refreshCustomCategories = useCallback(async () => {
    if (career?.id) {
      try {
        const cats = await ServiceFinance.getCustomCategories(
          career.id,
          career.groupId,
        );
        setCustomCategories(cats);
      } catch (err) {
        console.error("Erro ao carregar categorias personalizadas:", err);
      }
    }
  }, [career?.id, career?.groupId]);

  useEffect(() => {
    refreshCustomCategories();
  }, [refreshCustomCategories]);

  const currency = career?.currency || "EUR";

  // Categoria 100% controlada pelo usuário: sem opções padrão hardcoded
  const allAvailableCategories = useMemo(() => {
    if (type === "revenue") {
      return customCategories.revenues;
    }
    return customCategories.expenses;
  }, [type, customCategories]);

  const isNewCategory =
    category.trim().length > 0 &&
    !allAvailableCategories.some(
      (c) => c.toLowerCase() === category.trim().toLowerCase(),
    );

  const handleAddNewCategory = async () => {
    const trimmed = category.trim();
    if (!trimmed || notSeason) return;

    await ServiceFinance.saveCustomCategory(
      career.id,
      type,
      trimmed,
      notSeason,
      career.groupId,
    );
    setCustomCategories((prev) => {
      const key = type === "revenue" ? "revenues" : "expenses";
      if (prev[key].includes(trimmed)) return prev;
      return {
        ...prev,
        [key]: [...prev[key], trimmed],
      };
    });
  };

  const parsedAmount = parseValue(amountStr);

  const formValues = useMemo<Record<string, string>>(
    () => ({
      type: type === "revenue" ? "Receita" : "Despesa",
      category,
      amount: amountStr,
    }),
    [type, category, amountStr],
  );

  const formSections: { title: string; fields: Field[][] }[] = useMemo(() => {
    const fields: Field[][] = [
      [
        {
          id: "type",
          name: "Tipo de Lançamento",
          icon: React.createElement(FaTag),
          inputType: "segmented",
          options: ["Receita", "Despesa"],
        },
      ],
      [
        {
          id: "category",
          name: "Categoria",
          icon: React.createElement(FaTag),
          inputType: "searchable-select",
          options: allAvailableCategories,
          placeholder: "Pesquise ou digite uma categoria...",
        },
      ],
      [
        {
          id: "amount",
          name: `Valor (${currency})`,
          icon: React.createElement(FaMoneyBillWave),
          inputType: "text",
          placeholder: "Ex: 150k, 2.5M, 1B",
        },
      ],
    ];

    if (isEditing) {
      fields.push([
        {
          id: "cancelEdit",
          name: "Cancelar edição deste lançamento?",
          icon: React.createElement(FaUndo),
          checkbox: true,
          action: "cancel_edit",
        },
      ]);
    }

    return [
      {
        title: "Dados do Lançamento",
        fields,
      },
    ];
  }, [allAvailableCategories, currency, isEditing]);

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
    field?: Field,
  ) => {
    const fieldId = field?.id || e.target.name;
    const value = e.target.value;

    if (fieldId === "type") {
      setType(value === "Despesa" ? "expense" : "revenue");
      setCategory("");
    } else if (fieldId === "category") {
      setCategory(value);
    } else if (fieldId === "amount") {
      setAmountStr(value);
    }
  };

  const handleInputBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
    field?: Field,
  ) => {
    const fieldId = field?.id || e.target.name;
    if (fieldId === "amount") {
      const parsed = parseValue(amountStr);
      if (parsed > 0) {
        setAmountStr(formatCompactNumber(parsed));
      }
    }
  };

  const loadEntryForEdit = useCallback((entry: FinancialEntry) => {
    setType(entry.type);
    setCategory(entry.category);
    setAmountStr(entry.amount ? formatCompactNumber(entry.amount) : "");
  }, []);

  const resetForm = useCallback((preserveType = true) => {
    if (!preserveType) {
      setType("revenue");
    }
    setCategory("");
    setAmountStr("");
  }, []);

  return {
    type,
    setType,
    category,
    setCategory,
    amountStr,
    setAmountStr,
    customCategories,
    setCustomCategories,
    refreshCustomCategories,
    currency,
    allAvailableCategories,
    isNewCategory,
    handleAddNewCategory,
    parsedAmount,
    formValues,
    formSections,
    handleInputChange,
    handleInputBlur,
    loadEntryForEdit,
    resetForm,
  };
};

export default useFinancialEntryForm;
