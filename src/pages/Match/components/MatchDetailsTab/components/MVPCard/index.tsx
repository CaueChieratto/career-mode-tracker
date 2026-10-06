import { FaStar } from "react-icons/fa";
import Styles from "./MVPCard.module.css";
import { CardDetails } from "../../../../../../ui/IconsSVG/CardDetails";
import { UseMatchRatingColor } from "../../../../../../common/hooks/Colors/GetOverallColor";
import { PlayerCircle } from "../../../LineupTab/layouts/Section/components/SlotButton/components/PlayerDetails/PlayerCircle";
import { formatPlayerName } from "../../../../../../common/utils/formatPlayerName";

type MVPCardProps = {
  playerName: string;
  rating: number;
  shirtNumber: number | null;
  isUserPlayer: boolean;
};

export const MVPCard = ({
  playerName,
  rating,
  shirtNumber,
  isUserPlayer,
}: MVPCardProps) => {
  const colors = UseMatchRatingColor(rating);

  return (
    <div className={Styles.mvp_card}>
      <CardDetails className={Styles.card_details_left} type="left" />
      <div className={Styles.mvp_header}>
        <div
          className={Styles.mvp_icon_wrapper}
          style={{ backgroundColor: "#374df5" }}
        >
          <FaStar color="#fff" size={12} />
        </div>
        <span className={Styles.mvp_title}>Jogador da partida</span>
      </div>

      <div className={Styles.mvp_content}>
        <div className={Styles.mvp_info}>
          {isUserPlayer && shirtNumber && (
            <PlayerCircle shirtNumber={shirtNumber} />
          )}
          <span className={Styles.mvp_name}>
            {formatPlayerName(playerName)}
          </span>
        </div>
        <div className={Styles.mvp_rating} style={{ backgroundColor: colors }}>
          {rating}
        </div>
      </div>
      <CardDetails className={Styles.card_details_right} type="right" />
    </div>
  );
};
