import { useState, useCallback } from "react";
import { buildMatchData } from "../../helpers/buildMatchData";
import { ServiceMatches } from "../../../../../../../../../common/services/ServiceMatches";
import { validateMatchForm } from "../../validators/validateMatchForm";
import { MONTH_TO_NUM } from "../../../../constants/MONTH_OPTIONS";
import { buildTeamData } from "../../helpers/buildTeamData";
import { Teams } from "../../../../../../../../../common/interfaces/Teams";
import { auth } from "../../../../../../../../../common/services/Firebase";
import { useAddMatchesContext } from "../../contexts/context";
import { ServiceCareer } from "../../../../../../../../../common/services/ServiceCareer";
import { getSeasonName } from "../../../../../../../../../common/utils/GetSeasonName";
import { Trophy } from "../../../../../../../../../common/interfaces/club/trophy";
import { ServiceClubBadges } from "../../../../../../../../../common/services/ServiceClubBadges";
import { useToast } from "../../../../../../../../../common/hooks/UseToast";
import { NavigationSessionStore } from "../../../../../../../../../common/services/NavigationSessionStore";

export function useMatchActions() {
  const {
    career,
    season,
    matchesId,
    formValues: rawFormValues,
    booleanValues,
    onClose: onSuccess,
  } = useAddMatchesContext();
  const { confirm, error: showError, warning: showWarning, success: showSuccess } = useToast();

  const careerId = career.id;
  const seasonId = season.id;
  const formValues = rawFormValues as {
    date: string;
    league: string;
    opponentTeam: string;
    matchVenue?: string;
    neutralHost?: string;
    stadium?: string;
    stage?: string;
  };

  const [isSaving, setIsSaving] = useState(false);

  const saveMatch = useCallback(async () => {
    let finalDate = formValues.date;
    const savedMonth =
      localStorage.getItem(`matchSelectedMonth_${seasonId}`) || "Tudo";

    if (savedMonth !== "Tudo" && finalDate && finalDate.length <= 2) {
      const monthNum = MONTH_TO_NUM[savedMonth].toString().padStart(2, "0");
      finalDate = `${finalDate}/${monthNum}`;
    }

    const validation = validateMatchForm({ ...formValues, date: finalDate });
    if (!validation.valid) {
      showWarning(validation.message || "Dados da partida inválidos.");
      return;
    }

    const matchVenue =
      formValues.matchVenue ||
      (booleanValues.isHomeMatch !== undefined
        ? booleanValues.isHomeMatch
          ? "Casa"
          : "Fora"
        : "Casa");
    const isKnockout = booleanValues.isKnockout ?? false;
    const isReturnMatch = isKnockout
      ? (booleanValues.isReturnMatch ?? false)
      : false;

    const existingMatch = matchesId
      ? season.matches?.find((m) => m.matchesId === matchesId)
      : undefined;

    const matchData = buildMatchData({
      ...formValues,
      date: finalDate,
      matchVenue,
      neutralHost: formValues.neutralHost,
      stadium: formValues.stadium,
      isKnockout,
      stage: formValues.stage,
      isReturnMatch,
      career,
      season,
      matchesId,
    });

    const opponentNameLower = formValues.opponentTeam.toLowerCase();

    const existingTeam = season.teams?.find(
      (team) => team.name.toLowerCase() === opponentNameLower,
    );
    const teamAlreadyExistsInCurrentSeason = !!existingTeam;
    const hasBadge = !!existingTeam?.badge;

    let newTeamData: Teams | null = null;

    if (!teamAlreadyExistsInCurrentSeason || !hasBadge) {
      const teamFromUserHistory =
        await ServiceMatches.findTeamAcrossUserCareers(formValues.opponentTeam);

      if (teamFromUserHistory && teamFromUserHistory.badge) {
        newTeamData = {
          name: formValues.opponentTeam,
          badge: teamFromUserHistory.badge,
          colors: teamFromUserHistory.colors,
        };
      } else {
        const specialUserId = import.meta.env.VITE_SPECIAL_USER_ID;
        const isSpecialUser = Boolean(
          auth.currentUser?.uid &&
          specialUserId &&
          auth.currentUser.uid === specialUserId,
        );

        if (isSpecialUser) {
          newTeamData = await buildTeamData({
            opponentTeam: formValues.opponentTeam,
          });
        } else if (specialUserId) {
          const teamFromSpecialUser =
            await ServiceMatches.findTeamInSpecialUserCareers(
              specialUserId,
              formValues.opponentTeam,
            );

          if (teamFromSpecialUser && teamFromSpecialUser.badge) {
            newTeamData = {
              name: formValues.opponentTeam,
              badge: teamFromSpecialUser.badge,
              colors: teamFromSpecialUser.colors,
            };
          } else {
            newTeamData = {
              name: formValues.opponentTeam,
              badge: "",
            };
          }
        } else {
          newTeamData = {
            name: formValues.opponentTeam,
            badge: "",
          };
        }
      }

      if (newTeamData && !newTeamData.colors) {
        const resolvedColors = await ServiceClubBadges.resolveClubColors(
          formValues.opponentTeam,
        );
        if (resolvedColors && resolvedColors.length >= 2) {
          newTeamData.colors = resolvedColors;
        }
      }

      if (newTeamData && formValues.league) {
        newTeamData.leagueName = formValues.league;
      }
    }

    try {
      setIsSaving(true);

      if (matchesId) {
        await ServiceMatches.updateMatchInSeason(
          careerId,
          seasonId,
          matchData,
          false,
          existingMatch || undefined,
        );
      } else {
        await ServiceMatches.addMatchToSeason(careerId, seasonId, matchData);
      }

      if (newTeamData) {
        if (teamAlreadyExistsInCurrentSeason) {
          const updatedTeams =
            season.teams?.map((t) => {
              if (t.name.toLowerCase() === opponentNameLower) {
                const updated: Teams = {
                  ...t,
                  badge: newTeamData!.badge,
                };
                const colors = newTeamData!.colors || t.colors;
                if (colors) updated.colors = colors;
                const leagueName = newTeamData!.leagueName || t.leagueName;
                if (leagueName) updated.leagueName = leagueName;
                return updated;
              }
              return t;
            }) || [];
          await ServiceMatches.updateSeasonTeams(
            careerId,
            seasonId,
            updatedTeams,
          );
        } else {
          await ServiceMatches.addTeamToSeason(careerId, seasonId, newTeamData);
        }
      } else if (
        matchesId &&
        existingTeam &&
        existingTeam.leagueName !== formValues.league
      ) {
        const updatedTeams =
          season.teams?.map((t) =>
            t.name.toLowerCase() === opponentNameLower
              ? {
                  ...t,
                  ...(formValues.league ? { leagueName: formValues.league } : {}),
                }
              : t,
          ) || [];
        await ServiceMatches.updateSeasonTeams(
          careerId,
          seasonId,
          updatedTeams,
        );
      }

      if (matchVenue === "Neutro" && formValues.stadium?.trim()) {
        try {
          await ServiceMatches.saveStadium(
            careerId,
            formValues.stadium.trim(),
            career.groupId,
          );
        } catch (stadiumErr) {
          console.error("Erro ao salvar estádio:", stadiumErr);
        }
      }

      let updatedTrophies: Trophy[] | undefined;
      if (
        matchData.stage?.trim().toLowerCase() === "final" &&
        matchData.result === "V"
      ) {
        try {
          const seasonName = getSeasonName(
            season.seasonNumber,
            career.createdAt,
            career.nation,
          );
          updatedTrophies = await ServiceCareer.saveClubTrophies(
            careerId,
            [matchData.league],
            [seasonName],
          );
        } catch (trophyErr) {
          console.error("Erro ao adicionar título na final:", trophyErr);
        }
      }

      showSuccess(
        matchesId
          ? "Partida atualizada com sucesso!"
          : "Partida adicionada com sucesso!",
      );

      const targetMatchId = matchesId || matchData.matchesId;
      if (targetMatchId) {
        NavigationSessionStore.saveClickAnchor("all_matches", {
          scrollY: 0,
          anchorSelector: `#match-card-${targetMatchId}`,
          updatedAt: Date.now(),
        });
      }

      onSuccess({
        type: matchesId ? "UPDATE" : "ADD",
        match: matchData,
        team: newTeamData || undefined,
        trophies: updatedTrophies,
      });
    } catch (error) {
      console.error("Erro: ", error);
      showError("Ocorreu um erro ao salvar a partida. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }, [
    careerId,
    seasonId,
    matchesId,
    career,
    season,
    formValues,
    booleanValues,
    onSuccess,
    showWarning,
    showError,
    showSuccess,
  ]);

  const deleteMatch = useCallback(async () => {
    if (!matchesId) return;

    const confirmed = await confirm(
      "Tem certeza que deseja deletar esta partida?",
      { tone: "danger", confirmLabel: "Deletar" },
    );
    if (!confirmed) return;

    try {
      setIsSaving(true);

      const matchToDelete = season.matches?.find(
        (m) => m.matchesId === matchesId,
      );
      if (!matchToDelete) {
        throw new Error("Partida não encontrada no estado local");
      }

      await ServiceMatches.deleteMatchFromSeason(career, season, matchToDelete);

      showSuccess("Partida excluída com sucesso!");
      onSuccess({ type: "DELETE", matchId: matchesId });
    } catch {
      showError("Erro ao excluir a partida. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }, [matchesId, season, career, onSuccess, confirm, showError, showSuccess]);

  return { isSaving, saveMatch, deleteMatch };
}
