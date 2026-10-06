import Styles from "./StatisticsTable_Title.module.css";
import { RiCloseCircleLine } from "react-icons/ri";
import { UseOverallColor } from "../../../common/hooks/Colors/GetOverallColor";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

type StatisticsTable_TitleProps = {
  type: "info" | "expand" | "league";
  expand?: boolean;
  isPlayer?: boolean;
  setExpand?: Dispatch<SetStateAction<boolean>>;
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
  const nameRef = useRef<HTMLHeadingElement>(null);
  const leagueRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = nameRef.current;
    if (!el || !el.parentElement) return;

    const parentWidth = el.parentElement.clientWidth;
    const contentWidth = el.scrollWidth;

    const buffer = 15;
    const totalWidth = contentWidth + buffer;

    const isOverflow = contentWidth > parentWidth;

    setIsOverflowing(isOverflow);

    if (isOverflow) {
      const distance = totalWidth - parentWidth;
      el.style.setProperty("--scroll-distance", `${distance}px`);
      el.style.setProperty("--dynamic-min-width", `${totalWidth}px`);
    } else {
      el.style.setProperty("--dynamic-min-width", `100%`);
    }
  }, [playerName, overall]);

  useEffect(() => {
    const el = leagueRef.current;
    if (!el || !el.parentElement) return;

    const parentWidth = el.parentElement.clientWidth;
    const contentWidth = el.scrollWidth;

    const buffer = 15;
    const totalWidth = contentWidth + buffer;

    const isOverflow = contentWidth > parentWidth;

    setIsOverflowing(isOverflow);

    if (isOverflow) {
      const distance = totalWidth - parentWidth;
      el.style.setProperty("--scroll-distance", `${distance}px`);
      el.style.setProperty("--dynamic-min-width", `${totalWidth}px`);
    } else {
      el.style.setProperty("--dynamic-min-width", `100%`);
    }
  }, [leagueName]);

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
            <h3 ref={nameRef} className={Styles.season_number}>
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
            <h3
              ref={nameRef}
              className={`${!isPlayer ? Styles.name : Styles.season} ${
                !isPlayer && isOverflowing ? Styles.marquee : ""
              }`}
            >
              <span className={Styles.no_wrap}>{name}</span>
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
              <span
                ref={leagueRef}
                className={`${Styles.league_name} ${Styles.no_wrap} ${
                  isOverflowing ? Styles.marquee : ""
                }`}
              >
                {leagueName}
              </span>
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
