import { useNavigate, useParams } from "react-router-dom";
import { useRef, useState } from "react";
import { Career } from "../../../../../../common/interfaces/Career";
import { ColorsService } from "../../../../../../common/services/ColorsService";
import { ServiceSeasons } from "../../../../../../common/services/ServiceSeasons";
import { useCareers } from "../../../../../../common/hooks/Career/UseCareer";
import { useClubColors } from "../../../../../../common/hooks/Colors/UseClubColors";
import { toast } from "../../../../../../common/services/ToastService";

export type UseAddSeasonsParams = {
  careerId?: string;
  careers?: Career[];
  loadingCareers?: boolean;
  onClose?: () => void;
};

export const useAddSeasons = (params?: UseAddSeasonsParams) => {
  const navigate = useNavigate();
  const { careerId: routeCareerId } = useParams<{ careerId: string }>();
  const hasExternalCareers = Array.isArray(params?.careers);
  const careersResult = useCareers(!hasExternalCareers);
  const fetchedLoading = careersResult?.loading ?? false;
  const fetchedCareers = careersResult?.careers ?? [];

  const effectiveCareerId = params?.careerId ?? routeCareerId;
  const effectiveCareers = params?.careers ?? fetchedCareers;
  const effectiveLoadingCareers = params?.loadingCareers ?? fetchedLoading;

  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  const career = effectiveCareers.find((c) => c.id === effectiveCareerId);

  const { clubColor, darkClubColor } = useClubColors(
    ColorsService.getColorSaved(career?.id || "default") || "#ffffff",
  );

  const handleAddSeason = async (career: Career) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
      setLoading(true);
      await ServiceSeasons.addSeason(career);
      toast.success("Temporada adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar temporada:", error);
      toast.error("Ocorreu um erro ao adicionar a temporada.");
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  const goBack = () => {
    if (params?.onClose) {
      params.onClose();
      return;
    }
    navigate("/CareersPage");
  };

  return {
    career,
    clubColor,
    darkClubColor,
    handleAddSeason,
    goBack,
    loading: effectiveLoadingCareers || loading,
  };
};
