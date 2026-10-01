import { useState, useMemo, useRef } from "react";
import Styles from "../../forms/components/PlayerForm/PlayerForm.module.css";
import Button from "../../../../../../../../components/Button";
import SearchableSelect from "../../../../../../../../components/SearchableSelect";
import { useAcademyContext } from "../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { AcademyService } from "../../../../services/AcademyService";
import { getSeasonStartYear } from "../../../../utils/getSeasonStartYear";
import { FormInput } from "../../../FormInput";
import { toSingular } from "../../../FeedItem/helpers/toSingular";
import { isEuropeanSeason } from "../../../../utils/isEuropeanSeason";

type PromoteAcademyPlayerFormProps = {
  onComplete: () => void;
};

export const PromoteAcademyPlayerForm = ({
  onComplete,
}: PromoteAcademyPlayerFormProps) => {
  const {
    career,
    seasonId,
    playersAcademy,
    allTournamentsAcademy,
    hasLoadedAllTournaments,
    applyPromotedPlayer,
  } = useAcademyContext();
  const [isLoading, setIsLoading] = useState(false);
  const submitLockRef = useRef(false);
  const [selectedPlayerName, setSelectedPlayerName] = useState("");
  const [promotionDate, setPromotionDate] = useState("");

  const playerOptions = useMemo(() => {
    const allNames = playersAcademy.map((p) => p.name);
    return allNames.filter((name) =>
      name.toLowerCase().includes(selectedPlayerName.toLowerCase()),
    );
  }, [playersAcademy, selectedPlayerName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    if (!hasLoadedAllTournaments) return;
    if (!selectedPlayerName || !promotionDate) return;
    const playerToPromote = playersAcademy.find(
      (p) => p.name === selectedPlayerName,
    );
    if (!playerToPromote) return;
    submitLockRef.current = true;
    setIsLoading(true);
    try {
      const [day, month] = promotionDate.split("/");
      let year = getSeasonStartYear(career, seasonId);

      const isEurope = isEuropeanSeason(career);
      if (isEurope && Number(month) < 7) {
        year += 1;
      }

      const finalDate = `${day}/${month}/${year}`;

      const { academyPlayer: promotedPlayer } =
        await AcademyService.promotePlayerToProfessional(
        career,
        seasonId,
        playerToPromote,
        finalDate,
        allTournamentsAcademy,
      );
      applyPromotedPlayer(promotedPlayer);
      onComplete();
    } catch (error) {
      console.error(error);
      alert("Falha ao promover o jogador. Tente novamente.");
    } finally {
      submitLockRef.current = false;
      setIsLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 2) {
      val = val.substring(0, 2) + "/" + val.substring(2, 4);
    }
    setPromotionDate(val);
  };

  const singularNickname = toSingular(career.academy!.nickname);

  return (
    <form className={Styles.formContainer} onSubmit={handleSubmit}>
      <div className={Styles.row}>
        <div className={Styles.wrapper}>
          <label className={Styles.label}>{singularNickname}</label>
          <SearchableSelect
            name="playerName"
            options={playerOptions}
            value={selectedPlayerName}
            placeholder="Selecionar"
            onChange={(e) => setSelectedPlayerName(e.target.value)}
            className={Styles.selectTrigger}
          />
        </div>
        <FormInput
          label="Data da Promoção"
          placeholder="DD/MM"
          value={promotionDate}
          onChange={handleDateChange}
          maxLength={5}
          required
        />
      </div>
      <Button
        className={Styles.submitBtn}
        type="submit"
        disabled={
          isLoading ||
          !hasLoadedAllTournaments ||
          !selectedPlayerName ||
          promotionDate.length < 5
        }
      >
        {isLoading ? "Promovendo..." : `Promover ${selectedPlayerName}`}
      </Button>
    </form>
  );
};
