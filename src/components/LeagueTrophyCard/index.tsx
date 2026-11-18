import { Dispatch, SetStateAction, useMemo, useRef } from "react";
import { ElementsCardTitles } from "../../common/elements/ElementsCardTitles";
import { Career } from "../../common/interfaces/Career";
import { Trophy } from "../../common/interfaces/club/trophy";
import Styles from "./LeagueTrophyCard.module.css";
import { ServiceCareer } from "../../common/services/ServiceCareer";
import { sortTrophySeasons } from "../../common/utils/Sorts";
import { useToast } from "../../common/hooks/UseToast";

type LeagueTrophyCardProps = {
  trophy: Trophy;
  selectedCareer: Career;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
  clubColor: string;
};

const LeagueTrophyCard = ({
  trophy,
  selectedCareer,
  setSelectedCareer,
  clubColor,
}: LeagueTrophyCardProps) => {
  const { confirm, error: showError, success: showSuccess } = useToast();
  const isDeletingRef = useRef(false);

  const sortedSeasons = useMemo(
    () => sortTrophySeasons(trophy.seasons),
    [trophy.seasons],
  );

  return (
    <div className={Styles.titles}>
      <ElementsCardTitles.Images trophyImage={trophy.leagueImage} />

      <div className={Styles.container_season}>
        {sortedSeasons.map((season, index) => {
          const deleteSeason = async () => {
            if (isDeletingRef.current) return;
            const ok = await confirm(
              `Deseja excluir permanentemente a temporada ${season}?`,
              { tone: "danger", confirmLabel: "Excluir" },
            );
            if (!ok || isDeletingRef.current) return;

            isDeletingRef.current = true;
            try {
              const updatedTrophies = await ServiceCareer.removeSeason(
                selectedCareer.id,
                trophy.leagueName,
                season,
              );

              setSelectedCareer({
                ...selectedCareer,
                trophies: updatedTrophies,
              });
              showSuccess("Temporada do troféu removida com sucesso!");
            } catch (err) {
              console.error("Erro ao excluir temporada do título:", err);
              showError("Não foi possível excluir a temporada do título.");
            } finally {
              isDeletingRef.current = false;
            }
          };
          return (
            <ElementsCardTitles.Span
              deleteSeason={deleteSeason}
              key={index}
              seasons={season}
              style={{ backgroundColor: clubColor, color: "white" }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default LeagueTrophyCard;
