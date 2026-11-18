import { ModalType } from "../../common/types/enums/ModalType";

export type Field = {
  id: string;
  name: string;
  icon: React.ReactNode;
  checkbox?: boolean;
  inputType?: string;
  placeholder?: string;
  options?: readonly string[];
  disabled?: boolean;
  transform?: "uppercase" | "capitalize";
  maxLength?: number;
  max?: number;
  min?: number;
  note?: string;
  isSigningOnly?: boolean;
  editOnly?: boolean;
  addOnly?: boolean;
  action?: ModalType | string;
  useAlternateStyle?: boolean;
  orientation?: "horizontal" | "vertical";
  isMatch?: boolean;
  required?: boolean;
};

export type FormSectionProps = {
  title?: string;
  hideTitle?: boolean;
  rows: readonly (readonly Field[])[];
  formValues?: Record<string, string>;
  isGoalkeeper?: boolean;
  isMatch?: boolean;
  isEditing?: boolean;
  onInputChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: Field,
  ) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBooleanChange?: (name: string, value: boolean) => void;
  onActionClick?: (modal: ModalType | string) => void;
  onSelectOption?: (option: string, field: Field) => void;
};

