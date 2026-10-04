import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import Card from "../../../../../../../ui/Card";
import { Match } from "../../../../../../../common/interfaces/Match";
import { PlayerMatchStat } from "../../../../../../../common/interfaces/PlayerMatchStat";
import Styles from "./MatchCard.module.css";
import { MatchBody } from "./components/MatchBody";
import { MatchHeader } from "./components/MatchHeader";
import { useMatchNavigation } from "./hooks/useMatchNavigation";
import { buildMatchCopyText } from "./helpers/buildCopyText";
import { Copy } from "../../../../../../../common/utils/Copy";
import { useMatchesContext } from "../../contexts/MatchesContext";

type MatchCardProps = {
  match: Match;
  season: ClubData;
  playerStat?: PlayerMatchStat;
};

export const MatchCard = ({ match, season, playerStat }: MatchCardProps) => {
  const { career, isGeralPage, onOpenScreen } = useMatchesContext();
  const teams = season.teams || [];

  const leagueData = season.leagues?.find((l) => l.name === match.league);

  const { goToEdit, goToMatch } = useMatchNavigation({
    seasonId: season.id,
    matchId: match.matchesId,
    isGeralPage,
    playerId: playerStat?.playerId,
  });

  const handleEdit = onOpenScreen
    ? () =>
        onOpenScreen({
          key: "addMatches",
          matchesId: match.matchesId,
          seasonId: season.id,
        })
    : goToEdit;

  const copyText = async () => {
    const text = buildMatchCopyText({
      match,
      career,
      seasonMatches: season.matches,
    });
    await Copy(text, "Copiado!");
  };

  const isHomeCareerTeam = match.homeTeam === career.clubName;
  const homeTeamData = teams.find((team) => team.name === match.homeTeam);
  const awayTeamData = teams.find((team) => team.name === match.awayTeam);

  const homeBadge = isHomeCareerTeam
    ? career.teamBadge
    : homeTeamData?.badge || "";

  const awayBadge = !isHomeCareerTeam
    ? career.teamBadge
    : awayTeamData?.badge || "";

  return (
    <>
      <Card className={Styles.card}>
        <MatchHeader
          leagueName={match.league}
          leagueData={leagueData}
          onEdit={handleEdit}
          match={match}
          onClick={copyText}
        />

        <MatchBody
          match={match}
          onClick={goToMatch}
          homeBadge={homeBadge}
          awayBadge={awayBadge}
          playerStat={playerStat}
          isHomeCareerTeam={isHomeCareerTeam}
        />
      </Card>
    </>
  );
};
