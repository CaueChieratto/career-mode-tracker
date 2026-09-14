import { NavigateFunction } from "react-router-dom";
import { Buttons } from "../../../common/elements/Buttons";
import { Career } from "../../../common/interfaces/Career";
import { ClubData } from "../../../common/interfaces/club/clubData";
import { Players } from "../../../common/interfaces/playersInfo/players";
import { AllMatchesTab } from "../features/ClubTabs/AllMatchesTab";
import InfoPlayerTab from "../features/PlayerTabs/InfoPlayerTab";
import SeasonsPlayerTab from "../features/PlayerTabs/SeasonsPlayerTab";
import TotalPlayerTab from "../features/PlayerTabs/TotalPlayerTab";
import GeneralTab from "../features/ClubTabs/GeneralTab";
import SquadTab from "../features/ClubTabs/SquadTab";
import { StatsTab_Club } from "../features/ClubTabs/StatsTab_Club";
import { BestPlayersTab } from "../features/ClubTabs/BestPlayersTab";
import { CuriositiesTab } from "../features/ClubTabs/CuriositiesTab";
import { TableTab } from "../features/ClubTabs/TableTab";
import AcademyPlayerTab from "../features/PlayerTabs/AcademyPlayerTab";
import PlayerDetailedStatsTab from "../features/PlayerTabs/PlayerDetailedStatsTab";
import { SectionScreen } from "./screens";

export type TabConfig = {
  title: string;
  component: React.FC<{
    season: ClubData;
    career: Career;
    onOpenTransfers?: (type: "arrivals" | "exit") => void;
    isPlayer?: boolean;
    player?: Players;
    onAddBadge?: (teamName: string) => void;
    notSeason?: boolean;
    onOpenScreen?: (screen: SectionScreen) => void;
    onUpdatePlayer?: (player: Players) => void;
  }>;
  actionButton?: React.FC<{ onClick?: () => void }>;
  action?: () => void;
  screen?: SectionScreen;
};

export const getSeasonTabsConfig = (
  career: Career,
  seasonId: string,
  navigate: NavigateFunction,
  isPlayer: boolean,
  notSeason?: boolean,
  player?: Players,
): TabConfig[] => {
  const careerId = career.id;
  const hasAcademySaved = !!career.academy;
  const isSpecialCareer = career.id === "d10554e8-da4f-4489-84b9-c513f414884b";

  const hasAcademyData =
    isPlayer &&
    player?.isAcademy &&
    (player?.academyNickname === career.academy?.nickname || isSpecialCareer);

  return [
    {
      title: isPlayer ? "Jogador" : "Elenco",
      component: isPlayer ? InfoPlayerTab : SquadTab,
      actionButton: isPlayer && !notSeason ? undefined : Buttons.AddSquadPlayer,
      screen: isPlayer && !notSeason ? undefined : { key: "addSquadPlayer" },
    },

    {
      title: "Partidas",
      component: AllMatchesTab,
      actionButton: !isPlayer ? Buttons.AddMatches : undefined,
      screen: !isPlayer ? { key: "addMatches" } : undefined,
    },

    !isPlayer && {
      title: "Classificação",
      component: TableTab,
      actionButton: Buttons.AddTeamsToTable,
      screen: { key: "addTeamsToTable" },
    },

    hasAcademyData && {
      title: "Base",
      component: AcademyPlayerTab,
    },

    {
      title: isPlayer ? "Temporadas" : "Estatísticas",
      component: isPlayer ? SeasonsPlayerTab : StatsTab_Club,
      actionButton:
        isPlayer && !notSeason ? undefined : Buttons.AddPlayerSeason,
      screen: isPlayer && !notSeason ? undefined : { key: "addSeasonPlayer" },
    },

    {
      title: isPlayer ? "Estatísticas" : "Melhores Jogadores",
      component: isPlayer ? PlayerDetailedStatsTab : BestPlayersTab,
      actionButton: !isPlayer ? Buttons.ChangeClubColors : undefined,
    },

    {
      title: isPlayer ? "Total" : "Geral",
      component: isPlayer ? TotalPlayerTab : GeneralTab,
      actionButton:
        isPlayer && !notSeason
          ? undefined
          : hasAcademySaved
            ? Buttons.EnterAcademy
            : Buttons.ChangeClubColors,
      action:
        hasAcademySaved && !(isPlayer && !notSeason)
          ? () =>
              navigate(`/Career/${careerId}/Academy`, {
                state: {
                  career,
                  seasonId,
                },
              })
          : undefined,
    },

    !isPlayer && {
      title: "Curiosidades",
      component: CuriositiesTab,
      actionButton: Buttons.ChangeClubColors,
    },
  ].filter(Boolean) as TabConfig[];
};
