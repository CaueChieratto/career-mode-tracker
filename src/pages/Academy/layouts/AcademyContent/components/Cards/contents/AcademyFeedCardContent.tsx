import React from "react";
import Styles from "../../../AcademyContent.module.css";
import { FeedItem } from "../../FeedItem";
import { FeedEvent } from "../../FeedItem/types/FeedEvent";

interface AcademyFeedCardContentProps {
  feedData: FeedEvent[];
  activeCardIndex: number | null;
  isGeral?: boolean;
  clubName?: string;
}

export const AcademyFeedCardContent: React.FC<AcademyFeedCardContentProps> = ({
  feedData,
  activeCardIndex,
  isGeral,
  clubName,
}) => {
  const isFeedExpanded = activeCardIndex === 2;
  const visibleFeed = isFeedExpanded ? feedData : feedData.slice(0, 3);

  const feedBySeason = visibleFeed.reduce(
    (acc, event) => {
      const season = event.season || "1";
      if (!acc[season]) {
        acc[season] = [];
      }
      acc[season].push(event);
      return acc;
    },
    {} as Record<string, FeedEvent[]>,
  );

  return (
    <div>
      {feedData.length > 0 ? (
        isGeral && isFeedExpanded ? (
          Object.entries(feedBySeason)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([season, events]) => (
              <div key={season} className={Styles.seasonSection}>
                <div className={Styles.seasonHeader}>
                  <h2 className={Styles.seasonTitle}>
                    <span className={Styles.seasonLabel}>Temporada</span>
                    <span className={Styles.seasonNumber}>{season}</span>
                  </h2>
                </div>
                <div className={Styles.wrapperFeed}>
                  {events.map((update) => (
                    <FeedItem
                      key={update.id}
                      id={update.id}
                      title={update.title}
                      subtitle={update.subtitle}
                      type={update.type}
                      time={update.time}
                      details={update.details}
                      clubName={clubName || ""}
                    />
                  ))}
                </div>
              </div>
            ))
        ) : (
          <div className={Styles.wrapperFeed}>
            {visibleFeed.map((update) => (
              <FeedItem
                key={update.id}
                id={update.id}
                title={update.title}
                subtitle={update.subtitle}
                type={update.type}
                time={update.time}
                details={update.details}
                clubName={clubName || ""}
              />
            ))}
          </div>
        )
      ) : (
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-tertiary)",
            textAlign: "center",
            margin: "10px 0",
          }}
        >
          Nenhum evento registrado ainda.
        </p>
      )}
    </div>
  );
};
