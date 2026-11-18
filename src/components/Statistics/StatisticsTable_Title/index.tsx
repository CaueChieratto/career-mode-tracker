import Styles from "./StatisticsTable_Title.module.css";
import { RiCloseCircleLine } from "react-icons/ri";
import { UseOverallColor } from "../../../common/hooks/Colors/GetOverallColor";
import { ReactNode } from "react";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { MdExpandLess, MdExpandMore } from "react-icons/md";
import { OverflowText } from "../../OverflowText";

type StatisticsTable_TitleProps = {
  type: "info" | "expand" | "league";
  expand?: boolean;
  isPlayer?: boolean;
  playerName?: string;
  overall?: number;
  leagueName?: string;
  leagueImage?: string;
  icon?: ReactNode;
  teamBadge?: string;
};

const StatisticsTable_Title = ({
  type,
  expand,
  isPlayer,
  overall,
  playerName,
  leagueName,
  leagueImage,
  icon,
  teamBadge,
}: StatisticsTable_TitleProps) => {
  const content = {
    info: {
      name: playerName,
      overall: overall,
      icon: <RiCloseCircleLine />,
      badge: teamBadge,
    },
    expand: {
      name: "Expandir",
      iconExpand: <MdExpandLess />,
      iconClose: <MdExpandMore />,
      leagueImage: leagueImage,
      leagueName: leagueName,
    },
    league: {
      leagueImage: leagueImage,
      name: leagueName,
    },
  };

  const renderContent = () => {
    switch (type) {
      case "info": {
        const { name, badge, overall } = content.info;
        return badge ? (
          <div
            className={Styles.expand_container}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className={`${Styles.logo_container} ${Styles.positon}`}>
              <img src={badge} className={Styles.logo} />
            </div>
            <h3 className={Styles.season_number}>
              <span className={Styles.name_season}>{name}</span>
            </h3>
          </div>
        ) : (
          <div
            className={
              !isPlayer ? Styles.container_name_over : Styles.container_season
            }
            onTouchMove={(e) => e.stopPropagation()}
          >
            <h3 className={!isPlayer ? Styles.name : Styles.season}>
              <OverflowText text={name || ""} className={Styles.no_wrap} />
              <span
                className={Styles.over}
                style={{ color: UseOverallColor(overall ?? 0) }}
              >
                {overall}
              </span>
            </h3>
          </div>
        );
      }

      case "expand": {
        const {
          name: expandName,
          iconClose,
          iconExpand,
          leagueImage,
          leagueName,
        } = content.expand;
        return (
          <div
            className={
              !isPlayer
                ? Styles.container_name_over_expand
                : Styles.container_season
            }
            onTouchMove={(e) => e.stopPropagation()}
          >
            <h3 className={Styles.expand_container}>
              {icon ? (
                <>
                  {icon} {expand ? <IoIosArrowUp /> : <IoIosArrowDown />}
                </>
              ) : isPlayer ? (
                <>
                  <div className={Styles.logo_container}>
                    <img
                      src={leagueImage}
                      alt={leagueName}
                      className={Styles.logo}
                    />
                  </div>
                  {expand ? <IoIosArrowUp /> : <IoIosArrowDown />}
                </>
              ) : (
                <>
                  {expandName}
                  {expand ? iconExpand : iconClose}
                </>
              )}
            </h3>
          </div>
        );
      }

      case "league": {
        const { leagueImage, name: leagueName } = content.league;
        return (
          <div
            className={Styles.container_league}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className={Styles.league_image_container}>
              <img
                src={leagueImage}
                alt={leagueName}
                className={Styles.league_image}
              />
            </div>
            <div className={Styles.league_name_container}>
              <OverflowText
                text={leagueName || ""}
                className={`${Styles.league_name} ${Styles.no_wrap}`}
              />
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return <>{renderContent()}</>;
};

export default StatisticsTable_Title;
