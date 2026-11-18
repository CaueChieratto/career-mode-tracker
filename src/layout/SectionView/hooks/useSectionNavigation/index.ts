import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { Career } from "../../../../common/interfaces/Career";
import type { ClubData } from "../../../../common/interfaces/club/clubData";
import type { SectionScreen } from "../../config/screens";
import type { OptimisticUpdateData } from "../../helpers/updateSectionCareer";
import { useScreenStack } from "../../../../common/hooks/useScreenStack";

interface UseSectionNavigationParams {
  career: Career;
  fallbackSeason: ClubData;
  onScreenChange?: (hasOpenScreen: boolean) => void;
  refreshSeason: (targetSeasonId?: string) => Promise<void>;
  updateMatchesOptimistically: (
    optimisticData: OptimisticUpdateData,
    targetSeasonId?: string,
  ) => void;
}

export function useSectionNavigation({
  career,
  fallbackSeason,
  onScreenChange,
  refreshSeason,
  updateMatchesOptimistically,
}: UseSectionNavigationParams) {
  const location = useLocation();
  const locationState = location.state as {
    reopenScreen?: SectionScreen;
  } | null;
  const initialScreen = locationState?.reopenScreen ?? null;

  const {
    current: screen,
    push: openScreen,
    pop: closeScreen,
  } = useScreenStack<SectionScreen>(initialScreen);

  const lastHandledReopenRef = useRef<SectionScreen | null>(initialScreen);

  useEffect(() => {
    const nextReopen = locationState?.reopenScreen;
    if (nextReopen && nextReopen !== lastHandledReopenRef.current) {
      lastHandledReopenRef.current = nextReopen;
      openScreen(nextReopen);
    }
  }, [locationState?.reopenScreen, openScreen]);

  useEffect(() => {
    onScreenChange?.(Boolean(screen));
  }, [onScreenChange, screen]);

  useEffect(() => {
    try {
      const currentState = window.history.state || {};
      const currentUsr = currentState.usr || {};
      const targetReopenScreen = screen?.key === "player" ? screen : null;

      if (currentUsr.reopenScreen !== targetReopenScreen) {
        window.history.replaceState(
          {
            ...currentState,
            usr: {
              ...currentUsr,
              reopenScreen: targetReopenScreen,
            },
          },
          "",
        );
      }
    } catch {
      // Ignore security or JSDOM history state errors
    }
  }, [screen]);

  const screenSeasonId = screen?.seasonId;

  const screenSeason = screenSeasonId
    ? (career.clubData.find((season) => season.id === screenSeasonId) ??
      fallbackSeason)
    : fallbackSeason;

  const handleCloseScreen = useCallback(
    (optimisticData?: OptimisticUpdateData) => {
      if (optimisticData) {
        updateMatchesOptimistically(optimisticData, screenSeasonId);
      }

      closeScreen();
      void refreshSeason(screenSeasonId);
    },
    [closeScreen, refreshSeason, screenSeasonId, updateMatchesOptimistically],
  );

  return {
    screen,
    season: screenSeason,
    open: openScreen,
    close: handleCloseScreen,
  };
}
