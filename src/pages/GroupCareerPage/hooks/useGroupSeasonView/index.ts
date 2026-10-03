import { useState, useMemo, useEffect } from "react";
import { Career } from "../../../../common/interfaces/Career";
import { CareerGroup } from "../../../../common/interfaces/CareerGroup";
import { ClubData } from "../../../../common/interfaces/club/clubData";
import { PlayersGroupService } from "../../../../common/services/ServicePlayers/PlayersGroupService";
import { auth } from "../../../../common/services/Firebase";
import { getValidDate } from "../../helper/getValidDate";

export type SeasonByCareer = {
  clubName: string;
  season: ClubData;
  career: Career;
};

export const useGroupSeasonView = (save: CareerGroup) => {
  const [loading, setLoading] = useState(true);
  const [groupPlayers, setGroupPlayers] = useState<
    Career["clubData"][number]["players"]
  >([]);
  const [seasonsByCareer, setSeasonsByCareer] = useState<SeasonByCareer[]>([]);

  const latestCareer = useMemo(
    () =>
      [...save.careers].sort(
        (a, b) =>
          getValidDate(b.createdAt).getTime() -
          getValidDate(a.createdAt).getTime(),
      )[0],
    [save.careers],
  );

  useEffect(() => {
    if (!latestCareer) return;
    let active = true;
    setLoading(true);

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        Promise.all([
          PlayersGroupService.getAggregatedGroupStats(save.id),
          PlayersGroupService.getGroupSeasonsData(save.id),
        ])
          .then(([players, seasons]) => {
            if (!active) return;
            setGroupPlayers(players);
            setSeasonsByCareer(seasons);
          })
          .catch((error) => {
            console.error("Erro ao carregar dados do grupo:", error);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      } else {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [save.id, latestCareer]);

  const groupCareer: Career | undefined = useMemo(() => {
    if (!latestCareer) return undefined;
    return {
      ...latestCareer,
      id: latestCareer.id,
      clubName: save.managerName,
      clubData: seasonsByCareer.map((s) => ({
        ...s.season,
        clubName: s.clubName,
      })),
    };
  }, [latestCareer, seasonsByCareer, save]);

  return { loading, groupPlayers, seasonsByCareer, groupCareer, latestCareer };
};
