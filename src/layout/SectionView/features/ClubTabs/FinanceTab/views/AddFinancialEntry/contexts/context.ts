import { createContext, useContext } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { FinancialEntry } from "../../../../../../../../common/interfaces/finance";
import { OptimisticUpdateData } from "../../../../../../helpers/updateSectionCareer";
import { SectionScreen } from "../../../../../../config/screens";
import { Field } from "../../../../../../../../components/FormSection";

export interface AddFinancialEntryContextValue {
  career: Career;
  season: ClubData;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  onOpenTransfers?: (type: "arrivals" | "exit") => void;
  notSeason?: boolean;
  currency: string;
  type: "revenue" | "expense";
  setType: React.Dispatch<React.SetStateAction<"revenue" | "expense">>;
  category: string;
  setCategory: React.Dispatch<React.SetStateAction<string>>;
  amountStr: string;
  setAmountStr: React.Dispatch<React.SetStateAction<string>>;
  errorMessage: string | null;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  customCategories: { revenues: string[]; expenses: string[] };
  allAvailableCategories: string[];
  isNewCategory: boolean;
  handleAddNewCategory: () => Promise<void>;
  parsedAmount: number;
  formValues: Record<string, string>;
  formSections: { title: string; fields: Field[][] }[];
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
    field?: Field,
  ) => void;
  handleInputBlur?: (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
    field?: Field,
  ) => void;
  handleSave: () => Promise<void>;
  formRef: React.RefObject<HTMLFormElement>;
  entries: FinancialEntry[];
  editingEntry: FinancialEntry | null;
  isEditing: boolean;
  loadEntryForEdit: (entry: FinancialEntry) => void;
  handleCancelEdit: () => void;
  handleDeleteEntry: (entryId: string) => Promise<void>;
  handleRedirectToSource: (entry: FinancialEntry) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  highlightedCategory: string | null;
  setHighlightedCategory: React.Dispatch<React.SetStateAction<string | null>>;
  handleSelectCategoryOption: (option: string, field: Field) => void;
}

export const AddFinancialEntryContext =
  createContext<AddFinancialEntryContextValue | null>(null);

export const useAddFinancialEntryContext = (): AddFinancialEntryContextValue => {
  const ctx = useContext(AddFinancialEntryContext);
  if (!ctx) {
    throw new Error(
      "useAddFinancialEntryContext deve ser usado dentro de AddFinancialEntryProvider",
    );
  }
  return ctx;
};
