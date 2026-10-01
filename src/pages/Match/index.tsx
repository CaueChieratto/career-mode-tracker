import { useEffect, useState } from "react";
import type { Swiper as SwiperInstance } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import BottomMenu from "../../ui/BottomMenu";
import Navbar from "../../ui/Navbar";
import ContainerButton from "../../components/ContainerButton";
import HeaderSeason from "../../components/HeaderSeason";
import Load from "../../components/Load";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import { SeasonThemeProvider } from "../../contexts/SeasonThemeContext";
import { PlayerMatchModal } from "./components/LineupTab/components/PlayerMatchModal";
import { MatchScreenRouter } from "./routes/MatchScreenRouter";
import { useMatchPageController } from "./hooks/useMatchPageController";
import Styles from "./Match.module.css";

export const Match = () => {
  const controller = useMatchPageController();

  const {
    career,
    season,
    match,
    loading,
    goBack,
    isFromGeral,
    updateLocalMatch,
  } = controller.data;

  const activeTitle =
    controller.tabs.config[controller.tabs.activeIndex]?.title;
  const contextKey = `${controller.data.careerId ?? ""}-${controller.data.matchesId ?? ""}`;

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

  if (loading) {
    return <Load />;
  }

  if (!career || !season || !match) {
    return <NotFoundDisplay />;
  }

  const ActionButton = controller.action.button;

  return (
    <MatchScreenRouter
      screen={controller.navigation.screen}
      career={career}
      season={season}
      match={match}
      onClose={controller.navigation.close}
      onSaved={updateLocalMatch}
    >
      <>
        {controller.action.isLoading && <Load isTransfers />}

        <SeasonThemeProvider careerId={career.id} career={career}>
          <HeaderSeason
            match={match}
            careerId={career.id}
            career={career}
            backSeasons={goBack}
            titleTextMatch={`${match.homeTeam} x ${match.awayTeam}`}
          />

          <Navbar
            options={controller.tabs.titles}
            activeOption={controller.tabs.activeIndex}
            onOptionClick={controller.tabs.handleTabClick}
          />

          {controller.playerModal.isOpen && (
            <PlayerMatchModal
              isOpen
              closeModal={controller.playerModal.close}
              match={match}
              player={controller.playerModal.player}
            />
          )}

          {ActionButton && !isFromGeral && (
            <ContainerButton className={Styles.container_button}>
              <ActionButton onClick={controller.action.execute} />
            </ContainerButton>
          )}

          <Swiper
            initialSlide={controller.tabs.activeIndex}
            onSwiper={(swiper: SwiperInstance) => {
              controller.tabs.swiperRef.current = swiper;
            }}
            onSlideChange={controller.tabs.handleSlideChange}
          >
            {controller.tabs.config.map(
              ({ title, component: TabComponent }, index) => {
                const isVisited =
                  !!currentVisited[title] ||
                  controller.tabs.activeIndex === index;

                return (
                  <SwiperSlide key={title}>
                    <div className={Styles.container}>
                      {isVisited ? (
                        <TabComponent
                          match={match}
                          season={season}
                          career={career}
                          isFromGeral={isFromGeral}
                          onRegisterSave={controller.action.registerSave}
                          onOpenPlayerModal={controller.playerModal.open}
                          onOpenScreen={controller.navigation.open}
                          onSaved={updateLocalMatch}
                        />
                      ) : null}
                    </div>
                  </SwiperSlide>
                );
              },
            )}
          </Swiper>

          {controller.shouldShowBottomMenu && <BottomMenu noHavePlayers />}
        </SeasonThemeProvider>
      </>
    </MatchScreenRouter>
  );
};
