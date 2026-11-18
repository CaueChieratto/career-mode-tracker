import { useEffect, useState } from "react";
import type { Swiper as SwiperInstance } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import ContainerButton from "../../../../components/ContainerButton";
import HeaderSeason from "../../../../components/HeaderSeason";
import { SeasonThemeProvider } from "../../../../contexts/SeasonThemeContext";
import Navbar from "../../../../ui/Navbar";
import { SectionModal } from "../SectionModal";
import type { SectionViewProps } from "../../types/SectionViewProps";
import type { Career } from "../../../../common/interfaces/Career";
import type { ClubData } from "../../../../common/interfaces/club/clubData";
import type { Players } from "../../../../common/interfaces/playersInfo/players";
import type { useSectionNavigation } from "../../hooks/useSectionNavigation";
import type { useSectionTabs } from "../../hooks/useSectionTabs";
import type { useSectionModal } from "../../hooks/useSectionModal";
import Styles from "../../SectionView.module.css";

export interface SectionViewContentProps {
  props: SectionViewProps;
  section: {
    career: Career;
    season: ClubData;
    player?: Players;
  };
  navigation: ReturnType<typeof useSectionNavigation>;
  tabs: ReturnType<typeof useSectionTabs>;
  modal: ReturnType<typeof useSectionModal>;
  updatePlayer: (updatedPlayer: Players) => void;
  backSeasons?: () => void;
}

export const SectionViewContent = ({
  props,
  section,
  navigation,
  tabs,
  modal,
  updatePlayer,
  backSeasons,
}: SectionViewContentProps) => {
  const { tabsConfig, onOpenTransfers, title, notSeason, isPlayer } = props;
  const effectiveBackSeasons = props.backSeasons ?? backSeasons;

  const contextKey = `${section.career.id}-${section.season.id}-${section.player?.id ?? ""}-${notSeason ? "geral" : "season"}`;
  const activeTitle = tabsConfig[tabs.activeIndex]?.title;

  const [visitedState, setVisitedState] = useState<{
    contextKey: string;
    visited: Record<string, boolean>;
  }>(() => ({
    contextKey,
    visited: activeTitle ? { [activeTitle]: true } : {},
  }));

  let currentVisited = visitedState.visited;
  if (visitedState.contextKey !== contextKey) {
    currentVisited = activeTitle ? { [activeTitle]: true } : {};
    setVisitedState({
      contextKey,
      visited: currentVisited,
    });
  }

  useEffect(() => {
    if (activeTitle && !currentVisited[activeTitle]) {
      setVisitedState((prev) => ({
        ...prev,
        visited: { ...prev.visited, [activeTitle]: true },
      }));
    }
  }, [activeTitle, currentVisited]);

  const ActionButton = tabs.actionButton;

  return (
    <SeasonThemeProvider careerId={section.career.id} career={section.career}>
      <HeaderSeason
        careerId={section.career.id}
        isPlayer={isPlayer}
        career={section.career}
        season={!title ? section.season.seasonNumber : undefined}
        titleText={title}
        player={section.player}
        backSeasons={effectiveBackSeasons}
      />

      <Navbar
        options={tabsConfig.map((tab) => tab.title)}
        activeOption={tabs.activeIndex}
        onOptionClick={tabs.handleTabClick}
      />

      {ActionButton && !notSeason && (
        <ContainerButton className={Styles.container_button}>
          <ActionButton onClick={tabs.handleActionButtonClick} />
        </ContainerButton>
      )}

      <Swiper
        initialSlide={tabs.activeIndex}
        onSwiper={(swiper: SwiperInstance) => {
          tabs.swiperRef.current = swiper;
        }}
        onSlideChange={tabs.handleSlideChange}
      >
        {tabsConfig.map(
          ({ title: tabTitle, component: TabComponent }, index) => {
            const isVisited =
              !!currentVisited[tabTitle] || tabs.activeIndex === index;

            return (
              <SwiperSlide key={tabTitle}>
                <div
                  className={
                    !(ActionButton && !notSeason)
                      ? Styles.containerNotSeason
                      : Styles.container
                  }
                >
                  {isVisited ? (
                    <TabComponent
                      season={section.season}
                      career={section.career}
                      onOpenTransfers={onOpenTransfers}
                      isPlayer={isPlayer}
                      player={section.player}
                      onAddBadge={modal.openAddBadge}
                      notSeason={notSeason}
                      onOpenScreen={navigation.open}
                      onUpdatePlayer={updatePlayer}
                      isActive={tabs.activeIndex === index}
                    />
                  ) : null}
                </div>
              </SwiperSlide>
            );
          },
        )}
      </Swiper>

      <SectionModal
        career={section.career}
        season={section.season}
        controller={modal}
      />
    </SeasonThemeProvider>
  );
};

