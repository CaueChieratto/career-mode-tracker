import { Players } from "../../../../common/interfaces/playersInfo/players";
import { Match } from "../../../../common/interfaces/Match";
import { PlayerCircle } from "../../../PlayerCircle";
import Styles from "./PlayerHeaderInfo.module.css";

type PlayerHeaderInfoProps = {
  player?: Players;
  match?: Match;
  titleText?: string;
};

export const PlayerHeaderInfo = ({
  player,
  match,
  titleText,
}: PlayerHeaderInfoProps) => {
  return (
    <div className={Styles.container_player}>
      <PlayerCircle shirtNumber={player?.shirtNumber} />
      <div className={Styles.container}>
        <h1 className={match ? Styles.h1 : Styles.h1_player}>{player?.name}</h1>
        {titleText && <p className={Styles.season}>{titleText}</p>}
      </div>
    </div>
  );
};
