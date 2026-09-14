import { useRef } from "react";
import Styles from "./AddSeason_PlayerScreen.module.css";
import ModalManager from "../../../../../../../../../common/constants/ModalManager";
import { useModalManager } from "../../../../../../../../../common/hooks/Modal/UseModalManager";
import { useSeasonTheme } from "../../../../../../../../../common/hooks/Seasons/UseSeasonTheme";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Load from "../../../../../../../../../components/Load";
import Navbar from "../../../../../../../../../ui/Navbar";
import { usePlayerStats } from "../../../../../../../../../common/hooks/Players/UsePlayerStats";
import AddSeason_Player_Form from "../../components/AddSeason_Player_Form";
import { OptimisticUpdateData } from "../../../../../../../helpers/updateSectionCareer";
import { toRawPlayer } from "../../../../../../../helpers/mergeMatchStats";

type Props = {
  career: Career;
  season: ClubData;
  player?: Players;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
};

export default function AddSeason_PlayerScreen({
  career,
  season,
  player,
  onClose,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const pendingPlayerRef = useRef<Players | undefined>(undefined);
  const modalManager = useModalManager();
  const { clubColor, darkClubColor } = useSeasonTheme();

  const handleGoBack = () => {
    const updatedPlayer = pendingPlayerRef.current;
    pendingPlayerRef.current = undefined;
    if (updatedPlayer) {
      onClose({ type: "UPDATE_PLAYER", player: updatedPlayer });
      return;
    }
    onClose();
  };

  const { handleStatsSave, isStatsLoading } = usePlayerStats({
    career,
    careerId: career.id,
    currentPlayers: season.players,
    handleGoBack,
  });

  const handleSave = () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    const drafted = formData.get("draftedLeagues") as string;
    const statsLeagues = drafted ? JSON.parse(drafted) : undefined;
    const ballonDor = formData.get("ballonDor") === "true" ? 1 : 0;

    let targetPlayer = player;

    if (!targetPlayer) {
      const selectedName = formData.get("playerName") as string | null;
      targetPlayer = selectedName
        ? season.players.find((p) => p.name === selectedName)
        : undefined;
    }

    if (targetPlayer) {
      pendingPlayerRef.current = toRawPlayer({
        ...targetPlayer,
        ballonDor,
        statsLeagues: statsLeagues ?? targetPlayer.statsLeagues,
      });
    }

    handleStatsSave(formData);
  };

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        backSeasons={onClose}
        titleText={player?.name}
      />
      <Navbar
        save={handleSave}
        options={["", "Salvar Desempenho", ""]}
        activeOption={1}
        onOptionClick={() => {}}
      />
      <div className={Styles.container}>
        <div className={Styles.form_container}>
          <AddSeason_Player_Form
            ref={formRef}
            player={player}
            career={career}
            season={season}
            openModal={modalManager.openModal}
          />
        </div>
      </div>
      {isStatsLoading && <Load />}
      <ModalManager
        activeModal={modalManager.activeModal}
        onClose={modalManager.closeModal}
        selectedCareer={modalManager.selectedCareer || career}
        setSelectedCareer={modalManager.setSelectedCareer}
        player={player}
        clubColor={clubColor}
        darkClubColor={darkClubColor}
      />
    </>
  );
}
