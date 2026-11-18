import React, { useContext, useRef } from "react";
import Styles from "./AddSeason_PlayerScreen.module.css";
import ModalManager from "../../../../../../../../../common/constants/ModalManager";
import { useModalManager } from "../../../../../../../../../common/hooks/Modal/UseModalManager";
import { useSeasonTheme } from "../../../../../../../../../common/hooks/Seasons/UseSeasonTheme";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Load from "../../../../../../../../../components/Load";
import Navbar from "../../../../../../../../../ui/Navbar";
import { usePlayerStats } from "../../../../../../../../../common/hooks/Players/UsePlayerStats";
import AddSeason_Player_Form from "../../components/AddSeason_Player_Form";
import { toRawPlayer } from "../../../../../../../../../common/stats/helpers/mergeMatchStats";
import { AddSeasonPlayerContext } from "../../contexts/context";
import { AddSeasonPlayerProps } from "../../types";
import { NavigationSessionStore } from "../../../../../../../../../common/services/NavigationSessionStore";

export const AddSeason_PlayerScreen: React.FC<Partial<AddSeasonPlayerProps>> = (
  props = {},
) => {
  const context = useContext(AddSeasonPlayerContext);

  const career = props?.career ?? context?.career;
  const season = props?.season ?? context?.season;
  const player = props?.player ?? context?.player;
  const onClose = props?.onClose ?? context?.onClose;

  const formRef = useRef<HTMLFormElement>(null);
  const pendingPlayerRef = useRef<Players | undefined>(undefined);
  const modalManager = useModalManager();
  const { clubColor, darkClubColor } = useSeasonTheme();

  const handleCancelBack = () => {
    pendingPlayerRef.current = undefined;
    onClose?.();
  };

  const handleGoBack = () => {
    const updatedPlayer = pendingPlayerRef.current;
    pendingPlayerRef.current = undefined;

    const targetPlayerId = updatedPlayer?.id || player?.id;
    if (targetPlayerId) {
      NavigationSessionStore.saveClickAnchor("stats", {
        scrollY: 0,
        anchorSelector: `#player-stat-${targetPlayerId}`,
        updatedAt: Date.now(),
      });
    }

    if (updatedPlayer) {
      onClose?.({ type: "UPDATE_PLAYER", player: updatedPlayer });
      return;
    }
    onClose?.();
  };

  const { handleStatsSave, isStatsLoading } = usePlayerStats({
    career: career!,
    careerId: career?.id || "",
    currentPlayers: season?.players || [],
    handleGoBack,
  });

  const handleSave = async () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    const drafted = formData.get("draftedLeagues") as string;
    const statsLeagues = drafted ? JSON.parse(drafted) : undefined;
    const ballonDor = formData.get("ballonDor") === "true" ? 1 : 0;

    let targetPlayer = player;

    if (!targetPlayer && season?.players) {
      const selectedName = formData.get("playerName") as string | null;
      targetPlayer = selectedName
        ? season.players.find((p) => p.name === selectedName)
        : undefined;
    }

    if (targetPlayer) {
      const rawPlayer = toRawPlayer(targetPlayer);
      pendingPlayerRef.current = {
        ...rawPlayer,
        ballonDor,
        statsLeagues: statsLeagues ?? rawPlayer.statsLeagues,
      };
    }

    const result = await handleStatsSave(formData);
    if (result === false) {
      pendingPlayerRef.current = undefined;
    }
  };

  if (!career || !season) return null;

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        backSeasons={handleCancelBack}
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
};

export default AddSeason_PlayerScreen;
