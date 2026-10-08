import { StatDisplayParts } from "./types";

export const formatDec = (val: number, decimals: number = 2): string => {
  return Number(val).toFixed(decimals).replace(".", ",");
};

export const pluralize = (
  val: number,
  singular: string,
  plural: string,
): string => {
  return val === 1 ? singular : plural;
};

// Formatações com palavras que flexionam singular/plural
export const formatTotal = (
  val: number,
  singular: string,
  plural: string,
): string => {
  return `${val} ${pluralize(val, singular, plural)}`;
};

export const formatTotalParts = (
  val: number,
  singular: string,
  plural: string,
): StatDisplayParts => {
  return {
    value: `${val} ${pluralize(val, singular, plural)}`,
  };
};

export const formatPerGame = (
  val: number,
  singular: string,
  plural: string,
): string => {
  return `${formatDec(val)} ${pluralize(val, singular, plural)} por partida`;
};

export const formatPerGameParts = (
  val: number,
  singular: string,
  plural: string,
): StatDisplayParts => {
  return {
    value: `${formatDec(val)} ${pluralize(val, singular, plural)}`,
    description: "por partida",
  };
};

export const formatPer90 = (
  val: number,
  singular: string,
  plural: string,
): string => {
  return `${formatDec(val)} ${pluralize(val, singular, plural)} a cada 90 minutos`;
};

export const formatPer90Parts = (
  val: number,
  singular: string,
  plural: string,
): StatDisplayParts => {
  return {
    value: `${formatDec(val)} ${pluralize(val, singular, plural)}`,
    description: "a cada 90 min",
  };
};

export const formatFrequency = (val: number, singular: string): string => {
  return Number(val) > 0
    ? `1 ${singular} a cada ${Math.round(Number(val))} min`
    : "-";
};

export const formatFrequencyParts = (
  val: number,
  singular: string,
): StatDisplayParts => {
  return Number(val) > 0
    ? {
        value: `1 ${singular}`,
        description: `a cada ${Math.round(Number(val))} min`,
      }
    : { value: "-" };
};

// Formatações para locuções/termos fixos (ex: "no alvo", "para fora")
export const formatPhraseTotal = (val: number, phrase: string): string => {
  return `${val} ${phrase}`;
};

export const formatPhraseTotalParts = (
  val: number,
  phrase: string,
): StatDisplayParts => {
  return {
    value: `${val} ${phrase}`,
  };
};

export const formatPhrasePerGame = (val: number, phrase: string): string => {
  return `${formatDec(val)} ${phrase} por partida`;
};

export const formatPhrasePerGameParts = (
  val: number,
  phrase: string,
): StatDisplayParts => {
  return {
    value: `${formatDec(val)} ${phrase}`,
    description: "por partida",
  };
};

export const formatPhrasePer90 = (val: number, phrase: string): string => {
  return `${formatDec(val)} ${phrase} a cada 90 minutos`;
};

export const formatPhrasePer90Parts = (
  val: number,
  phrase: string,
): StatDisplayParts => {
  return {
    value: `${formatDec(val)} ${phrase}`,
    description: "a cada 90 min",
  };
};

