import Styles from "../../components/Button/Button.module.css";

export type FontSize = "medium" | "large";
export type Shadow = "no" | "yes";
export type FontWeight = "light" | "bold";
export type Size = "normal" | "big" | "small";
export type Width = "normal" | "big";
export type Radius = "square" | "rounded" | "default" | "moreRounded";
export type Animation = "none" | "active";
export type Gap = "normal" | "gap";

export type TypeButton =
  | "primary"
  | "secondary"
  | "primaryDelete"
  | "secondaryDelete"
  | "transparent"
  | "addPlayer"
  | "default";

export const classMap = {
  fontSize: {
    medium: Styles.fontSizeMedium,
    large: Styles.fontSizeLarge,
  },
  shadow: {
    no: "",
    yes: Styles.shadow,
  },
  fontWeight: {
    light: Styles.fontWeightLight,
    bold: Styles.fontWeightBold,
  },
  size: {
    normal: Styles.normalWidth,
    big: Styles.sizeBig,
    small: Styles.sizeSmall,
  },
  width: {
    normal: Styles.sizeNormal,
    big: Styles.sizeBig,
  },
  radius: {
    square: Styles.radiusSquare,
    rounded: Styles.radiusRounded,
    default: Styles.radiusDefault,
    moreRounded: Styles.radiusMoreRounded,
  },
  animation: {
    none: Styles.animationNone,
    active: Styles.animationActive,
  },
  gap: {
    normal: Styles.normalGap,
    gap: Styles.gap,
  },
  typeButton: {
    primary: Styles.buttonPrimary,
    secondary: Styles.buttonSecondary,
    primaryDelete: Styles.buttonPrimaryDelete,
    secondaryDelete: Styles.buttonSecondaryDelete,
    addPlayer: Styles.buttonAddPlayer,
    transparent: Styles.buttonTransparent,
    default: Styles.buttonDefault,
  },
};
