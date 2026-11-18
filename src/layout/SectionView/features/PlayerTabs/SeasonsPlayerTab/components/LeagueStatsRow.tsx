import { ElementsCardTitles } from "../../../../../../common/elements/ElementsCardTitles";
import { Trophy } from "../../../../../../common/interfaces/club/trophy";
import Styles from "../../PlayerTabs.module.css";

type LeagueStatsRowProps = {
  leagueImage: string;
  leagueName: string;
  seasonTitle?: boolean;
  isTotal?: boolean;
  trophy?: Trophy;
};

const LeagueStatsRow = ({
  leagueImage,
  leagueName,
  seasonTitle,
  isTotal,
  trophy,
}: LeagueStatsRowProps) => {
  const numberTitles = trophy?.seasons.length;

  return (
    <section
      className={!seasonTitle ? Styles.container : Styles.containerSeason}
    >
      <ElementsCardTitles.Images trophyImage={leagueImage} />

      <h1
        className={!seasonTitle ? Styles.leagueName : Styles.leagueNameTitles}
      >
        {!seasonTitle ? (
          <>
            {isTotal && numberTitles ? `${numberTitles}x ` : ""}Campeão da{" "}
            <br />
            {leagueName}
          </>
        ) : (
          <>
            {!isTotal ? (
              <>{leagueName}</>
            ) : (
              <>
                {numberTitles} {leagueName}
              </>
            )}
          </>
        )}
      </h1>
    </section>
  );
};

export default LeagueStatsRow;
