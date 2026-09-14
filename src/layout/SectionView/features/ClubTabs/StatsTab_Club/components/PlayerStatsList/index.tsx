import { useLocation } from "react-router-dom";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import PlayerStats from "./components/PlayerStats";

type PlayerStatsListProps = {
  players: Players[];
  career: Career;
  season: ClubData;
  onEditPlayerStats: (playerId: string) => void;
  onUpdatePlayer?: (player: Players) => void;
};

const PlayerStatsList = ({
  players,
  career,
  season,
  onEditPlayerStats,
  onUpdatePlayer,
}: PlayerStatsListProps) => {
  const location = useLocation();
  const isGeralPage = location.pathname.includes("/Geral");

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
        />
      ))}
    </>
  );
};

export default PlayerStatsList;
