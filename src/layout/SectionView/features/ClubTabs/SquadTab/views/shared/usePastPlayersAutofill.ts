import { useCallback, useEffect, useMemo } from "react";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { calculatePlayerAge } from "../../../../../../../common/utils/calculatePlayerAge";
import { usePastPlayers } from "../AddSquad_Player/hooks/usePastPlayers";

export interface UsePastPlayersAutofillParams {
  career: Career;
  season: ClubData;
  selectedPastPlayer?: string;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isEditing?: boolean;
  currentPlayer?: Players;
  extraOptionName?: string;
  fallbackPotentialToOverall?: boolean;
}

export const usePastPlayersAutofill = ({
  career,
  season,
  selectedPastPlayer = "",
  setFormValues,
  isEditing = false,
  currentPlayer,
  extraOptionName,
  fallbackPotentialToOverall = false,
}: UsePastPlayersAutofillParams) => {
  const { pastPlayers, pastPlayerOptions } = usePastPlayers(
    career,
    season,
    isEditing,
    currentPlayer,
  );

  const basePastPlayerOptions = useMemo(() => {
    if (extraOptionName && !pastPlayerOptions.includes(extraOptionName)) {
      return [extraOptionName, ...pastPlayerOptions];
    }
    return pastPlayerOptions;
  }, [pastPlayerOptions, extraOptionName]);

  const filteredPastPlayerOptions = useMemo(() => {
    const search = selectedPastPlayer.toLowerCase().replace(/\s/g, "");
    if (!search) {
      return basePastPlayerOptions;
    }
    return basePastPlayerOptions.filter((playerName) =>
      playerName.toLowerCase().replace(/\s/g, "").includes(search),
    );
  }, [basePastPlayerOptions, selectedPastPlayer]);

  useEffect(() => {
    if (!selectedPastPlayer) return;

    const selected = pastPlayers.find((p) => p.name === selectedPastPlayer);
    if (!selected) return;

    if (isEditing) {
      setFormValues((prev) => ({
        ...prev,
        globalId: selected.id,
        playedWithUs: selected.playedWithUs || selected.id,
      }));
      return;
    }

    const selectedBirthDate = selected.birthDate || "";
    const calculatedAge = selectedBirthDate
      ? calculatePlayerAge(
          selectedBirthDate,
          career.createdAt,
          season.seasonNumber,
          career.nation,
          season.matches,
        )
      : selected.age;

    const isSameCareerAcademy =
      Boolean(selected.isAcademy) &&
      (selected.originCareerId === career.id || !selected.originCareerId);

    setFormValues((prev) => ({
      ...prev,
      playerName: selected.name,
      globalId: selected.id,
      playedWithUs: selected.playedWithUs || selected.id,
      overall: String(selected.overall),
      potential: selected.potential
        ? String(selected.potential)
        : fallbackPotentialToOverall
          ? String(selected.overall)
          : "",
      sector: selected.sector,
      position: selected.position as string,
      age: String(calculatedAge || selected.age),
      birthDate: selectedBirthDate,
      height: selected.height || "",
      weight: selected.weight || "",
      nation: selected.nation,
      shirtNumber: selected.shirtNumber || "",
      isAcademy: isSameCareerAcademy ? "true" : "",
      academyNickname: isSameCareerAcademy
        ? selected.academyNickname || ""
        : "",
      academyData:
        isSameCareerAcademy && selected.academyData
          ? JSON.stringify(selected.academyData)
          : "",
      academyHistory:
        isSameCareerAcademy && selected.academyHistory
          ? JSON.stringify(selected.academyHistory)
          : "",
      academyTournaments:
        isSameCareerAcademy && selected.academyTournaments
          ? JSON.stringify(selected.academyTournaments)
          : "",
    }));
  }, [
    selectedPastPlayer,
    pastPlayers,
    isEditing,
    setFormValues,
    career.id,
    career.createdAt,
    career.nation,
    season.seasonNumber,
    season.matches,
    fallbackPotentialToOverall,
  ]);

  useEffect(() => {
    if (
      currentPlayer?.playedWithUs &&
      !selectedPastPlayer &&
      pastPlayers.length > 0
    ) {
      const matched = pastPlayers.find(
        (p) =>
          p.id === currentPlayer.playedWithUs ||
          p.playedWithUs === currentPlayer.playedWithUs,
      );
      if (matched) {
        setFormValues((prev) => ({
          ...prev,
          selectedPastPlayer: matched.name,
        }));
      }
    }
  }, [currentPlayer?.playedWithUs, pastPlayers, selectedPastPlayer, setFormValues]);

  const clearPastPlayerSelection = useCallback(() => {
    setFormValues((prev) => ({
      ...prev,
      selectedPastPlayer: "",
      playedWithUs: "",
      globalId: "",
    }));
  }, [setFormValues]);

  return {
    pastPlayers,
    pastPlayerOptions: basePastPlayerOptions,
    filteredPastPlayerOptions,
    clearPastPlayerSelection,
  };
};

export default usePastPlayersAutofill;
