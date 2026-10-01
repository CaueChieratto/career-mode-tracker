import { parseBrasilDate } from "../../../../../../../../../common/utils/Date";

interface MatchFormValues {
  date: string;
  league: string;
  opponentTeam: string;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateMatchForm(values: MatchFormValues): ValidationResult {
  const { date, league, opponentTeam } = values;

  if (!date || !league || !opponentTeam) {
    return {
      valid: false,
      message: "Por favor, preencha todos os campos obrigatórios da partida.",
    };
  }

  // O formulário não informa o ano; permita 29/02 usando um ano bissexto.
  if (!/^\d{1,2}\/\d{1,2}$/.test(date) || !parseBrasilDate(date, 2000)) {
    return {
      valid: false,
      message: "Data inválida. Use o formato DD/MM.",
    };
  }

  return { valid: true };
}
