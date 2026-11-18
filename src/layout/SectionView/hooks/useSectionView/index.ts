import { useCallback, useEffect, useMemo } from "react";
import { buildSectionViewModel } from "../../helpers/buildSectionViewModel";
import { augmentCareerWithMatchStats } from "../../../../common/stats/helpers/mergeMatchStats";
import type { SectionViewProps } from "../../types/SectionViewProps";
import { useSectionCareer } from "../useSectionCareer";
import { useSectionModal } from "../useSectionModal";
import { useSectionNavigation } from "../useSectionNavigation";
import { useSectionTabs } from "../useSectionTabs";
import { Players } from "../../../../common/interfaces/playersInfo/players";
import { findAchievedObjectiveBonusesToSettle } from "../../../../common/services/ServiceFinance/clauseAutoEvaluator";
import { PlayersContractService } from "../../../../common/services/ServicePlayers/PlayersContractService";

type UseSectionViewParams = Pick<
  SectionViewProps,
  | "career"
  | "season"
  | "tabsConfig"
  | "player"
  | "isPlayer"
  | "notSeason"
  | "onScreenChange"
  | "tabStorageKey"
>;

export function useSectionView({
  career,
  season,
  tabsConfig,
  player,
  isPlayer,
  notSeason,
  onScreenChange,
  tabStorageKey,
}: UseSectionViewParams) {
  const { localCareer, refreshSeason, updateMatchesOptimistically } =
    useSectionCareer(career, season.id);

  const augmentedCareer = useMemo(
    () => augmentCareerWithMatchStats(localCareer),
    [localCareer],
  );

  const { augmentedSeason, augmentedPlayer, storageKey } = useMemo(
    () =>
      buildSectionViewModel({
        career: augmentedCareer,
        season,
        player,
        isPlayer,
        notSeason,
        tabStorageKey,
      }),
    [augmentedCareer, isPlayer, notSeason, player, season, tabStorageKey],
  );

  useEffect(() => {
    if (
      notSeason ||
      isPlayer ||
      !augmentedCareer?.id ||
      !augmentedSeason?.id ||
      augmentedSeason.id === "geral"
    ) {
      return;
    }

    const candidates = findAchievedObjectiveBonusesToSettle(
      augmentedCareer,
      augmentedSeason,
    );
    if (candidates.length === 0) return;

    let cancelled = false;
    void PlayersContractService.autoSettleAchievedObjectiveBonuses(
      augmentedCareer.id,
      augmentedSeason.id,
      augmentedCareer,
      augmentedSeason,
    ).then((result) => {
      if (!cancelled && result.settledCount > 0) {
        void refreshSeason(augmentedSeason.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [notSeason, isPlayer, augmentedCareer, augmentedSeason, refreshSeason]);

  const updatePlayer = useCallback(
    (updatedPlayer: Players) => {
      updateMatchesOptimistically(
        { type: "UPDATE_PLAYER", player: updatedPlayer },
        augmentedSeason.id,
      );
    },
    [updateMatchesOptimistically, augmentedSeason.id],
  );

  const navigation = useSectionNavigation({
    career: augmentedCareer,
    fallbackSeason: augmentedSeason,
    onScreenChange,
    refreshSeason,
    updateMatchesOptimistically,
  });

  const tabs = useSectionTabs({
    storageKey,
    tabsConfig,
    openScreen: navigation.open,
  });

  const modal = useSectionModal({
    career: augmentedCareer,
    season: augmentedSeason,
    refreshSeason,
  });

  return {
    section: {
      career: augmentedCareer,
      season: augmentedSeason,
      player: augmentedPlayer,
    },
    navigation,
    tabs,
    modal,
    updatePlayer,
  };
}
