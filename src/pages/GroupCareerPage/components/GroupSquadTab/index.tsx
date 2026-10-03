import { useMemo, useState } from "react";
import { FaChevronDown, FaImage } from "react-icons/fa";
import Card from "../../../../ui/Card";
import { SquadElements } from "../../../../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements";
import { buildSquadData } from "../../../../layout/SectionView/features/ClubTabs/SquadTab/helpers/buildSquadData";
import { useGroupCareerContext } from "../../contexts/GroupCareerContext";
import { POSITION_DATA } from "../../../../common/types/Positions";
import Styles from "./GroupSquadTab.module.css";
import { ColorsService } from "../../../../common/services/ColorsService";
import { format } from "date-fns";
import { FormatDate } from "../../../../common/types/enums/FormatDate";
import { getValidDate } from "../../helper/getValidDate";
import { useParams } from "react-router-dom";

const GroupSquadTab = () => {
  const { seasonsByCareer } = useGroupCareerContext();
  const { groupId } = useParams<{ groupId: string }>();
  const [openId, setOpenId] = useState<string | null>(null);

  const latestSeasonPerCareer = useMemo(() => {
    const map = new Map<string, (typeof seasonsByCareer)[number]>();
    seasonsByCareer.forEach((entry) => {
      const current = map.get(entry.career.id);
      if (!current || entry.season.seasonNumber > current.season.seasonNumber) {
        map.set(entry.career.id, entry);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) =>
        getValidDate(b.career.createdAt).getTime() -
        getValidDate(a.career.createdAt).getTime(),
    );
  }, [seasonsByCareer]);

  return (
    <div className={Styles.wrapper}>
      {latestSeasonPerCareer.map(({ career, season, clubName }, index) => {
        const isOpen = openId === career.id;
        const activeColor =
          ColorsService.getColorSaved(career.id) ||
          career.colorsTeams?.[0] ||
          "#333";
        const { groupedData } = buildSquadData(
          season.players,
          "Ordenar por padrão",
          false,
        );

        const dateFormat = FormatDate.STANDARD.replace(/D/g, "d").replace(
          /Y/g,
          "y",
        );
        const startDate = format(getValidDate(career.createdAt), dateFormat);
        const previousCareer = latestSeasonPerCareer[index - 1];
        const endDate = previousCareer
          ? format(getValidDate(previousCareer.career.createdAt), dateFormat)
          : "Atual";

        return (
          <Card key={career.id} className={Styles.clubCard}>
            <button
              type="button"
              className={Styles.clubCardHeader}
              onClick={() => setOpenId(isOpen ? null : career.id)}
            >
              <div className={Styles.clubBadgeWrapper}>
                {career.teamBadge ? (
                  <div
                    className={Styles.backgroundImg}
                    style={{ backgroundColor: activeColor }}
                  >
                    <img
                      src={career.teamBadge}
                      alt={clubName}
                      className={Styles.clubBadge}
                    />
                  </div>
                ) : (
                  <FaImage size={20} />
                )}
                <div className={Styles.clubTitleWrapper}>
                  <h1 className={Styles.clubName}>{clubName}</h1>
                  <p className={Styles.careerDates}>
                    {startDate} {"->"} {endDate}
                  </p>
                </div>
              </div>
              <FaChevronDown
                className={`${Styles.chevron} ${isOpen ? Styles.chevronOpen : ""}`}
              />
            </button>

            {isOpen && (
              <div className={Styles.clubCardBody}>
                {POSITION_DATA.map((group) => {
                  const players = groupedData.get(group.key) || [];
                  if (group.key === "loaned" && players.length === 0)
                    return null;
                  if (players.length === 0) return null;

                  return (
                    <Card key={group.key} className={Styles.card}>
                      <SquadElements.Header
                        name={group.name}
                        color={group.color}
                        quantity={players.length}
                      />
                      {players.map((player) => (
                        <SquadElements.Section
                          {...player}
                          matches={season.matches || []}
                          key={player.id}
                          currency={career.currency || "€"}
                          careerNation={career.nation}
                          careerId={career.id}
                          groupId={groupId}
                        />
                      ))}
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default GroupSquadTab;
