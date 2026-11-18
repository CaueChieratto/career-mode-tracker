import React from "react";
import { FaTimes } from "react-icons/fa";
import Button from "../../../../../components/Button";
import ContainerForm from "../../../../../components/ContainerForm";
import Form from "../../../../../components/Form";
import Styles from "./SeasonConfigSubScreen.module.css";

type SeasonConfigSubScreenProps = {
  title: string;
  subtitle: string;
  clubColor?: string;
  darkClubColor?: string;
  confirmLabel: string;
  onConfirm?: () => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  isSaving?: boolean;
  disableBackWhileSaving?: boolean;
  saveButtonClassName?: string;
  wrapperClassName?: string;
  footerClassName?: string;
  afterContent?: React.ReactNode;
  children: React.ReactNode;
};

export const SeasonConfigSubScreen: React.FC<SeasonConfigSubScreenProps> = ({
  title,
  subtitle,
  clubColor,
  darkClubColor,
  confirmLabel,
  onConfirm,
  onSubmit,
  onBack,
  isSaving = false,
  disableBackWhileSaving = false,
  saveButtonClassName,
  wrapperClassName,
  footerClassName,
  afterContent,
  children,
}) => {
  const styleVars = {
    "--club-color": clubColor || "#ffffff",
    ...(darkClubColor ? { "--club-color-dark": darkClubColor } : {}),
  } as React.CSSProperties;

  const body = (
    <>
      <div
        className={
          wrapperClassName
            ? `${Styles.wrapper} ${wrapperClassName}`
            : Styles.wrapper
        }
      >
        <div className={Styles.header}>
          <h2 className={Styles.title}>{title}</h2>
          <p className={Styles.subtitle}>{subtitle}</p>
        </div>
        {children}
      </div>

      {afterContent}

      <div
        className={
          footerClassName
            ? `${Styles.footer} ${footerClassName}`
            : Styles.footer
        }
      >
        {saveButtonClassName ? (
          <button
            type={onSubmit ? "submit" : "button"}
            onClick={onSubmit ? undefined : onConfirm}
            disabled={isSaving}
            className={saveButtonClassName}
          >
            {confirmLabel}
          </button>
        ) : (
          <Button
            type={onSubmit ? "submit" : "button"}
            onClick={onSubmit ? undefined : onConfirm}
            disabled={isSaving}
            style={{
              backgroundColor: clubColor,
              color: "var(--blackColor)",
              border: `1px solid ${clubColor}`,
            }}
          >
            {confirmLabel}
          </Button>
        )}

        <button
          type="button"
          onClick={onBack}
          disabled={disableBackWhileSaving && isSaving}
          className={Styles.back}
        >
          Voltar
        </button>
      </div>
    </>
  );

  if (onSubmit) {
    return (
      <ContainerForm className={Styles.container} style={styleVars}>
        <Form className={Styles.form_container} onSubmit={onSubmit}>
          {body}
        </Form>
      </ContainerForm>
    );
  }

  return (
    <div className={Styles.container} style={styleVars}>
      {body}
    </div>
  );
};

type SeasonConfigLeagueCardProps = {
  name: string;
  imageSrc?: string;
  onRemove: () => void;
};

export const SeasonConfigLeagueCard: React.FC<SeasonConfigLeagueCardProps> = ({
  name,
  imageSrc,
  onRemove,
}) => (
  <div className={Styles.league_card}>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className={Styles.remove_button}
    >
      <FaTimes />
    </button>

    {imageSrc && (
      <div className={Styles.container_league_img}>
        <img src={imageSrc} alt={name} className={Styles.league_img} />
      </div>
    )}

    <span className={Styles.league_name}>{name}</span>
  </div>
);

export { Styles as SeasonConfigSubScreenStyles };
export default SeasonConfigSubScreen;
