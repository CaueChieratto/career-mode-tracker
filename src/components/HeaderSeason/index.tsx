import { Career } from "../../common/interfaces/Career";
import { Players } from "../../common/interfaces/playersInfo/players";
import { Match } from "../../common/interfaces/Match";
import { useSeasonTheme } from "../../common/hooks/Seasons/UseSeasonTheme";
import Button from "../Button";
import { PlayerHeaderInfo } from "./components/PlayerHeaderInfo";
import { ClubHeaderInfo } from "./components/ClubHeaderInfo";
import { useHeaderNavigation } from "./hooks/useHeaderNavigation";
import Styles from "./HeaderSeason.module.css";

type HeaderSeasonProps = {
  career: Career;
  careerId: string;
  season?: number;
  titleText?: string;
  titleTextMatch?: string;
  backSeasons?: () => void;
  isPlayer?: boolean;
  match?: Match;
  player?: Players;
};

const HeaderSeason = ({
  career,
  season,
  careerId,
  titleText,
  titleTextMatch,
  backSeasons,
  player,
  isPlayer,
  match,
}: HeaderSeasonProps) => {
  const { clubColor, darkClubColor } = useSeasonTheme();
  const { handleGoBack } = useHeaderNavigation({
    careerId,
    backSeasons,
    isPlayer,
  });

  return (
    <header
      className={Styles.header}
      style={{
        background: `linear-gradient(to right, ${darkClubColor}, ${clubColor})`,
      }}
    >
      <div className={Styles.container_club}>
        {isPlayer ? (
          <PlayerHeaderInfo
            player={player}
            match={match}
            titleText={titleText}
          />
        ) : (
          <ClubHeaderInfo
            career={career}
            match={match}
            season={season}
            titleText={titleText}
            titleTextMatch={titleTextMatch}
          />
        )}
      </div>
      <Button onClick={handleGoBack} className={Styles.button}>
        Voltar
      </Button>
    </header>
  );
};

export default HeaderSeason;
