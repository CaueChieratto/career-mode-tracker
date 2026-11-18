import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { CareerGroup } from "../../common/interfaces/CareerGroup";
import Load from "../../components/Load";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import SectionView from "../../layout/SectionView";
import { getGroupTabsConfig } from "./config/groupTabsConfig";
import { useGroupSeasonView } from "./hooks/useGroupSeasonView";
import { ServiceCareerGroup } from "./services/ServiceCareerGroup";
import { GroupCareerContext } from "./contexts/GroupCareerContext";
import { auth } from "../../common/services/Firebase";
import BottomMenu from "../../ui/BottomMenu";

export const GroupCareerPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const stateSave = location.state?.save as CareerGroup | undefined;

  const [save, setSave] = useState<CareerGroup | undefined>(stateSave);
  const [fetching, setFetching] = useState(!stateSave);
  const [hasOpenScreen, setHasOpenScreen] = useState(false);

  const tabsConfig = useMemo(() => getGroupTabsConfig(), []);

  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        if (!stateSave) {
          setFetching(true);
        }
        ServiceCareerGroup.getById(groupId)
          .then((data) => setSave(data ?? undefined))
          .catch((error) => {
            console.error("Erro ao buscar grupo:", error);
          })
          .finally(() => setFetching(false));
      } else {
        setFetching(false);
      }
    });

    return () => unsubscribe();
  }, [groupId, stateSave]);

  const { loading, groupPlayers, seasonsByCareer, groupCareer } =
    useGroupSeasonView(
      save ?? {
        id: "",
        managerName: "",
        careers: [],
        careerIds: [],
        createdAt: new Date(),
      },
    );

  if (fetching || (save && loading)) return <Load />;
  if (!save || !groupCareer || !seasonsByCareer[0]?.season)
    return <NotFoundDisplay />;

  return (
    <GroupCareerContext.Provider
      value={{ save, seasonsByCareer, groupPlayers }}
    >
      <SectionView
        notSeason
        title={save.managerName}
        career={groupCareer}
        season={seasonsByCareer[0].season}
        tabsConfig={tabsConfig}
        onScreenChange={setHasOpenScreen}
        tabStorageKey={`group-tab-${save.id}`}
      />

      {!hasOpenScreen && <BottomMenu />}
    </GroupCareerContext.Provider>
  );
};
