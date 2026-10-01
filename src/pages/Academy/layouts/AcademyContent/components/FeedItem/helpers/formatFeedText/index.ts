import { toSingular } from "../toSingular";

interface FormattedFeedText {
  professional: string;
  social: string;
}

export const formatFeedText = (
  type: string,
  desc: string,
  academyNickname: string,
  academyName: string,
): FormattedFeedText => {
  const singularNickname = toSingular(academyNickname);

  if (desc.includes("recrutado")) {
    return {
      professional: `Atleta recrutado para a categoria de base.`,
      social: `⭐ Novo ${singularNickname} na base!`,
    };
  }

  if (desc.includes("Promovido")) {
    return {
      professional: `Atleta promovido ao elenco profissional.`,
      social: `🚀 Promovido ao profissional! Mais um talento de ${academyName}.`,
    };
  }

  if (desc.includes("dispensado")) {
    return {
      professional: `Atleta desligado da categoria de base.`,
      social: `👋 Fim da passagem pela base.`,
    };
  }

  const match = desc.match(/de ([a-zA-Z0-9-]+) para ([a-zA-Z0-9-]+)/i);
  const oldVal = match ? match[1] : "";
  const newVal = match ? match[2] : "";

  const cleanDesc = desc
    .replace(/age/i, "idade")
    .replace(/height/i, "altura")
    .replace(/weight/i, "peso")
    .replace(/position/i, "posição")
    .replace(/sector/i, "setor");

  if (!newVal || !oldVal) {
    return {
      professional: cleanDesc,
      social: `⚽ ${cleanDesc}`,
    };
  }

  switch (type.toLowerCase()) {
    case "age":
      return {
        professional: `Idade atualizada: ${newVal} anos.`,
        social: `🎂 Agora com ${newVal} anos!`,
      };

    case "height":
      return {
        professional: `Altura atualizada de ${oldVal}cm para ${newVal}cm.`,
        social: `📏 Cresceu! Agora mede ${newVal}cm.`,
      };

    case "weight": {
      const weightDiff = parseInt(newVal, 10) - parseInt(oldVal, 10);

      if (weightDiff > 0) {
        return {
          professional: `Peso atualizado de ${oldVal}kg para ${newVal}kg.`,
          social: `💪 Ganhou massa e chegou aos ${newVal}kg!`,
        };
      }

      return {
        professional: `Peso atualizado de ${oldVal}kg para ${newVal}kg.`,
        social: `🏃 Ajuste físico: agora está com ${newVal}kg.`,
      };
    }

    case "overall":
      return {
        professional: `Overall atualizado de ${oldVal} para ${newVal}.`,
        social: `📈 Evoluiu! O overall foi de ${oldVal} para ${newVal}.`,
      };

    case "potential":
      return {
        professional: `Potencial atualizado de ${oldVal} para ${newVal}.`,
        social: `🌟 O potencial subiu de ${oldVal} para ${newVal}!`,
      };

    case "sector":
      return {
        professional: `Setor de atuação alterado de ${oldVal} para ${newVal}.`,
        social: `🔄 Novo setor de atuação: ${newVal}.`,
      };

    case "position":
      return {
        professional: `Posição alterada de ${oldVal} para ${newVal}.`,
        social: `🔄 Nova posição: ${newVal}.`,
      };

    default:
      return {
        professional: cleanDesc,
        social: `⚽ ${cleanDesc}`,
      };
  }
};
