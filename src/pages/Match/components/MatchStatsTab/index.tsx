import Styles from "./MatchStatsTab.module.css";
import { StatRow, StatRowProps } from "./components/StatRow";
import {
  CircularStatRow,
  CircularStatRowProps,
} from "./components/CircularStatRow";
import { Match } from "../../../../common/interfaces/Match";
import { ClubData } from "../../../../common/interfaces/club/clubData";
import { Career } from "../../../../common/interfaces/Career";
import { getOpponentCardsProjection } from "../../helpers/opponentCards";

type MixedStat =
  | ({ type: "standard" } & StatRowProps)
  | ({ type: "circular" } & CircularStatRowProps);

type MatchStatsTabProps = {
  match: Match;
  season?: ClubData;
  career?: Career;
  onRegisterSave?: (fn: () => Promise<void> | void) => void;
};

export const MatchStatsTab = ({ match, career }: MatchStatsTabProps) => {
  const homePossession = match.homePossession || 0;
  const awayPossession = match.awayPossession || 0;
  const cardProjection = getOpponentCardsProjection(match, career?.clubName);
  const homeYellowCards =
    match.homeYellowCards ?? cardProjection.homeYellowCards ?? 0;
  const awayYellowCards =
    match.awayYellowCards ?? cardProjection.awayYellowCards ?? 0;
  const homeRedCards = match.homeRedCards ?? cardProjection.homeRedCards ?? 0;
  const awayRedCards = match.awayRedCards ?? cardProjection.awayRedCards ?? 0;

  const STATS_DATA: MixedStat[] = [
    {
      type: "standard",
      label: "Gols esperados (xG)",
      home: match.homeXG || 0,
      away: match.awayXG || 0,
      info: true,
    },
    {
      type: "standard",
      label: "Recuperação de bola",
      home: match.homeBallRecovery || 0,
      away: match.awayBallRecovery || 0,
      reverseWinner: true,
    },
    {
      type: "standard",
      label: "Finalizações",
      home: match.homeFinishings || 0,
      away: match.awayFinishings || 0,
    },
    {
      type: "standard",
      label: "Passes",
      home: match.homePasses || 0,
      away: match.awayPasses || 0,
    },
    {
      type: "circular",
      label: "Precisão nas finalizações",
      homeSuccess: match.homeFinishingsOnTarget || 0,
      homeTotal: match.homeFinishings || 0,
      awaySuccess: match.awayFinishingsOnTarget || 0,
      awayTotal: match.awayFinishings || 0,
    },
    {
      type: "circular",
      label: "Precisão nos passes",
      homeSuccess: match.homePassesCompleted || 0,
      homeTotal: match.homePasses || 0,
      awaySuccess: match.awayPassesCompleted || 0,
      awayTotal: match.awayPasses || 0,
    },
    {
      type: "standard",
      label: "Defesas",
      home: match.homeDefenses || 0,
      away: match.awayDefenses || 0,
    },
    {
      type: "standard",
      label: "Cartões amarelos",
      home: homeYellowCards,
      away: awayYellowCards,
      reverseWinner: true,
    },
    {
      type: "standard",
      label: "Cartões vermelhos",
      home: homeRedCards,
      away: awayRedCards,
      reverseWinner: true,
    },
  ];

  return (
    <div className={Styles.container}>
      <div className={Styles.card}>
        <h2 className={Styles.title}>Visão geral da partida</h2>

        <div className={Styles.possession_container}>
          <div className={Styles.stat_header}>
            <span className={`${Styles.badge} ${Styles.bg_home}`}>
              {homePossession}%
            </span>

            <span className={Styles.label_wrapper}>Posse de bola</span>

            <span className={`${Styles.badge} ${Styles.bg_away}`}>
              {awayPossession}%
            </span>
          </div>

          <div className={Styles.possession_bar_wrapper}>
            <div
              className={Styles.bg_home}
              style={{ width: `${homePossession}%` }}
            />
            <div
              className={Styles.bg_away}
              style={{ width: `${awayPossession}%` }}
            />
          </div>
        </div>

        {STATS_DATA.map((stat) => {
          if (stat.type === "circular") {
            const { ...props } = stat;
            return <CircularStatRow key={stat.label} {...props} />;
          }

          const { ...props } = stat;
          return <StatRow key={stat.label} {...props} />;
        })}
      </div>
    </div>
  );
};
