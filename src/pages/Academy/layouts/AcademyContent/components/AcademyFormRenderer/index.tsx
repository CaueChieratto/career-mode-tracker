import React from "react";
import Button from "../../../../../../components/Button";
import CustomSelect from "../../../../../../components/CustomSelect";
import SearchableSelect from "../../../../../../components/SearchableSelect";
import { FormInput } from "../FormInput";
import { FieldConfig } from "../Player/forms/types/FieldConfig";
import Styles from "./AcademyFormRenderer.module.css";

export type AcademyFormHiddenField = {
  name: string;
  value: string;
};

export type AcademyFormRendererProps = {
  formRows: FieldConfig[][];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitText: string;
  loadingText: string;
  isLoading: boolean;
  isEvolution?: boolean;
  hiddenFields?: AcademyFormHiddenField[];
  alwaysGridRow?: boolean;
};

export const AcademyFormRenderer = ({
  formRows,
  onSubmit,
  submitText,
  loadingText,
  isLoading,
  isEvolution = false,
  hiddenFields = [],
  alwaysGridRow = false,
}: AcademyFormRendererProps) => {
  return (
    <form className={Styles.formContainer} onSubmit={onSubmit}>
      {hiddenFields.map((hidden) => (
        <input
          key={hidden.name}
          type="hidden"
          name={hidden.name}
          value={hidden.value}
        />
      ))}

      {formRows.map((row, rowIndex) => {
        const visibleFields = row.filter(
          (field) => !(isEvolution && field.hideOnEvolution),
        );

        if (visibleFields.length === 0) return null;

        const rowClass =
          row.length === 3
            ? Styles.rowThree
            : row.length === 2
              ? Styles.row
              : alwaysGridRow
                ? Styles.row
                : "";

        return (
          <div className={rowClass} key={rowIndex}>
            {visibleFields.map((field) => {
              if (field.fieldType === "select") {
                return (
                  <div className={Styles.wrapper} key={field.name}>
                    <label className={Styles.label}>{field.label}</label>
                    <CustomSelect
                      name={field.name}
                      options={field.options || []}
                      value={field.value || ""}
                      placeholder={field.placeholder}
                      className={Styles.selectTrigger}
                      onChange={field.onChange || (() => {})}
                      disabled={field.disabled}
                    />
                  </div>
                );
              }

              if (field.fieldType === "searchable-select") {
                return (
                  <div className={Styles.wrapper} key={field.name}>
                    <label className={Styles.label}>{field.label}</label>
                    <SearchableSelect
                      name={field.name}
                      options={field.options || []}
                      value={field.value || ""}
                      placeholder={field.placeholder}
                      onChange={field.onChange || (() => {})}
                      disabled={field.disabled}
                      className={Styles.selectTrigger}
                    />
                  </div>
                );
              }

              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { label, hideOnEvolution, fieldType, ...inputProps } =
                field;

              return (
                <FormInput key={field.name} label={label} {...inputProps} />
              );
            })}
          </div>
        );
      })}

      <Button className={Styles.submitBtn} type="submit" disabled={isLoading}>
        {isLoading ? loadingText : submitText}
      </Button>
    </form>
  );
};

export default AcademyFormRenderer;
