import { Buttons } from "../../../common/elements/Buttons";
import { Career } from "../../../common/interfaces/Career";
import { ClubData } from "../../../common/interfaces/club/clubData";
import { Match } from "../../../common/interfaces/Match";
import { LineupTab } from "../components/LineupTab";
import { MatchStatsTab } from "../components/MatchStatsTab";
import { MatchDetailsTab } from "../components/MatchDetailsTab";
import { MatchScreen } from "./screens";

type MatchTabConfig = {
  title: string;
  component: React.FC<{
    match: Match;
    season: ClubData;
    career: Career;
    onRegisterSave?: (fn: () => Promise<void> | void) => void;
    isFromGeral?: boolean;
    onOpenPlayerModal?: (playerId: string) => void;
    onOpenScreen?: (screen: MatchScreen) => void;
    onSaved?: (match: Partial<Match>) => void;
    onPickerOpenChange?: (isOpen: boolean) => void;
  }>;
  actionButton?: React.FC<{ onClick?: () => void }>;
  action?: () => void;
  screen?: MatchScreen;
};

export const getMatchTabsConfig = (): MatchTabConfig[] => [
  {
    title: "Resultado",
    component: MatchDetailsTab,
    actionButton: Buttons.AddDetails,
    screen: { key: "addMatchDetails" },
  },
  {
    title: "Formações",
    component: LineupTab,
    actionButton: Buttons.SaveFormation,
  },
  {
    title: "Estatísticas",
    component: MatchStatsTab,
    actionButton: Buttons.AddStatsMatch,
    screen: { key: "addStatsMatch" },
  },
];
