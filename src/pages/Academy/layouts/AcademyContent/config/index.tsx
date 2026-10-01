import {
  FaHistory,
  FaPlus,
  FaTrophy,
  FaUsers,
  FaSyncAlt,
} from "react-icons/fa";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { Career } from "../../../../../common/interfaces/Career";
import Button from "../../../../../components/Button";
import { FeedItem } from "../components/FeedItem";
import { PlayerItem } from "../components/Player/components/PlayerItem";
import { PlayerStatusList } from "../components/Player/components/PlayerStatusList";
import { AcademyPlayers } from "../interfaces/AcademyPlayers/AcademyPlayers";
import { SkeletonButton, SkeletonItem } from "../ui/SkeletonCard";
import { IconType } from "react-icons";
import Styles from "../AcademyContent.module.css";
import { AcademyTournaments } from "../interfaces/AcademyTournaments/AcademyTournaments";
import { TournamentListItem } from "../components/Tournament/components/TournamentListItem";
import { FeedEvent } from "../components/FeedItem/types/FeedEvent";
import React from "react";
import {
  PLAYER_SORT_OPTIONS,
  TOURNAMENT_SORT_OPTIONS,
} from "../constants/Sorts";

type configProps = {
  career: Career;
  playersAcademy: AcademyPlayers[];
  allPlayersAcademy: AcademyPlayers[];
  tournamentsAcademy: AcademyTournaments[];
  feedData: FeedEvent[];
  activeCardIndex: number | null;
  selectedPlayerId: string | null;
  selectedTournamentId: string | null;
  onAddPlayerClick: () => void;
  onAddTournamentClick: () => void;
  onPromotePlayerClick: () => void;
  onPlayerClick: (playerId: string) => void;
  onTournamentClick: (id: string) => void;
  playerSort: string;
  setPlayerSort: (val: string) => void;
  tournamentSort: string;
  setTournamentSort: (val: string) => void;
  isGeral?: boolean;
  playerListMode: "academy" | "promoted" | "released";
  togglePlayerListMode: () => void;
};

export type DashboardCardConfig = {
  id?: string;
  Icon: IconType;
  title: React.ReactNode;
  actionText?: string;
  skeletonContent: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  sortOptions?: { value: string; label: string }[];
  currentSort?: string;
  onSortChange?: (value: string) => void;
  itemCount?: number;
};

