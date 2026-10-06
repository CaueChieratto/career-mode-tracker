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
  editOnly?: boolean;
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
  incomingLoanPlayerOnly?: boolean;
  returnIncomingLoanOnly?: boolean;
  hideOnReturnIncomingLoan?: boolean;
  disabled?: boolean;
}

export interface SquadFormSection<T extends SquadFormField> {
  title: string;
  editOnly?: boolean;
  addOnly?: boolean;
  fields: T[][];
}

interface FieldConditionContext {
  isEditing: boolean;
  isLoaned: boolean;
  isIncomingLoanPlayer: boolean;
  isReturningIncomingLoan?: boolean;
  isSigning: boolean;
  isIncomingLoan: boolean;
  isKnownPlayer: boolean;
  hasGroupId: boolean;
  hasInitialPlayedWithUs?: boolean;
}

export const filterFormSections = <T extends SquadFormField>(
  sections: SquadFormSection<T>[],
  context: FieldConditionContext,
): Array<Omit<SquadFormSection<T>, "fields"> & { fields: T[][] }> => {
  return sections
    .filter(
      (section) =>
        (!section.editOnly || context.isEditing) &&
        (!section.addOnly || !context.isEditing),
    )
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
            if (field.incomingLoanPlayerOnly && !context.isIncomingLoanPlayer)
              return false;
            if (field.returnIncomingLoanOnly && !context.isReturningIncomingLoan)
              return false;
            if (field.hideOnReturnIncomingLoan && context.isReturningIncomingLoan)
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
            if (
              field.hideOnIncomingLoan &&
              (context.isIncomingLoan || context.isIncomingLoanPlayer)
            )
              return false;
            if (field.isKnownPlayerOnly) {
              if (!context.isKnownPlayer) return false;
              if (context.isEditing && context.hasInitialPlayedWithUs) return false;
            }
            if (field.requiresGroupId && !context.hasGroupId) return false;
            if (field.addOnly && context.isEditing) return false;
            if (field.editOnly && !context.isEditing) return false;

            return true;
          }),
        )
        .filter((row) => row.length > 0);

      if (context.isEditing && section.title === "Detalhes Contratuais") {
        const hasPlayerValueRow = filteredRows.some(
          (r) => r.length === 1 && r[0].id === "playerValue",
        );
        const hasSalaryRow = filteredRows.some(
          (r) => r.length === 1 && r[0].id === "salary",
        );
        const hasContractTime = filteredRows.some((r) =>
          r.some((f) => f.id === "contractTime"),
        );

        if (hasPlayerValueRow && hasSalaryRow && !hasContractTime) {
          const playerValueField = filteredRows
            .find((r) => r.some((f) => f.id === "playerValue"))!
            .find((f) => f.id === "playerValue")!;
          const salaryField = filteredRows
            .find((r) => r.some((f) => f.id === "salary"))!
            .find((f) => f.id === "salary")!;

          const otherRows = filteredRows.filter(
            (r) =>
              !r.some((f) => f.id === "playerValue" || f.id === "salary"),
          );

          const combinedRow = [playerValueField, salaryField];
          return { ...section, fields: [combinedRow, ...otherRows] };
        }
      }

      return { ...section, fields: filteredRows };
    })
    .filter((section) => section.fields.length > 0);
};
