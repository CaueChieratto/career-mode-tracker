import Styles from "./PlayerInfo.module.css";
import CaptainArmbandIcon from "../../ui/CaptainArmbandIcon";
import { PlayerCircle } from "../PlayerCircle";
import { OverflowText } from "../OverflowText";
import { toSingular } from "../../common/utils/toSingular";
import { formatPlayerName } from "../../common/utils/formatPlayerName";
import LazyFlag from "../LazyFlag";
import { resolveCountryFlagCode } from "../../common/constants/FIFA_COUNTRY_CODES";

type PlayerInfoProps = {
  name: string;
  position: string;
  shirtNumber?: string | number;
  age?: number | string;
  nation: string;
  captain?: boolean;
  isAcademy?: boolean;
  nickname?: string;
  customContainerClass?: string;
  onTouchMove?: React.TouchEventHandler<HTMLElement>;
  overall?: number;
  showOverall?: boolean;
  leftElement?: React.ReactNode;
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
  overall,
  showOverall,
  leftElement,
}: PlayerInfoProps) => {
  const countryCode = resolveCountryFlagCode(nation);

  return (
    <header
      className={`${Styles.player_info} ${customContainerClass}`}
      onTouchMove={onTouchMove}
    >
      <div className={Styles.player_header}>
        {leftElement ? (
          leftElement
        ) : (
          <PlayerCircle
            isSquad
            shirtNumber={shirtNumber}
            overall={overall}
            showOverall={showOverall}
          />
        )}
        <div className={Styles.player_content}>
          <div className={Styles.player_info_top}>
            <div className={Styles.name_wrapper}>
              <OverflowText
                className={Styles.data_title}
                disableDynamicMinWidth={true}
                style={{ minWidth: "auto" }}
                text={formatPlayerName(name)}
              />
              <span className={Styles.srOnly}>{name}</span>
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
          </div>
          <div className={Styles.player_info_bottom}>
            {Boolean(age) && <div className={Styles.data}>{age} anos</div>}
            {countryCode ? (
              <div className={Styles.flag_wrapper} title={nation}>
                <LazyFlag
                  code={countryCode}
                  style={{
                    width: "20px",
                    height: "14px",
                    objectFit: "cover",
                    borderRadius: "2px",
                  }}
                  fallback={<div className={Styles.data}>{nation}</div>}
                />
              </div>
            ) : (
              <div className={Styles.data}>{nation}</div>
            )}
            {captain && (
              <div className={Styles.icon_wrapper}>
                <CaptainArmbandIcon />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
