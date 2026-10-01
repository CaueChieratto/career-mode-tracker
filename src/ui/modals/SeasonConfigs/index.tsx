import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Career } from "../../../common/interfaces/Career";
import Button from "../../../components/Button";
import AddTrophies from "./ui/AddTrophies";
import Styles from "./SeasonConfigs.module.css";
import {
  IoOptionsOutline,
  IoPeopleOutline,
  IoBusinessOutline,
} from "react-icons/io5";
import { GiTrophiesShelf } from "react-icons/gi";
import { CardsModal } from "./components/CardsModal";
import { SelectLeagues } from "./ui/SelectLeagues";
import { useSeasonConfigs } from "./hooks/useSeasonConfigs";
import { SEASON_ENTER_LABEL } from "./constants/seasonLabels";
import { ClubData } from "../../../common/interfaces/club/clubData";
import { BsCurrencyExchange } from "react-icons/bs";
import { SelectCurrency } from "./ui/SelectCurrency";
import { AcademyConfigs } from "./ui/AcademyConfigs";
import { useAcademyConfigs } from "./ui/AcademyConfigs/hooks/useAcademyConfigs";
import { useNavigate } from "react-router-dom";

type SeasonConfigsProps = {
  career: Career;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
  onNavigate: () => void;
  seasonName: string;
  season: ClubData;
  isGeral?: boolean;
};

export const SeasonConfigs = ({
  career,
  setSelectedCareer,
  onNavigate,
  seasonName,
  season,
  isGeral,
}: SeasonConfigsProps) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      localStorage.removeItem(`@academy_viewState_${career.id}`);
    };
  }, [career.id]);

  const {
    view,
    setView,
    currentSeasonId,
    country,
    selectedLeagues,
    setSelectedLeagues,
    clubColor,
    darkClubColor,
    canProceed,
  } = useSeasonConfigs({ career, setSelectedCareer });

  const updatedSeason =
    career.clubData.find((s) => s.id === season.id) || season;

  const { isSaving: isSavingAcademy, handleSaveAcademy } = useAcademyConfigs({
    career,
    setSelectedCareer,
  });

  if (isGeral) {
    return (
      <div className={Styles.container}>
        <div className={Styles.grid}>
          <CardsModal
            icon={<IoPeopleOutline className={Styles.icon} />}
            label="Visualizar"
            title="Clube"
            onClick={() => setSelectedPath(`/Career/${career.id}/Geral`)}
            clubColor={clubColor}
            darkClubColor={darkClubColor}
            className={
              selectedPath === `/Career/${career.id}/Geral`
                ? Styles.selected_card
                : ""
            }
          />
          <CardsModal
            icon={<IoBusinessOutline className={Styles.icon} />}
            label="Visualizar"
            title="Base"
            onClick={() => setSelectedPath(`/Career/${career.id}/Academy`)}
            clubColor={clubColor}
            darkClubColor={darkClubColor}
            className={
              selectedPath === `/Career/${career.id}/Academy`
                ? Styles.selected_card
                : ""
            }
          />
        </div>

        {selectedPath && (
          <Button
            className={Styles.button}
            onClick={() => {
              document.body.classList.remove("modal-open");

              navigate(selectedPath, { state: { career } });
            }}
            style={{
              backgroundColor: clubColor,
              border: `1px solid ${darkClubColor}`,
            }}
          >
            Entrar {selectedPath.endsWith("/Academy") ? "na Base" : "no Clube"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {view === "menu" && (
        <div className={Styles.container}>
          <div className={Styles.grid}>
            <CardsModal
              icon={<IoOptionsOutline className={Styles.icon} />}
              label="Selecionar"
              title="Ligas"
              onClick={() => setView("selecting")}
              clubColor={clubColor}
              darkClubColor={darkClubColor}
            />
            {canProceed && (
              <CardsModal
                icon={<GiTrophiesShelf className={Styles.icon} />}
                label="Adicionar"
                title="Títulos"
                onClick={() => setView("add")}
                clubColor={clubColor}
                darkClubColor={darkClubColor}
              />
            )}
            <CardsModal
              icon={<BsCurrencyExchange className={Styles.icon} />}
              label="Alterar"
              title="Moeda"
              onClick={() => setView("currency")}
              clubColor={clubColor}
              darkClubColor={darkClubColor}
            />
            {canProceed && (
              <CardsModal
                icon={<IoPeopleOutline className={Styles.icon} />}
                label="Configurar"
                title="Base"
                onClick={() => setView("base")}
                clubColor={clubColor}
                darkClubColor={darkClubColor}
              />
            )}
          </div>
          {canProceed && (
            <Button
              className={Styles.button}
              onClick={() => {
                document.body.classList.remove("modal-open");
                onNavigate();
              }}
              style={{
                backgroundColor: clubColor,
                border: `1px solid ${darkClubColor}`,
              }}
            >
              {SEASON_ENTER_LABEL}
            </Button>
          )}
        </div>
      )}
      {view === "selecting" && (
        <SelectLeagues
          careerId={career.id}
          nation={country}
          selectedLeagues={selectedLeagues}
          setSelectedLeagues={setSelectedLeagues}
          onClose={() => setView("menu")}
          clubColor={clubColor}
          seasonId={currentSeasonId}
          career={career}
          setSelectedCareer={setSelectedCareer}
        />
      )}
      {view === "add" && (
        <div className={Styles.container_add_trophies}>
          <AddTrophies
            season={updatedSeason}
            careerId={career.id}
            setView={() => setView("menu")}
            selectedCareer={career}
            setSelectedCareer={setSelectedCareer}
            seasonName={seasonName}
          />
        </div>
      )}
      {view === "currency" && (
        <SelectCurrency
          careerId={career.id}
          clubColor={clubColor}
          career={career}
          setSelectedCareer={setSelectedCareer}
          onClose={() => setView("menu")}
        />
      )}
      {view === "base" && (
        <AcademyConfigs
          clubColor={clubColor}
          onClose={() => setView("menu")}
          onSave={handleSaveAcademy}
          isSaving={isSavingAcademy}
          initialData={career.academy}
        />
      )}
    </>
  );
};
