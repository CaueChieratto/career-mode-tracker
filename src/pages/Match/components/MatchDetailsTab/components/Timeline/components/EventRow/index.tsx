import { MatchEvent } from "../../../../types";
import { EventIcon } from "./components/EventIcon";
import { formatPlayerName } from "../../../../../../../../common/utils/formatPlayerName";
import Styles from "./EventRow.module.css";

type Props = {
  event: MatchEvent;
  isUserHome: boolean;
};

export const EventRow = ({ event, isUserHome }: Props) => {
  const timeDisplay = event.displayTime || `${event.time}'`;

  const isHomeEvent = event.isOpponent ? !isUserHome : isUserHome;

  const formattedMainPlayer = formatPlayerName(event.mainPlayer);
  const formattedSecondaryPlayer = event.secondaryPlayer
    ? formatPlayerName(event.secondaryPlayer)
    : null;

  if (isHomeEvent) {
    return (
      <div className={`${Styles.event_row} ${Styles.event_left}`}>
        <span className={Styles.event_time}>{timeDisplay}</span>
        <span className={Styles.event_icon}>
          <EventIcon type={event.type} />
        </span>
        <span className={Styles.event_main}>{formattedMainPlayer}</span>
        {formattedSecondaryPlayer && (
          <span className={Styles.event_secondary}>
            {formattedSecondaryPlayer}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${Styles.event_row} ${Styles.event_right}`}>
      {formattedSecondaryPlayer && (
        <span className={Styles.event_secondary}>
          {formattedSecondaryPlayer}
        </span>
      )}
      <span className={Styles.event_main}>{formattedMainPlayer}</span>
      <span className={Styles.event_icon}>
        <EventIcon type={event.type} />
      </span>
      <span className={Styles.event_time}>{timeDisplay}</span>
    </div>
  );
};
