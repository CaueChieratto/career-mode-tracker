import { useRef } from "react";
import ModalManager from "../../../../../../../../../common/constants/ModalManager";
import { useModalManager } from "../../../../../../../../../common/hooks/Modal/UseModalManager";
import { useSeasonTheme } from "../../../../../../../../../common/hooks/Seasons/UseSeasonTheme";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Load from "../../../../../../../../../components/Load";
import { usePlayerActions } from "../../hooks/usePlayerActions";
import Navbar from "../../../../../../../../../ui/Navbar";
import Styles from "./AddSquad_PlayerScreen.module.css";
import AddSquad_Player_Form from "../../components/AddSquad_Player_Form";
import { useAddSquadPlayerContext } from "../../contexts/context";
import { AddSquadPlayerProps } from "../../types";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";

export function AddSquad_PlayerScreen(props?: Partial<AddSquadPlayerProps>) {
  const context = useAddSquadPlayerContext();

  const career = props?.career ?? context.career;
  const season = props?.season ?? context.season;
  const playerId =
    props?.playerId !== undefined ? props.playerId : context.playerId;
  const onClose = props?.onClose ?? context.onClose;

  const formRef = useRef<HTMLFormElement>(null);
  const modalManager = useModalManager();
  const { clubColor, darkClubColor } = useSeasonTheme();
  const player = season?.players?.find((p: Players) => p.id === playerId);

  const {
    isLoading,
    handleAddOrEditPlayer,
    handleDeletePlayer,
    handleSellPlayer,
    handleReturnLoanPlayer,
  } = usePlayerActions({
    careerId: career?.id,
    seasonId: season?.id,
    player,
    currentPlayers: season?.players || [],
    onSuccess: onClose,
    career,
    season,
  });

  const handleSave = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      handleAddOrEditPlayer(formData);
    }
  };

  const activeLabel = player ? "Editar Jogador" : "Adicionar Jogador";

  return (
    <>
      <HeaderSeason
        careerId={career?.id}
        career={career}
        backSeasons={onClose}
        titleText={player?.name}
      />
      <Navbar
        save={handleSave}
        options={["", activeLabel, ""]}
        activeOption={1}
        onOptionClick={() => {}}
      />
      <div className={Styles.container}>
        <div className={Styles.form_container}>
          <AddSquad_Player_Form
            ref={formRef}
            player={player}
            career={career}
            season={season}
            openModal={modalManager.openModal}
          />
        </div>
      </div>
      {isLoading && <Load />}
      <ModalManager
        activeModal={modalManager.activeModal}
        onClose={modalManager.closeModal}
        onConfirm={handleDeletePlayer}
        onSellConfirm={handleSellPlayer}
        onReturnLoanConfirm={handleReturnLoanPlayer}
        selectedCareer={modalManager.selectedCareer || career}
        setSelectedCareer={modalManager.setSelectedCareer}
        player={player}
        clubColor={clubColor}
        darkClubColor={darkClubColor}
      />
    </>
  );
}

export default AddSquad_PlayerScreen;
