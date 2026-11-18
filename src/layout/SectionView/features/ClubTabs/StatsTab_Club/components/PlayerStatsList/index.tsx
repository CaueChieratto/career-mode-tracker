import { useLocation } from "react-router-dom";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { SectionScreen } from "../../../../../config/screens";
import PlayerStats from "./components/PlayerStats";

type PlayerStatsListProps = {
  players: Players[];
  career: Career;
  season: ClubData;
  onEditPlayerStats: (playerId: string) => void;
  onUpdatePlayer?: (player: Players) => void;
  isGeralPage?: boolean;
  onOpenScreen?: (screen: SectionScreen) => void;
};

const PlayerStatsList = ({
  players,
  career,
  season,
  onEditPlayerStats,
  onUpdatePlayer,
  isGeralPage: propIsGeralPage,
  onOpenScreen,
}: PlayerStatsListProps) => {
  const location = useLocation();
  const isGeralPage = propIsGeralPage ?? location.pathname.includes("/Geral");

  return (
    <>
      {players.map((player, i) => (
        <PlayerStats
          key={`${player.id}-${i}`}
          player={player}
          career={career}
          season={season}
          isGeralPage={isGeralPage}
          onEditPlayerStats={onEditPlayerStats}
          onUpdatePlayer={onUpdatePlayer}
          onOpenScreen={onOpenScreen}
        />
      ))}
    </>
  );
};

export default PlayerStatsList;
