import React, { useRef, useState, useCallback } from "react";
import { AddFinancialEntryProps } from "../../index";
import { FinancialEntry } from "../../../../../../../../../common/interfaces/finance";
import { Field } from "../../../../../../../../../components/FormSection";
import {
  AddFinancialEntryContext,
  AddFinancialEntryContextValue,
} from "../context";
import { useFinancialEntryForm } from "../../hooks/useFinancialEntryForm";
import { useFinancialEntryActions } from "../../hooks/useFinancialEntryActions";
import { useFinancialEntriesList } from "../../hooks/useFinancialEntriesList";

export interface AddFinancialEntryProviderProps extends AddFinancialEntryProps {
  children: React.ReactNode;
}

export const AddFinancialEntryProvider: React.FC<
  AddFinancialEntryProviderProps
> = ({
  career,
  season,
  onClose,
  onOpenScreen,
  onOpenTransfers,
  notSeason,
  children,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  const form = useFinancialEntryForm({
    career,
    notSeason,
    isEditing: Boolean(editingEntry),
  });

  const entriesList = useFinancialEntriesList({
    careerId: career?.id,
    seasonId: season?.id,
    season,
    career,
  });

  const handleCancelEdit = useCallback(() => {
    setEditingEntry(null);
    form.resetForm();
  }, [form]);

  const loadEntryForEdit = useCallback(
    (entry: FinancialEntry) => {
      setEditingEntry(entry);
      form.loadEntryForEdit(entry);
      try {
        if (typeof formRef.current?.scrollIntoView === "function") {
          formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch {
        // Silencioso em ambientes headless/JSDOM
      }
    },
    [form],
  );

  const handleSelectCategoryOption = useCallback(
    (option: string, field: Field) => {
      const trimmed = option.trim().toLowerCase();
      const hasMatchingEntry = entriesList.entries.some(
        (e) => e.type === form.type && e.category?.trim().toLowerCase() === trimmed,
      );

      if (hasMatchingEntry) {
        // Usado como busca: limpa o select após selecionar e rola até onde o dado está
        form.setCategory("");
        setHighlightedCategory(option);

        setTimeout(() => {
          try {
            const allCategoryElements = Array.from(
              document.querySelectorAll<HTMLElement>("[data-category]"),
            );
            const target = allCategoryElements.find(
              (el) => el.getAttribute("data-category")?.trim().toLowerCase() === trimmed,
            );

            if (target && typeof target.scrollIntoView === "function") {
              target.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          } catch {
            // Silencioso em ambientes headless/JSDOM
          }
        }, 50);

        setTimeout(() => {
          setHighlightedCategory(null);
        }, 2000);
      } else {
        form.handleInputChange({ target: { name: field.id, value: option } }, field);
      }
    },
    [form, entriesList.entries],
  );

  const actions = useFinancialEntryActions({
    career,
    season,
    onClose,
    onOpenScreen,
    onOpenTransfers,
    notSeason,
    type: form.type,
    category: form.category,
    parsedAmount: form.parsedAmount,
    editingEntry,
    setEditingEntry,
    resetForm: form.resetForm,
    addOrUpdateEntryLocal: entriesList.addOrUpdateEntryLocal,
    removeEntryLocal: entriesList.removeEntryLocal,
    refreshCustomCategories: form.refreshCustomCategories,
  });

  const value: AddFinancialEntryContextValue = {
    career,
    season,
    onClose,
    onOpenScreen,
    onOpenTransfers,
    notSeason,
    currency: form.currency,
    type: form.type,
    setType: form.setType,
    category: form.category,
    setCategory: form.setCategory,
    amountStr: form.amountStr,
    setAmountStr: form.setAmountStr,
    errorMessage: actions.errorMessage,
    setErrorMessage: actions.setErrorMessage,
    customCategories: form.customCategories,
    allAvailableCategories: form.allAvailableCategories,
    isNewCategory: form.isNewCategory,
    handleAddNewCategory: form.handleAddNewCategory,
    parsedAmount: form.parsedAmount,
    formValues: form.formValues,
    formSections: form.formSections,
    handleInputChange: form.handleInputChange,
    handleInputBlur: form.handleInputBlur,
    handleSave: actions.handleSave,
    formRef,
    entries: entriesList.entries,
    editingEntry,
    isEditing: Boolean(editingEntry),
    loadEntryForEdit,
    handleCancelEdit,
    handleDeleteEntry: actions.handleDeleteEntry,
    handleRedirectToSource: actions.handleRedirectToSource,
    deleteConfirmId,
    setDeleteConfirmId,
    highlightedCategory,
    setHighlightedCategory,
    handleSelectCategoryOption,
  };

  return (
    <AddFinancialEntryContext.Provider value={value}>
      {children}
    </AddFinancialEntryContext.Provider>
  );
};
