import { TabConfig } from "../../../common/config/seasonTabsConfig";
import GroupSquadTab from "../components/GroupSquadTab";
import { StatsTab_Club } from "../../../layout/SectionView/features/ClubTabs/StatsTab_Club";
import { BestPlayersTab } from "../../../layout/SectionView/features/ClubTabs/BestPlayersTab";

export const getGroupTabsConfig = (): TabConfig[] => [
  { title: "Elenco", component: GroupSquadTab },
  { title: "Estatísticas", component: StatsTab_Club },
  { title: "Melhores Jogadores", component: BestPlayersTab },
];
