import { useCallback } from "react";
import { useTabView } from "../../../../common/hooks/UseTabView";
import type { SectionScreen } from "../../config/screens";
import type { TabConfig } from "../../../../common/config/seasonTabsConfig";

interface UseSectionTabsParams {
  storageKey: string;
  tabsConfig: TabConfig[];
  openScreen: (screen: SectionScreen) => void;
}

export function useSectionTabs({
  storageKey,
  tabsConfig,
  openScreen,
}: UseSectionTabsParams) {
  const elencoIndex = tabsConfig.findIndex((tab) => tab.title === "Elenco");
  const defaultIndex =
    elencoIndex >= 0
      ? elencoIndex
      : storageKey.startsWith("season-tab-")
        ? 1
        : 0;

  const { activeIndex, swiperRef, handleTabClick, handleSlideChange } =
    useTabView(storageKey, defaultIndex);

  const activeTabConfig = tabsConfig[activeIndex];

  const handleActionButtonClick = useCallback(() => {
    if (activeTabConfig?.screen) {
      openScreen(activeTabConfig.screen);
      return;
    }

    activeTabConfig?.action?.();
  }, [activeTabConfig, openScreen]);

  return {
    activeIndex,
    actionButton: activeTabConfig?.actionButton,
    handleActionButtonClick,
    handleSlideChange,
    handleTabClick,
    swiperRef,
  };
}
