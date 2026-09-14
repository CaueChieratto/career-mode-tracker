import type { Swiper as SwiperInstance } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import ContainerButton from "../../components/ContainerButton";
import HeaderSeason from "../../components/HeaderSeason";
import { SeasonThemeProvider } from "../../contexts/SeasonThemeContext";
import Navbar from "../../ui/Navbar";
import { ActiveSectionScreen } from "./components/ActiveSectionScreen";
import { SectionModal } from "./components/SectionModal";
import { useSectionView } from "./hooks/useSectionView";
import type { SectionViewProps } from "./types/SectionViewProps";
import Styles from "./SectionView.module.css";

const SectionView = (props: SectionViewProps) => {
  const { tabsConfig, onOpenTransfers, title, notSeason, isPlayer } = props;
  const { section, navigation, tabs, modal, updatePlayer } =
    useSectionView(props);

  const ActionButton = tabs.actionButton;

  if (navigation.screen) {
    return (
      <ActiveSectionScreen
        career={section.career}
        season={navigation.season}
        screen={navigation.screen}
        onClose={navigation.close}
      />
    );
  }

  return (
    <SeasonThemeProvider careerId={section.career.id} career={section.career}>
      <HeaderSeason
        careerId={section.career.id}
        isPlayer={isPlayer}
        career={section.career}
        season={!title ? section.season.seasonNumber : undefined}
        titleText={title}
        player={section.player}
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
        {tabsConfig.map(({ title: tabTitle, component: TabComponent }) => (
          <SwiperSlide key={tabTitle}>
            <div
              className={
                notSeason ? Styles.containerNotSeason : Styles.container
              }
            >
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
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <SectionModal
        career={section.career}
        season={section.season}
        controller={modal}
      />
    </SeasonThemeProvider>
  );
};

export default SectionView;
