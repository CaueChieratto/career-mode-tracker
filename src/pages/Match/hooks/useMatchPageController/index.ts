import { useState } from "react";
import type { Swiper as SwiperClass } from "swiper";
import { useModalManager } from "../../../../common/hooks/Modal/UseModalManager";
import { useTabView } from "../../../../common/hooks/UseTabView";
import { ModalType } from "../../../../common/types/enums/ModalType";
import { getMatchTabsConfig } from "../../config/matchTabsConfig";
import type { MatchScreen } from "../../config/screens";
import { useMatchData } from "../useMatchData";
import { useMatchTabAction } from "../useMatchTabAction";
import { useScreenStack } from "../../navigation/useScreenStack";

export const useMatchPageController = () => {
  const data = useMatchData();
  const { activeModal } = useModalManager();

  const [modalPlayerId, setModalPlayerId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const {
    current: screen,
    push: openScreen,
    pop: closeScreen,
  } = useScreenStack<MatchScreen>();

  const tabsConfig = getMatchTabsConfig();
  const storageKey = `match-tab-${data.careerId}-${data.matchesId}`;

  const { activeIndex, swiperRef, handleTabClick, handleSlideChange } =
    useTabView(storageKey);

  const handleTabClickWithReset = (index: number) => {
    setIsPickerOpen(false);
    handleTabClick(index);
  };

  const handleSlideChangeWithReset = (swiper: SwiperClass) => {
    setIsPickerOpen(false);
    handleSlideChange(swiper);
  };

  const activeTab = tabsConfig[activeIndex];

  const { isActionLoading, registerSave, handleActionClick } =
    useMatchTabAction({
      activeTab,
      openScreen,
    });

  const selectedPlayer =
    modalPlayerId && data.season
      ? data.season.players.find((player) => player.id === modalPlayerId)
      : null;

  return {
    data,

    navigation: {
      screen,
      open: openScreen,
      close: closeScreen,
    },

    tabs: {
      config: tabsConfig,
      titles: tabsConfig.map((tab) => tab.title),
      activeIndex,
      swiperRef,
      handleTabClick: handleTabClickWithReset,
      handleSlideChange: handleSlideChangeWithReset,
    },

    action: {
      button: activeTab?.actionButton,
      isLoading: isActionLoading,
      execute: handleActionClick,
      registerSave,
    },

    playerModal: {
      isOpen: Boolean(modalPlayerId),
      player: selectedPlayer,
      open: setModalPlayerId,
      close: () => setModalPlayerId(null),
    },

    isPickerOpen,
    setIsPickerOpen,

    shouldShowBottomMenu: activeModal === ModalType.NONE && !isPickerOpen,
  };
};
