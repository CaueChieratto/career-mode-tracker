import { ActiveSectionScreen } from "./components/ActiveSectionScreen";
import { SectionViewContent } from "./components/SectionViewContent";
import { useSectionView } from "./hooks/useSectionView";
import type { SectionViewProps } from "./types/SectionViewProps";

const SectionView = (props: SectionViewProps) => {
  const { section, navigation, tabs, modal, updatePlayer } =
    useSectionView(props);

  if (navigation.screen) {
    return (
      <ActiveSectionScreen
        career={section.career}
        allCareers={props.allCareers}
        season={navigation.season}
        screen={navigation.screen}
        onClose={navigation.close}
        onOpenScreen={navigation.open}
        onOpenTransfers={props.onOpenTransfers}
      />
    );
  }

  return (
    <SectionViewContent
      props={props}
      section={section}
      navigation={navigation}
      tabs={tabs}
      modal={modal}
      updatePlayer={updatePlayer}
      backSeasons={props.backSeasons}
    />
  );
};

export default SectionView;
