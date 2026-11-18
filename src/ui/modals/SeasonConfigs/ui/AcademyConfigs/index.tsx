import { useState } from "react";
import Styles from "./AcademyConfigs.module.css";
import {
  IoBusinessOutline,
  IoTrophyOutline,
  IoPeopleOutline,
} from "react-icons/io5";
import { SeasonConfigSubScreen } from "../../components/SeasonConfigSubScreen";

type AcademyConfigsProps = {
  clubColor?: string;
  onClose: () => void;
  onSave: (
    academyName: string,
    tournamentName: string,
    youthNickname: string,
  ) => Promise<void> | void;
  isSaving: boolean;
  initialData?: { name: string; tournament: string; nickname: string };
};

export const AcademyConfigs = ({
  clubColor,
  onClose,
  onSave,
  isSaving,
  initialData,
}: AcademyConfigsProps) => {
  const [academyName, setAcademyName] = useState(initialData?.name || "");
  const [tournamentName, setTournamentName] = useState(
    initialData?.tournament || "",
  );
  const [youthNickname, setYouthNickname] = useState(
    initialData?.nickname || "",
  );
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    const finalAcademy = academyName.trim() || "Elenco da base";
    const finalTournament = tournamentName.trim() || "Torneio da base";
    const finalNickname = youthNickname.trim() || "Jovens promessas";

    await onSave(finalAcademy, finalTournament, finalNickname);
    setShowSuccess(true);

    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <SeasonConfigSubScreen
      title="Dados da Base"
      subtitle="Anote as informações para acompanhar os jovens talentos do seu save"
      clubColor={clubColor}
      confirmLabel={isSaving ? "Salvando..." : "Salvar Dados"}
      onConfirm={handleSave}
      onBack={onClose}
      isSaving={isSaving}
      disableBackWhileSaving
      saveButtonClassName={Styles.save_button}
      wrapperClassName={Styles.wrapper_gap}
      footerClassName={Styles.footer_gap}
      afterContent={
        showSuccess ? (
          <div className={Styles.success_message}>
            Acesse a base pela aba "Geral" da temporada.
          </div>
        ) : undefined
      }
    >
      <div className={Styles.cards_wrapper}>
        <div className={Styles.input_card}>
          <div className={Styles.icon_wrap}>
            <IoBusinessOutline />
          </div>
          <div className={Styles.input_content}>
            <label className={Styles.label}>Complexo da Base</label>
            <input
              type="text"
              className={Styles.input}
              placeholder="Ex: La Masia"
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
            />
          </div>
        </div>

        <div className={Styles.input_card}>
          <div className={Styles.icon_wrap}>
            <IoTrophyOutline />
          </div>
          <div className={Styles.input_content}>
            <label className={Styles.label}>Principal Torneio</label>
            <input
              type="text"
              className={Styles.input}
              placeholder="Ex: Copinha"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
            />
          </div>
        </div>

        <div className={Styles.input_card}>
          <div className={Styles.icon_wrap}>
            <IoPeopleOutline />
          </div>
          <div className={Styles.input_content}>
            <label className={Styles.label}>Identidade dos Atletas</label>
            <input
              type="text"
              className={Styles.input}
              placeholder="Ex: Meninos da Vila"
              value={youthNickname}
              onChange={(e) => setYouthNickname(e.target.value)}
            />
          </div>
        </div>
      </div>
    </SeasonConfigSubScreen>
  );
};
