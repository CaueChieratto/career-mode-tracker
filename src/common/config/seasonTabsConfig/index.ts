import { NavigateFunction } from "react-router-dom";
import { Buttons } from "../../elements/Buttons";
import { Career } from "../../interfaces/Career";
import { ClubData } from "../../interfaces/club/clubData";
import { Players } from "../../interfaces/playersInfo/players";
import { AllMatchesTab } from "../../../layout/SectionView/features/ClubTabs/AllMatchesTab";
import InfoPlayerTab from "../../../layout/SectionView/features/PlayerTabs/InfoPlayerTab";
import SeasonsPlayerTab from "../../../layout/SectionView/features/PlayerTabs/SeasonsPlayerTab";
import TotalPlayerTab from "../../../layout/SectionView/features/PlayerTabs/TotalPlayerTab";
import GeneralTab from "../../../layout/SectionView/features/ClubTabs/GeneralTab";
import SquadTab from "../../../layout/SectionView/features/ClubTabs/SquadTab";
import { StatsTab_Club } from "../../../layout/SectionView/features/ClubTabs/StatsTab_Club";
import { BestPlayersTab } from "../../../layout/SectionView/features/ClubTabs/BestPlayersTab";
import { CuriositiesTab } from "../../../layout/SectionView/features/ClubTabs/CuriositiesTab";
import { TableTab } from "../../../layout/SectionView/features/ClubTabs/TableTab";
import AcademyPlayerTab from "../../../layout/SectionView/features/PlayerTabs/AcademyPlayerTab";
import PlayerDetailedStatsTab from "../../../layout/SectionView/features/PlayerTabs/PlayerDetailedStatsTab";
import FinanceTab from "../../../layout/SectionView/features/ClubTabs/FinanceTab";
import { SectionScreen } from "../../../layout/SectionView/config/screens";

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
    isActive?: boolean;
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
    !isPlayer && {
      title: "Finanças",
      component: FinanceTab,
      actionButton: Buttons.ManageClauses,
      screen: { key: "manageClauses", readOnly: notSeason },
    },

    {
      title: isPlayer ? "Jogador" : "Elenco",
      component: isPlayer ? InfoPlayerTab : SquadTab,
      actionButton: isPlayer && !notSeason ? undefined : Buttons.AddSquadPlayer,
      action:
        isPlayer && !notSeason
          ? undefined
          : () => {
              window.dispatchEvent(
                new CustomEvent("open-add-player-choice-modal"),
              );
            },
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
