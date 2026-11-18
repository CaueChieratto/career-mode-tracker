import { Trophy } from "../../../../../../common/interfaces/club/trophy";
import Styles from "../../PlayerTabs.module.css";
import LeagueStatsRow from "./LeagueStatsRow";
import NoTitleSeason from "../../components/NoTitleSeason";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";

type TrophyListProps = {
  trophies: Trophy[];
  isTotal?: boolean;
  player?: Players;
};

const TrophyList = ({ trophies, isTotal, player }: TrophyListProps) => {
  if (trophies.length === 0) {
    return <NoTitleSeason text="Nenhum" leagueName="título na temporada" />;
  }

  const ballonDors = player?.ballonDor ?? 0;
  const hasBallonDors = isTotal && ballonDors > 0;

  const ballonDorImage = "/bolaDeOuro.jpeg";
  const titleText = `${ballonDors} Bola${ballonDors > 1 ? "s" : ""} de ouro`;

  return (
    <div className={Styles.seasonTitle}>
      {trophies.map((trophy) => (
        <LeagueStatsRow
          seasonTitle
          isTotal={isTotal}
          key={trophy.leagueName}
          leagueImage={trophy.leagueImage}
          leagueName={trophy.leagueName}
          trophy={trophy}
        />
      ))}
      {hasBallonDors && (
        <div className={Styles.containerSeason}>
          <img
            src={ballonDorImage}
            alt="Bola de Ouro"
            className={Styles.ballonDor}
          />
          <h1 className={Styles.leagueNameTitles}>{titleText}</h1>
        </div>
      )}
    </div>
  );
};

export default TrophyList;
