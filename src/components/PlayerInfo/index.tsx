import Styles from "./PlayerInfo.module.css";
import CaptainArmbandIcon from "../../ui/CaptainArmbandIcon";
import { PlayerCircle } from "../../pages/Match/components/LineupTab/layouts/Section/components/SlotButton/components/PlayerDetails/PlayerCircle";
import { OverflowText } from "../OverflowText";
import { toSingular } from "../../pages/Academy/layouts/AcademyContent/components/FeedItem/helpers/toSingular";

type PlayerInfoProps = {
  name: string;
  position: string;
  shirtNumber: string | number;
  age: number | string;
  nation: string;
  captain?: boolean;
  isAcademy?: boolean;
  nickname?: string;
  customContainerClass?: string;
  onTouchMove?: React.TouchEventHandler<HTMLElement>;
};

export const PlayerInfo = ({
  name,
  position,
  shirtNumber,
  age,
  nation,
  captain,
  isAcademy,
  nickname,
  customContainerClass = "",
  onTouchMove,
}: PlayerInfoProps) => {
  return (
    <header
      className={`${Styles.player_info} ${customContainerClass}`}
      onTouchMove={onTouchMove}
    >
      <div className={Styles.player_header}>
        <PlayerCircle isSquad shirtNumber={shirtNumber} />
        <div className={Styles.player_content}>
          <div className={Styles.player_info_top}>
            <div className={Styles.name_wrapper}>
              <OverflowText
                className={Styles.data_title}
                disableDynamicMinWidth={true}
                style={{ minWidth: "auto" }}
                text={name}
              />
            </div>
            <span className={Styles.data}>{position}</span>
            {isAcademy && nickname && (
              <span className={Styles.academy_badge}>
                <OverflowText
                  disableDynamicMinWidth={true}
                  text={toSingular(nickname)}
                />
              </span>
            )}
            {captain && (
              <div className={Styles.icon_wrapper}>
                <CaptainArmbandIcon />
              </div>
            )}
          </div>
          <div className={Styles.player_info_bottom}>
            <div className={Styles.data}>{age} anos</div>
            <div className={Styles.data}>{nation}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
