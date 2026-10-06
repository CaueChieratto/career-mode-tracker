import { GiSoccerBall } from "react-icons/gi";
import Styles from "./MatchHeaderCard.module.css";
import { Match } from "../../../../../../common/interfaces/Match";
import { formatPlayerName } from "../../../../../../common/utils/formatPlayerName";

type Goal = {
  playerName: string;
  time: number;
  displayTime?: string;
  isOwnGoal?: boolean;
};

type MatchHeaderCardProps = {
  match: Match;
  hasPenalties: boolean;
  isUserHome: boolean;
  userGoals?: Goal[];
  opponentGoals?: Goal[];
  homeBadge: string;
  awayBadge: string;
};

export const MatchHeaderCard = ({
  match,
  isUserHome,
  hasPenalties,
  userGoals = [],
  opponentGoals = [],
  homeBadge,
  awayBadge,
}: MatchHeaderCardProps) => {
  const date = match.date;

  const homeScore = match.homeScore;
  const awayScore = match.awayScore;

  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;

  const statusDisplay = match.status === "FINISHED" ? "Finalizado" : "Agendado";
  const hasBothBadges = Boolean(homeBadge && awayBadge);

  const homeGoals = isUserHome ? userGoals : opponentGoals;
  const awayGoals = !isUserHome ? userGoals : opponentGoals;
  const hasAnyGoals = homeGoals.length > 0 || awayGoals.length > 0;

  return (
    <div className={Styles.card}>
      <div className={Styles.container_date}>
        <span className={Styles.date}>{date}</span>
      </div>

      <div className={Styles.main_row}>
        <div className={Styles.team_container}>
          {hasBothBadges ? (
            <div className={Styles.team_badge_container}>
              <img
                src={homeBadge}
                className={Styles.team_badge}
                alt={homeTeam}
              />
            </div>
          ) : (
            <div className={Styles.team_name_left}>{homeTeam}</div>
          )}
        </div>

        <div className={Styles.score_container}>
          <div className={Styles.score_row}>
            <span className={Styles.score_number}>{homeScore}</span>
            <span className={Styles.score_separator}>-</span>
            <span className={Styles.score_number}>{awayScore}</span>
          </div>

          {hasPenalties ? (
            <span className={Styles.pen_score}>
              PEN {match.homePenScore} - {match.awayPenScore}
            </span>
          ) : (
            <span className={Styles.match_status}>{statusDisplay}</span>
          )}
        </div>

        <div className={Styles.team_container}>
          {hasBothBadges ? (
            <div className={Styles.team_badge_container}>
              <img
                src={awayBadge}
                className={Styles.team_badge}
                alt={awayTeam}
              />
            </div>
          ) : (
            <div className={Styles.team_name_right}>{awayTeam}</div>
          )}
        </div>
      </div>

      {hasAnyGoals && (
        <div className={Styles.scorers_container}>
          <div className={Styles.scorers_left}>
            {homeGoals.map((goal, idx) => (
              <span key={`home-${idx}`}>
                {formatPlayerName(goal.playerName)} {goal.isOwnGoal ? "(GC) " : ""}
                {goal.displayTime || `${goal.time}'`}
              </span>
            ))}
          </div>

          <div className={Styles.icon_center}>
            <GiSoccerBall size={14} className={Styles.goal_icon} />
          </div>

          <div className={Styles.scorers_right}>
            {awayGoals.map((goal, idx) => (
              <span key={`away-${idx}`}>
                {goal.displayTime || `${goal.time}'`}{" "}
                {formatPlayerName(goal.playerName)}
                {goal.isOwnGoal ? " (GC)" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
