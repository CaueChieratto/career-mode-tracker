import { useMemo } from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { formatDisplayValue } from "../../../../../../../../../common/utils/FormatValue";
import { calculatePlayerAge } from "../../../../../../../../../common/utils/calculatePlayerAge";
import { isPlayerSoldOrDeparted } from "../../../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";

export const useSummaryData = (
  season: ClubData,
  careerOrCurrency?: Career | string,
) => {
  const career =
    typeof careerOrCurrency === "string" ? undefined : careerOrCurrency;
  const currency =
    typeof careerOrCurrency === "string"
      ? careerOrCurrency
      : careerOrCurrency?.currency;

  const activePlayers = useMemo(
    () =>
      (season.players || []).filter(
        (player) => !isPlayerSoldOrDeparted(player, season.matches),
      ),
    [season.players, season.matches],
  );

  const totalPlayers = activePlayers.length;

  const averageAge = useMemo(() => {
    const validAges = activePlayers
      .map((player) => {
        const dynamicAge = player.birthDate
          ? calculatePlayerAge(
              player.birthDate,
              career?.createdAt,
              season.seasonNumber,
              career?.nation,
              season.matches,
            )
          : 0;
        if (dynamicAge > 0) return dynamicAge;
        const fallbackAge = Number(player.age);
        return Number.isFinite(fallbackAge) && fallbackAge > 0
          ? fallbackAge
          : 0;
      })
      .filter((age) => age > 0);

    return validAges.length > 0
      ? (
          validAges.reduce((acc, age) => acc + age, 0) / validAges.length
        ).toFixed(1)
      : "0.0";
  }, [
    activePlayers,
    career?.createdAt,
    career?.nation,
    season.seasonNumber,
    season.matches,
  ]);

  const weeklySalaries = useMemo(
    () =>
      activePlayers.reduce(
        (acc, player) => acc + (Number(player.salary) || 0),
        0,
      ),
    [activePlayers],
  );

  const squadValue = useMemo(
    () =>
      activePlayers.reduce(
        (acc, player) => acc + (Number(player.playerValue) || 0),
        0,
      ),
    [activePlayers],
  );

  const content = useMemo(
    () => [
      { info: "Total de jogadores", number: totalPlayers },
      { info: "Média de idade", number: averageAge },
      {
        info: "Salários Semanais",
        number: formatDisplayValue(weeklySalaries, currency),
      },
      {
        info: "Valor do plantel",
        number: formatDisplayValue(squadValue, currency),
      },
    ],
    [totalPlayers, averageAge, weeklySalaries, squadValue, currency],
  );

  return { content };
};
