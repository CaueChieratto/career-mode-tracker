import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useForm } from "../../../../../../../common/hooks/UseForm";
import { formatRating } from "../../../../../../../common/utils/FormatRating";
import { Field } from "../../../../../../../components/FormSection";
import { ServiceMatches } from "../../../../../../../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { buildFormFields } from "../helpers/buildFormFields";
import { buildInitialFormValues } from "./helpers/buildInitialFormValues";
import { buildMatchPayload } from "./helpers/buildMatchPayload";
import { resolveCardConflicts } from "./helpers/resolveCardConflicts";
import { Match } from "../../../../../../../common/interfaces/Match";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { ServiceCareer } from "../../../../../../../common/services/ServiceCareer";
import { getSeasonName } from "../../../../../../../common/utils/GetSeasonName";

type UseAddDetailsProps = {
  career: Career;
  season: ClubData;
  match: Match;
  onClose: () => void;
  onSaved?: (match: Partial<Match>) => void;
};

export const useAddDetails = ({
  career,
  season,
  match,
  onClose,
  onSaved,
}: UseAddDetailsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const {
    formValues,
    setFormValues,
    booleanValues,
    handleInputChange,
    handleBooleanChange,
  } = useForm();
  const initializedMatchId = useRef<string | null>(null);

  useEffect(() => {
    if (!match || !career || initializedMatchId.current === match.matchesId)
      return;
    const { initialFormValues, booleansToSet } = buildInitialFormValues(
      match,
      career.clubName,
    );
    setFormValues(initialFormValues);
    booleansToSet.forEach(({ key, value }) => handleBooleanChange(key, value));
    initializedMatchId.current = match.matchesId;
  }, [match, career, setFormValues, handleBooleanChange]);

  const handleLocalInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      field: Field,
    ) => {
      let value = e.target.value;
      if (field.id === "opponentMvpRating") {
        value = formatRating(value);
        setFormValues((prev) => ({ ...prev, [field.id]: value }));
        return;
      }
      handleInputChange(e, field);
    },
    [handleInputChange, setFormValues],
  );

  const handleLocalBooleanChange = useCallback(
    (fieldId: string, value: boolean) => {
      const { updates } = resolveCardConflicts(fieldId, value);
      updates.forEach(({ key, value }) => handleBooleanChange(key, value));
      handleBooleanChange(fieldId, value);
    },
    [handleBooleanChange],
  );

  const saveDetails = useCallback(async () => {
    if (!career || !season || !match) return;
    setIsSaving(true);
    try {
      const isUserHome = match.homeTeam === career.clubName;
      const { updatedMatch } = buildMatchPayload(
        match,
        formValues,
        booleanValues,
        isUserHome,
      );
      await ServiceMatches.updateMatchDetailsInSeason(
        career,
        season,
        match,
        updatedMatch as Match,
        !booleanValues.hasPenalties,
      );
      if (
        (updatedMatch.stage?.trim().toLowerCase() === "final" ||
          match.stage?.trim().toLowerCase() === "final") &&
        updatedMatch.result === "V"
      ) {
        try {
          const seasonName = getSeasonName(
            season.seasonNumber,
            career.createdAt,
            career.nation,
          );
          await ServiceCareer.saveClubTrophies(
            career.id,
            [match.league],
            [seasonName],
          );
        } catch (trophyErr) {
          console.error("Erro ao adicionar título na final:", trophyErr);
        }
      }
      onClose();
      onSaved?.(updatedMatch as Match);
    } finally {
      setIsSaving(false);
    }
  }, [
    formValues,
    booleanValues,
    match,
    career,
    season,
    onClose,
    onSaved,
  ]);

  const isUserHome = match?.homeTeam === career?.clubName;
  const opponentScore =
    Number(isUserHome ? formValues.awayScore : formValues.homeScore) || 0;
  const userScore =
    Number(isUserHome ? formValues.homeScore : formValues.awayScore) || 0;
  const opponentCardCount = Number(formValues.opponentCardCount) || 0;
  const opponentOwnGoalCount = Number(formValues.opponentOwnGoalCount) || 0;

  const opponentGoalOptions = useMemo(() => {
    return Array.from({ length: opponentScore }).map((_, i) => {
      const min = formValues[`opponentGoalMinute_${i}`];
      const player = formValues[`opponentGoalPlayer_${i}`];
      if (player && min) return `${player} - ${min}'`;
      if (player) return player;
      if (min) return `${min}'`;
      return `Gol ${i + 1}`;
    });
  }, [opponentScore, formValues]);

  const fields = useMemo(
    () =>
      buildFormFields(
        !!booleanValues.hasExtraTime,
        !!booleanValues.hasPenalties,
        opponentScore,
        opponentCardCount,
        opponentOwnGoalCount,
        userScore,
        opponentGoalOptions,
        booleanValues,
        match?.homeTeam,
        match?.awayTeam,
        formValues,
      ),
    [
      booleanValues,
      opponentScore,
      opponentCardCount,
      opponentGoalOptions,
      opponentOwnGoalCount,
      userScore,
      match?.homeTeam,
      match?.awayTeam,
      formValues,
    ],
  );

  return {
    isSaving,
    fields,
    formValues,
    handleInputChange: handleLocalInputChange,
    handleBooleanChange: handleLocalBooleanChange,
    saveDetails,
  };
};
