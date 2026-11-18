import type { Career } from "../../../../common/interfaces/Career";
import type { ClubData } from "../../../../common/interfaces/club/clubData";
import type { Players } from "../../../../common/interfaces/playersInfo/players";
import type { TabConfig } from "../../../../common/config/seasonTabsConfig";

export interface SectionViewProps {
  career: Career;
  season: ClubData;
  tabsConfig: TabConfig[];
  onOpenTransfers?: (type: "arrivals" | "exit") => void;
  title?: string;
  notSeason?: boolean;
  isPlayer?: boolean;
  player?: Players;
  onScreenChange?: (hasOpenScreen: boolean) => void;
  allCareers?: Career[];
  backSeasons?: () => void;
  tabStorageKey?: string;
}
