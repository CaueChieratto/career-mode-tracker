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
import { ServiceOpponentPlayers } from "../../../../../../../common/services/ServiceOpponentPlayers";
import { OpponentPlayer } from "../../../../../../../common/interfaces/OpponentPlayer";

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
  const [opponentPlayers, setOpponentPlayers] = useState<OpponentPlayer[]>([]);
  const {
    formValues,
    setFormValues,
    booleanValues,
    handleInputChange,
    handleBooleanChange,
  } = useForm();
  const initializedMatchId = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!career?.id) return;
    const opponentTeam =
      match?.homeTeam === career.clubName ? match?.awayTeam : match?.homeTeam;

    const loadOpponentPlayers = async () => {
      try {
        const list = await ServiceOpponentPlayers.getOpponentPlayers(
          career.id,
          career.groupId,
          opponentTeam,
        );
        if (isActive) {
          setOpponentPlayers(list);
        }
      } catch (err) {
        console.error("Erro ao carregar jogadores adversários:", err);
      }
    };

    void loadOpponentPlayers();

    return () => {
      isActive = false;
    };
  }, [
    career?.id,
    career?.groupId,
    career?.clubName,
    match?.homeTeam,
    match?.awayTeam,
  ]);

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

  const isUserHome = match?.homeTeam === career?.clubName;
  const opponentScore =
    Number(isUserHome ? formValues.awayScore : formValues.homeScore) || 0;
  const userScore =
    Number(isUserHome ? formValues.homeScore : formValues.awayScore) || 0;
  const opponentCardCount = Number(formValues.opponentCardCount) || 0;
  const opponentOwnGoalCount = Number(formValues.opponentOwnGoalCount) || 0;

  const opponentPlayerOptions = useMemo(() => {
    return opponentPlayers.map((p) => p.name);
  }, [opponentPlayers]);

  const saveDetails = useCallback(async () => {
    if (!career || !season || !match) return;
    setIsSaving(true);
    try {
      const isUserHome = match.homeTeam === career.clubName;
      const opponentTeam = isUserHome ? match.awayTeam : match.homeTeam;

      const namesToSave: { name: string; team?: string }[] = [];
      for (let i = 0; i < opponentScore; i++) {
        const goalP = formValues[`opponentGoalPlayer_${i}`];
        if (goalP?.trim()) namesToSave.push({ name: goalP.trim(), team: opponentTeam });
        const assistP = formValues[`opponentAssistPlayer_${i}`];
        if (assistP?.trim()) namesToSave.push({ name: assistP.trim(), team: opponentTeam });
      }
      for (let i = 0; i < opponentCardCount; i++) {
        const cardP = formValues[`opponentCardPlayer_${i}`];
        if (cardP?.trim()) namesToSave.push({ name: cardP.trim(), team: opponentTeam });
      }
      for (let i = 0; i < opponentOwnGoalCount; i++) {
        const ogP = formValues[`opponentOwnGoalPlayer_${i}`];
        if (ogP?.trim()) namesToSave.push({ name: ogP.trim(), team: opponentTeam });
      }
      if (formValues.opponentMvpName?.trim()) {
        namesToSave.push({ name: formValues.opponentMvpName.trim(), team: opponentTeam });
      }

      let allKnownPlayers = opponentPlayers;
      if (namesToSave.length > 0) {
        try {
          const savedList = await ServiceOpponentPlayers.saveOpponentPlayers(
            career.id,
            namesToSave,
            career.groupId,
          );
          if (savedList && savedList.length > 0) {
            allKnownPlayers = savedList;
            setOpponentPlayers(savedList);
          }
        } catch (err) {
          console.warn("Aviso ao persistir jogadores adversários:", err);
        }
      }

      const playerMap = new Map<string, string>();
      allKnownPlayers.forEach((p) => {
        playerMap.set(p.name.trim().toLowerCase(), p.id);
      });

      const { updatedMatch } = buildMatchPayload(
        match,
        formValues,
        booleanValues,
        isUserHome,
        playerMap,
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
    opponentScore,
    opponentCardCount,
    opponentOwnGoalCount,
    opponentPlayers,
    onClose,
    onSaved,
  ]);

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
        opponentPlayerOptions,
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
      opponentPlayerOptions,
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
