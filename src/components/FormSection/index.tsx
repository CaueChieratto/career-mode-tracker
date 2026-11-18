import { forwardRef } from "react";
import { useSeasonTheme } from "../../common/hooks/Seasons/UseSeasonTheme";
import ContainerIcon from "../ContainerIcon";
import FieldRenderer from "../FieldRenderer";
import Label from "../Label";
import Styles from "./FormSection.module.css";
import { Field, FormSectionProps } from "./types";

export type * from "./types";

const filterRowsByState = (
  rows: readonly (readonly Field[])[],
  isEditing?: boolean,
  formValues?: Record<string, string>,
  isGoalkeeper?: boolean,
) => {
  const isSigning = formValues?.["isSigning"] === "true";

  return rows
    .map((fields) =>
      fields.filter((field) => {
        if (field.addOnly && isEditing) return false;
        if (field.editOnly && !isEditing) return false;
        if (field.isSigningOnly && !isSigning) return false;
        if (isGoalkeeper) {
          if (field.id === "goals") return false;
        } else {
          if (field.id === "cleanSheets") return false;
        }
        return true;
      }),
    )
    .filter((fields) => fields.length > 0);
};

const FormSection = forwardRef<HTMLDivElement, FormSectionProps>(
  (props, ref) => {
    const {
      title,
      hideTitle,
      rows,
      isEditing,
      isGoalkeeper,
      isMatch,
      formValues,
      onActionClick,
      onInputChange,
      onKeyDown,
      onKeyUp,
      onBooleanChange,
      onSelectOption,
    } = props;

    const { clubColor } = useSeasonTheme();

    const visibleRows = filterRowsByState(
      rows,
      isEditing,
      formValues,
      isGoalkeeper,
    );

    if (visibleRows.length === 0) {
      return null;
    }

    return (
      <>
        {!hideTitle && title && (
          <h2 className={Styles.section_title} ref={ref}>
            {title}
          </h2>
        )}
        <div className={Styles.form_section}>
          {visibleRows.map((fields, rowIndex) => {
            const isMatchRow =
              isMatch ||
              fields.some((field) => field.isMatch || field.id === "nation");

            return (
              <div
                key={rowIndex}
                style={isMatchRow ? { alignItems: "flex-end" } : {}}
                className={`${fields.length > 1 ? Styles.form_row : ""} ${
                  isMatchRow ? Styles.isMatch : ""
                }`}
              >
                {fields.map((field) => {
                  const isVertical = field.orientation === "vertical";
                  return (
                    <div
                      key={field.id}
                      className={`${Styles.form_group} ${
                        isVertical ? Styles.vertical_group : ""
                      }`}
                      style={isMatchRow ? { justifyContent: "flex-end" } : {}}
                    >
                      <Label
                        htmlFor={field.id}
                        className={`${Styles.label} ${
                          isVertical ? Styles.centered_label : ""
                        }`}
                      >
                        <ContainerIcon className={Styles.icon}>
                          {field.icon}
                        </ContainerIcon>
                        {field.name}
                      </Label>
                      <FieldRenderer
                        onActionClick={onActionClick}
                        field={field}
                        formValues={formValues}
                        clubColor={clubColor}
                        isSelectDisabled={field.disabled}
                        onInputChange={onInputChange}
                        onKeyDown={onKeyDown}
                        onKeyUp={onKeyUp}
                        onBooleanChange={onBooleanChange}
                        onSelectOption={onSelectOption}
                      />
                      {field.note && (
                        <p className={Styles.note}>{field.note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </>
    );
  },
);

export default FormSection;
