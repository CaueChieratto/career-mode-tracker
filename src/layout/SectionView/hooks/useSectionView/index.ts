import { useCallback, useMemo } from "react";
import { buildSectionViewModel } from "../../helpers/buildSectionViewModel";
import { augmentCareerWithMatchStats } from "../../helpers/mergeMatchStats";
import type { SectionViewProps } from "../../types/SectionViewProps";
import { useSectionCareer } from "../useSectionCareer";
import { useSectionModal } from "../useSectionModal";
import { useSectionNavigation } from "../useSectionNavigation";
import { useSectionTabs } from "../useSectionTabs";
import { Players } from "../../../../common/interfaces/playersInfo/players";

type UseSectionViewParams = Pick<
  SectionViewProps,
  | "career"
  | "season"
  | "tabsConfig"
  | "player"
  | "isPlayer"
  | "notSeason"
  | "onScreenChange"
>;

export function useSectionView({
  career,
  season,
  tabsConfig,
  player,
  isPlayer,
  notSeason,
  onScreenChange,
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
      }),
    [augmentedCareer, isPlayer, notSeason, player, season],
  );

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
