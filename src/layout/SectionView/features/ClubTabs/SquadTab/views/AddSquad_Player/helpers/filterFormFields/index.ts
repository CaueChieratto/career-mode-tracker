import { ReactNode } from "react";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";

export interface SquadFormField {
  id: string;
  name: string;
  icon: ReactNode;
  loanOnly?: boolean;
  hideOnIncomingLoanPlayer?: boolean;
  isSigningOnly?: boolean;
  isIncomingLoanOnly?: boolean;
  showOnJoin?: boolean;
  hideOnIncomingLoan?: boolean;
  requiresGroupId?: boolean;
  isKnownPlayerOnly?: boolean;
  hideOnSell?: boolean;
  addOnly?: boolean;
  checkbox?: boolean;
  note?: string;
  inputType?: string;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
  maxLength?: number;
  transform?: "uppercase" | "capitalize";
  action?: ModalType | string;
}

export interface SquadFormSection<T extends SquadFormField> {
  title: string;
  editOnly?: boolean;
  fields: T[][];
}

interface FieldConditionContext {
  isEditing: boolean;
  isLoaned: boolean;
  isIncomingLoanPlayer: boolean;
  isSigning: boolean;
  isIncomingLoan: boolean;
  isKnownPlayer: boolean;
  hasGroupId: boolean;
}

export const filterFormSections = <T extends SquadFormField>(
  sections: SquadFormSection<T>[],
  context: FieldConditionContext,
): Array<Omit<SquadFormSection<T>, "fields"> & { fields: T[][] }> => {
  return sections
    .filter((section) => !section.editOnly || context.isEditing)
    .map((section) => {
      const filteredRows = section.fields
        .map((row) =>
          row.filter((field) => {
            if (
              field.loanOnly &&
              !context.isLoaned &&
              !context.isIncomingLoanPlayer
            )
              return false;
            if (field.hideOnIncomingLoanPlayer && context.isIncomingLoanPlayer)
              return false;
            if (field.isSigningOnly && !context.isSigning) return false;
            if (field.isIncomingLoanOnly && !context.isIncomingLoan)
              return false;
            if (
              field.showOnJoin &&
              !context.isSigning &&
              !context.isIncomingLoan
            )
              return false;
            if (field.hideOnIncomingLoan && context.isIncomingLoan)
              return false;
            if (field.isKnownPlayerOnly && !context.isKnownPlayer) return false;
            if (field.requiresGroupId && !context.hasGroupId) return false;

            return true;
          }),
        )
        .filter((row) => row.length > 0);

      return { ...section, fields: filteredRows };
    })
    .filter((section) => section.fields.length > 0);
};