export const getConfig = ({
  career,
  playersAcademy,
  allPlayersAcademy,
  feedData,
  activeCardIndex,
  selectedPlayerId,
  tournamentsAcademy,
  selectedTournamentId,
  onAddPlayerClick,
  onAddTournamentClick,
  onPromotePlayerClick,
  onPlayerClick,
  onTournamentClick,
  playerSort,
  setPlayerSort,
  tournamentSort,
  setTournamentSort,
  isGeral,
  playerListMode,
  togglePlayerListMode,
}: configProps): DashboardCardConfig[] => {
  let currentPlayersCount = playersAcademy.length;
  if (playerListMode === "promoted") {
    currentPlayersCount = allPlayersAcademy.filter(
      (p) => p.status === "promoted",
    ).length;
  } else if (playerListMode === "released") {
    currentPlayersCount = allPlayersAcademy.filter(
      (p) => p.status === "released",
    ).length;
  }

  const playersSkeletonCount =
    currentPlayersCount > 0
      ? activeCardIndex === 0
        ? currentPlayersCount
        : Math.min(currentPlayersCount, 3)
      : 3;

  const clubName = career.clubName;

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

  const cards: DashboardCardConfig[] = [
    {
      id: `players-card-${playerListMode}`,
      Icon: FaUsers,
      itemCount: currentPlayersCount,
      className: Styles.flipCard,
      title: (
        <span className={Styles.clickableTitleWrapper}>
          <span>
            {playerListMode === "academy"
              ? career.academy!.nickname
              : playerListMode === "promoted"
                ? "Jogadores Promovidos"
                : "Jogadores Dispensados"}
          </span>
          <span
            className={Styles.wrapperSpinIcon}
            onClick={(e) => {
              e.stopPropagation();
              togglePlayerListMode();
            }}
          >
            <FaSyncAlt size={14} className={Styles.spinIcon} />
          </span>
        </span>
      ),
      actionText: "Ver todos",
      sortOptions: PLAYER_SORT_OPTIONS,
      currentSort: playerSort,
      onSortChange: setPlayerSort,
      skeletonContent: (
        <>
          {Array.from({ length: playersSkeletonCount }).map((_, i) => (
            <SkeletonItem key={i} index={i} />
          ))}
        </>
      ),
      children: (
        <div className={Styles.wrapper}>
          {playerListMode === "academy" ? (
            playersAcademy.length > 0 ? (
              (activeCardIndex === 0 || selectedPlayerId !== null
                ? playersAcademy
                : playersAcademy.slice(0, 3)
              ).map((player) => (
                <PlayerItem
                  key={player.id}
                  playersAcademy={player}
                  onClick={() => onPlayerClick(player.id)}
                  isSelected={player.id === selectedPlayerId}
                />
              ))
            ) : (
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-tertiary)",
                  textAlign: "center",
                  margin: "10px 0",
                }}
              >
                Nenhum jogador na base.
              </p>
            )
          ) : (
            <PlayerStatusList
              players={allPlayersAcademy}
              status={playerListMode as "promoted" | "released"}
              activeCardIndex={activeCardIndex}
              cardIndex={0}
              selectedPlayerId={selectedPlayerId}
              onPlayerClick={onPlayerClick}
              currentSort={playerSort}
            />
          )}
        </div>
      ),
    },
    {
      Icon: FaTrophy,
      title: career.academy!.tournament,
      actionText: "Ver todos",
      itemCount: tournamentsAcademy.length,
      sortOptions: TOURNAMENT_SORT_OPTIONS,
      currentSort: tournamentSort,
      onSortChange: setTournamentSort,
      skeletonContent: (
        <>
          <SkeletonItem index={0} />
          <SkeletonItem index={1} />
          <SkeletonItem index={2} />
        </>
      ),
      children: (
        <div className={Styles.wrapper}>
          {tournamentsAcademy.length > 0 ? (
            (activeCardIndex === 1 || selectedTournamentId !== null
              ? tournamentsAcademy
              : tournamentsAcademy.slice(0, 3)
            ).map((tourn) => (
              <TournamentListItem
                key={tourn.id}
                tournament={tourn}
                onClick={() => onTournamentClick(tourn.id)}
                isSelected={tourn.id === selectedTournamentId}
              />
            ))
          ) : (
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-tertiary)",
                textAlign: "center",
                margin: "10px 0",
              }}
            >
              Nenhum torneio cadastrado.
            </p>
          )}
        </div>
      ),
    },
    {
      Icon: FaHistory,
      title: "Feed de Atividades",
      actionText: "Ver feed completo",
      skeletonContent: (
        <>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonItem key={i} index={i} />
          ))}
        </>
      ),
      children: (
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
                          clubName={clubName}
                        />
                      ))}
                    </div>
                  </div>
                ))
            ) : (
              <div className={Styles.wrapperFeed}>
                {visibleFeed.map((update) => {
                  return (
                    <FeedItem
                      key={update.id}
                      id={update.id}
                      title={update.title}
                      subtitle={update.subtitle}
                      type={update.type}
                      time={update.time}
                      details={update.details}
                      clubName={clubName}
                    />
                  );
                })}
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
      ),
    },
    {
      Icon: HiOutlineDocumentReport,
      title: "Ações Rápidas",
      className: Styles.actionsWidget,
      skeletonContent: (
        <>
          <SkeletonButton />
          <SkeletonButton />
          <SkeletonButton />
        </>
      ),
      children: (
        <div className={Styles.wrapper}>
          <Button className={Styles.actionBtn} onClick={onAddPlayerClick}>
            <FaPlus /> Adicionar Jogador
          </Button>
          <Button className={Styles.actionBtn} onClick={onAddTournamentClick}>
            <FaTrophy /> Adicionar Torneio
          </Button>
          <Button
            className={`${Styles.actionBtn} ${Styles.promoteBtn}`}
            onClick={onPromotePlayerClick}
          >
            Promover ao Profissional
          </Button>
        </div>
      ),
    },
  ];

  if (isGeral) {
    return cards.filter((card) => card.Icon !== HiOutlineDocumentReport);
  }

  return cards;
};
