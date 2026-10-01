import { useNavigate, useParams } from "react-router-dom";
import { useRef, useState } from "react";
import { Career } from "../../../../common/interfaces/Career";
import { ColorsService } from "../../../../common/services/ColorsService";
import { ServiceSeasons } from "../../../../common/services/ServiceSeasons";
import { useCareers } from "../../../../common/hooks/Career/UseCareer";
import { useClubColors } from "../../../../common/hooks/Colors/UseClubColors";

export const useAddSeasons = () => {
  const navigate = useNavigate();
  const { careerId } = useParams<{ careerId: string }>();
  const { loading: loadingCareers, careers } = useCareers();

  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  const career = careers.find((c) => c.id === careerId);

  const { clubColor, darkClubColor } = useClubColors(
    ColorsService.getColorSaved(career?.id || "default") || "#ffffff",
  );

  const handleAddSeason = async (career: Career) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
      setLoading(true);
      await ServiceSeasons.addSeason(career);
    } catch (error) {
      console.error("Erro ao adicionar temporada:", error);
      alert("Ocorreu um erro ao adicionar a temporada.");
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  const goBack = () => navigate("/CareersPage");

  return {
    loading: loading || loadingCareers,
    career,
    clubColor,
    darkClubColor,
    handleAddSeason,
    goBack,
  };
};
