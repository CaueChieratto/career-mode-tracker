import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useForm } from "../../../../../../../common/hooks/UseForm";
import { formatRating } from "../../../../../../../common/utils/FormatRating";
import { Field } from "../../../../../../../components/FormSection";
import { ServiceMatches } from "../../../../../../../common/services/ServiceMatches";
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
import { toast } from "../../../../../../../common/services/ToastService";

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
  const [explicitSelectedPlayers, setExplicitSelectedPlayers] = useState<
    Record<string, { id: string; name: string; isFormerPlayer?: boolean }>
  >({});
  const {
    formValues,
    setFormValues,
    booleanValues,
    handleInputChange,
    handleBooleanChange,
  } = useForm();
  const initializedMatchId = useRef<string | null>(null);

  const isUserHome = match?.homeTeam === career?.clubName;
  const opponentTeam = isUserHome ? match?.awayTeam : match?.homeTeam;

  const formerClubPlayers = useMemo<OpponentPlayer[]>(() => {
    if (!career?.clubData) return [];
    const seen = new Set<string>();
    const exPlayers: OpponentPlayer[] = [];

    const activeCurrentSeasonIds = new Set<string>();
    const activeCurrentSeasonNames = new Set<string>();
    (season?.players || []).forEach((p) => {
      if (!p.sell) {
        if (p.id) activeCurrentSeasonIds.add(p.id);
        if (p.playedWithUs) activeCurrentSeasonIds.add(p.playedWithUs);
        if (p.name) activeCurrentSeasonNames.add(p.name.trim().toLowerCase());
      }
    });

    for (const s of career.clubData) {
      const isPastSeason = s.seasonNumber < (season?.seasonNumber || 1);
      for (const p of s.players || []) {
        const normalizedName = p.name?.trim().toLowerCase() || "";
        if (
          activeCurrentSeasonIds.has(p.id) ||
          (p.playedWithUs && activeCurrentSeasonIds.has(p.playedWithUs)) ||
          activeCurrentSeasonNames.has(normalizedName)
        ) {
          continue;
        }

        const hasLeftInSeason =
          Boolean(p.sell) ||
          (p.contract || []).some((c) => Boolean(c.leftClub) && !c.isLoan);

        if ((isPastSeason || hasLeftInSeason) && p.name && !seen.has(p.id)) {
          seen.add(p.id);
          exPlayers.push({
            id: p.id,
            name: p.name.trim(),
            team: opponentTeam,
            isFormerPlayer: true,
            careerId: career.id,
          });
        }
      }
    }
    return exPlayers;
  }, [
    career?.clubData,
    career?.id,
    opponentTeam,
    season?.players,
    season?.seasonNumber,
  ]);

  const combinedOpponentPlayers = useMemo<OpponentPlayer[]>(() => {
    const list = [...opponentPlayers];
    for (const fp of formerClubPlayers) {
      const existing = list.find(
        (p) =>
          p.id === fp.id ||
          p.name.trim().toLowerCase() === fp.name.trim().toLowerCase(),
      );
      if (existing) {
        existing.isFormerPlayer = true;
      } else {
        list.push(fp);
      }
    }
    return list;
  }, [opponentPlayers, formerClubPlayers]);

  useEffect(() => {
    let isActive = true;
    if (!career?.id) return;

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
    opponentTeam,
  ]);

  useEffect(() => {
    if (!match || !career || initializedMatchId.current === match.matchesId)
      return;
    const { initialFormValues, booleansToSet, initialSelectedPlayers } =
      buildInitialFormValues(match, career.clubName);
    setFormValues(initialFormValues);
    if (initialSelectedPlayers) {
      setExplicitSelectedPlayers(initialSelectedPlayers);
    }
    booleansToSet.forEach(({ key, value }) => handleBooleanChange(key, value));
    initializedMatchId.current = match.matchesId;
  }, [match, career, setFormValues, handleBooleanChange]);

  const handleSelectOption = useCallback(
    (optionValue: string, field: Field) => {
      const normalizedValue = optionValue.trim().toLowerCase();
      const found =
        combinedOpponentPlayers.find(
          (p) =>
            p.name.trim().toLowerCase() === normalizedValue &&
            (p.team?.trim().toLowerCase() ===
              opponentTeam?.trim().toLowerCase() ||
              p.isFormerPlayer),
        ) ||
        combinedOpponentPlayers.find(
          (p) => p.name.trim().toLowerCase() === normalizedValue,
        );

      if (found) {
        setExplicitSelectedPlayers((prev) => ({
          ...prev,
          [field.id]: {
            id: found.id,
            name: found.name,
            isFormerPlayer: found.isFormerPlayer,
          },
        }));
      }
      setFormValues((prev) => ({ ...prev, [field.id]: optionValue }));
    },
    [combinedOpponentPlayers, opponentTeam, setFormValues],
  );

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

      const isExplicit =
        "isExplicitSelection" in e.target
          ? Boolean(
              (e.target as { isExplicitSelection?: boolean })
                .isExplicitSelection,
            )
          : false;
      if (isExplicit) {
        handleSelectOption(value, field);
      } else {
        setExplicitSelectedPlayers((prev) => {
          if (!prev[field.id]) return prev;
          const next = { ...prev };
          delete next[field.id];
          return next;
        });
      }

      handleInputChange(e, field);
    },
    [handleInputChange, handleSelectOption, setFormValues],
  );

  const handleLocalBooleanChange = useCallback(
    (fieldId: string, value: boolean) => {
      const { updates } = resolveCardConflicts(fieldId, value);
      updates.forEach(({ key, value }) => handleBooleanChange(key, value));
      handleBooleanChange(fieldId, value);
    },
    [handleBooleanChange],
  );

  const opponentScore =
    Number(isUserHome ? formValues.awayScore : formValues.homeScore) || 0;
  const userScore =
    Number(isUserHome ? formValues.homeScore : formValues.awayScore) || 0;
  const opponentCardCount = Number(formValues.opponentCardCount) || 0;
  const opponentOwnGoalCount = Number(formValues.opponentOwnGoalCount) || 0;

  const opponentPlayerOptions = useMemo(() => {
    return combinedOpponentPlayers.map((p) => p.name);
  }, [combinedOpponentPlayers]);

  const saveDetails = useCallback(async () => {
    if (!career || !season || !match) return;
    setIsSaving(true);
    try {
      const isUserHome = match.homeTeam === career.clubName;
      const opponentTeam = isUserHome ? match.awayTeam : match.homeTeam;

      const fieldPlayerInfoMap: Record<
        string,
        { id: string; isFormerPlayer?: boolean }
      > = {};
      const newPlayersToSave: {
        id: string;
        name: string;
        team?: string;
        isFormerPlayer?: boolean;
      }[] = [];

      const processPlayerField = (fieldKey: string) => {
        const rawName = formValues[fieldKey];
        if (!rawName || !rawName.trim()) return;
        const trimmedName = rawName.trim();

        const explicit = explicitSelectedPlayers[fieldKey];
        if (
          explicit &&
          explicit.name.trim().toLowerCase() === trimmedName.toLowerCase()
        ) {
          fieldPlayerInfoMap[fieldKey] = {
            id: explicit.id,
            isFormerPlayer: explicit.isFormerPlayer,
          };
          newPlayersToSave.push({
            id: explicit.id,
            name: trimmedName,
            team: opponentTeam,
            isFormerPlayer: explicit.isFormerPlayer,
          });
        } else {
          const newId = uuidv4();
          fieldPlayerInfoMap[fieldKey] = {
            id: newId,
            isFormerPlayer: false,
          };
          newPlayersToSave.push({
            id: newId,
            name: trimmedName,
            team: opponentTeam,
            isFormerPlayer: false,
          });
        }
      };

      for (let i = 0; i < opponentScore; i++) {
        processPlayerField(`opponentGoalPlayer_${i}`);
        processPlayerField(`opponentAssistPlayer_${i}`);
      }
      for (let i = 0; i < opponentCardCount; i++) {
        processPlayerField(`opponentCardPlayer_${i}`);
      }
      for (let i = 0; i < opponentOwnGoalCount; i++) {
        processPlayerField(`opponentOwnGoalPlayer_${i}`);
      }
      if (formValues.opponentMvpName?.trim()) {
        processPlayerField("opponentMvpName");
      }

      let allKnownPlayers = combinedOpponentPlayers;
      if (newPlayersToSave.length > 0) {
        try {
          const savedList = await ServiceOpponentPlayers.saveOpponentPlayers(
            career.id,
            newPlayersToSave,
            career.groupId,
            { skipCareerWrite: !career.groupId },
          );
          if (savedList && savedList.length > 0) {
            allKnownPlayers = savedList;
            setOpponentPlayers(savedList);
          }
        } catch (err) {
          console.warn("Aviso ao persistir jogadores adversários:", err);
        }
      }

      const { updatedMatch } = buildMatchPayload(
        match,
        formValues,
        booleanValues,
        isUserHome,
        undefined,
        fieldPlayerInfoMap,
      );
      await ServiceMatches.updateMatchDetailsInSeason(
        career,
        season,
        match,
        updatedMatch as Match,
        !booleanValues.hasPenalties,
        allKnownPlayers,
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
          toast.warning(
            "Detalhes salvos, mas houve falha ao registrar o título da temporada.",
          );
        }
      }
      toast.success("Detalhes da partida salvos com sucesso!");
      onSaved?.(updatedMatch as Match);
      onClose();
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
    combinedOpponentPlayers,
    explicitSelectedPlayers,
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
        combinedOpponentPlayers,
        opponentTeam,
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
      combinedOpponentPlayers,
      opponentTeam,
    ],
  );

  return {
    isSaving,
    fields,
    formValues,
    handleInputChange: handleLocalInputChange,
    handleBooleanChange: handleLocalBooleanChange,
    handleSelectOption,
    saveDetails,
  };
};
