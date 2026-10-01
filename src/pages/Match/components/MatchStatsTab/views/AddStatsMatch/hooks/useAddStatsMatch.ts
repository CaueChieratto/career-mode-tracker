import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useForm } from "../../../../../../../common/hooks/UseForm";
import { ServiceMatches } from "../../../../../../../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { AddStatsMatchFormFields } from "../constants/FormFields";
import { buildInitialStats } from "../helpers/buildInitialStats";
import { buildMatchUpdate } from "../helpers/buildMatchUpdate";
import { Field } from "../../../../../../../components/FormSection";
import { Match } from "../../../../../../../common/interfaces/Match";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Career } from "../../../../../../../common/interfaces/Career";

type UseAddStatsMatchProps = {
  career: Career;
  season: ClubData;
  match: Match;
  onClose: () => void;
  onSaved?: (match: Match) => void;
};

export const useAddStatsMatch = ({
  career,
  season,
  match,
  onClose,
  onSaved,
}: UseAddStatsMatchProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const initializedMatchId = useRef<string | null>(null);

  const { formValues, setFormValues, handleInputChange } = useForm();

  const handleLocalInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      field: Field,
    ) => {
      let value = e.target.value;

      const percentageFields = [
        "userPossession",
        "homeShotAccuracy",
        "awayShotAccuracy",
        "homePassAccuracy",
        "awayPassAccuracy",
      ];

      if (percentageFields.includes(field.id)) {
        if (value !== "") {
          const numericValue = Number(value.replace(/\D/g, ""));
          value = String(Math.min(100, Math.max(0, numericValue)));
        }
        setFormValues((prev) => ({ ...prev, [field.id]: value }));
        return;
      }

      handleInputChange(e, field);
    },
    [handleInputChange, setFormValues],
  );

  const isUserHome = match?.homeTeam === career?.clubName;

  useEffect(() => {
    if (match && career && initializedMatchId.current !== match.matchesId) {
      const initial = buildInitialStats(match, isUserHome);
      setFormValues(initial);
      initializedMatchId.current = match.matchesId;
    }
  }, [match, career, isUserHome, setFormValues]);

  const saveStats = useCallback(async () => {
    setIsSaving(true);
    try {
      const matchToSave = buildMatchUpdate(formValues, match, isUserHome);
      await ServiceMatches.updateMatchStatsInSeason(
        career.id,
        season.id,
        matchToSave,
      );

      onSaved?.(matchToSave);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [formValues, match, career, season, isUserHome, onClose, onSaved]);

  const fields = useMemo(
    () =>
      AddStatsMatchFormFields(
        match?.homeTeam || "Mandante",
        match?.awayTeam || "Visitante",
        isUserHome,
      ),
    [match, isUserHome],
  );

  return {
    isSaving,
    fields,
    formValues,
    handleInputChange: handleLocalInputChange,
    saveStats,
  };
};
