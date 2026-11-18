import { PlayerData, ChartDataPoint } from "../../types";
import { Career } from "../../../../../../../../../../common/interfaces/Career";
import { isEuropeanSeason } from "../../../../../../utils/isEuropeanSeason";
import {
  compareAcademyDates,
  extractDateInfo,
} from "../../../../../FeedItem/helpers/extractDateInfo";

export const buildChartData = (
  player: PlayerData | undefined | null,
  currentAttribute: string,
  career: Career,
): ChartDataPoint[] => {
  if (!player?.evolutionHistory || !player.arrivalDate) return [];

  const history = player.evolutionHistory.filter(
    (h) => h.changedAttribute === currentAttribute,
  );

  if (history.length === 0) return [];

  const isEurope = isEuropeanSeason(career);
  const fallbackYear = career.createdAt
    ? new Date(career.createdAt).getFullYear()
    : new Date().getFullYear();

  const sortedHistory = [...history].sort((a, b) =>
    compareAcademyDates(a.date, b.date, isEurope, fallbackYear),
  );

  const dataPoints: ChartDataPoint[] = [];

  const recruitmentEvent = player.evolutionHistory.find(
    ({ description }) =>
      description === "Jogador recrutado para a categoria de base.",
  );

  const initialDateToUse = recruitmentEvent?.date || player.arrivalDate;

  dataPoints.push({
    label: extractDateInfo(initialDateToUse, isEurope, fallbackYear)
      .formattedDate,
    value: sortedHistory[0].oldValue,
    title: "Valor Inicial",
    desc: recruitmentEvent
      ? "Registrado na chegada do atleta."
      : "Iniciou com este valor.",
  });

  sortedHistory.forEach((item) => {
    dataPoints.push({
      label: extractDateInfo(item.date, isEurope, fallbackYear).formattedDate,
      value: item.newValue,
      title: "Evolução",
      desc: `Mudou de ${item.oldValue || "--"} para ${item.newValue}`,
    });
  });

  return dataPoints;
};
