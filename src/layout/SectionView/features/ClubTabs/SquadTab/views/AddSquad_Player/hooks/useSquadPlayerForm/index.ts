import { useCallback, useEffect } from "react";
import { mapPlayerToFormValues } from "../../../../../../../../../common/helpers/Mappers";
import { useForm } from "../../../../../../../../../common/hooks/UseForm";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { Field } from "../../../../../../../../../components/FormSection";
import { formatDateInput } from "../../../../../../../../../common/utils/Date";
import { calculatePlayerAge } from "../../../../../../../../../common/utils/calculatePlayerAge";
import { calculateContractYears } from "../../../../../../../../../common/utils/calculateContractYears";
import {
  positionOptionsBySector,
  normalizeSector,
} from "../../constants/SquadFormFields";
import { usePastPlayersAutofill } from "../../../shared/usePastPlayersAutofill";

export const useSquadPlayerForm = (
  player: Players | undefined,
  career: Career,
  season: ClubData,
) => {
  const form = useForm();
  const {
    formValues,
    setFormValues,
    handleBooleanChange,
    booleanValues,
    handleInputChange,
  } = form;
  const isEditing = !!player;

  const {
    pastPlayers,
    pastPlayerOptions,
    filteredPastPlayerOptions,
    clearPastPlayerSelection,
  } = usePastPlayersAutofill({
    career,
    season,
    selectedPastPlayer: formValues.selectedPastPlayer,
    setFormValues,
    isEditing,
    currentPlayer: player,
  });

  useEffect(() => {
    if (player) {
      const seasonYear =
        new Date(career.createdAt).getFullYear() + (season.seasonNumber - 1);
      const initialFormValues = mapPlayerToFormValues(
        player,
        career?.currency,
        seasonYear,
        career,
        season,
      );

      const latestContract = player.contract?.[player.contract.length - 1];
      const isIncomingLoanValue = Boolean(
        latestContract?.isLoan && !latestContract?.leftClub,
      );
      const isSigningValue = Boolean(player.buy);

      handleBooleanChange("isSigning", isSigningValue);
      handleBooleanChange("isCaptain", Boolean(player.captain));
      handleBooleanChange("isLoan", isIncomingLoanValue);

      const hasPlayedWithUs = Boolean(player.playedWithUs);
      handleBooleanChange("isKnownPlayer", hasPlayedWithUs);

      let pastPlayerName = "";
      if (hasPlayedWithUs) {
        const matched = pastPlayers.find(
          (p) =>
            p.id === player.playedWithUs ||
            p.playedWithUs === player.playedWithUs,
        );
        if (matched) {
          pastPlayerName = matched.name;
        }
      }

      setFormValues({
        ...initialFormValues,
        selectedPastPlayer: pastPlayerName,
        playedWithUs: player.playedWithUs || "",
        globalId: player.playedWithUs || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  const handleInputChangeWrapper = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      field: Field,
    ) => {
      if (field.id === "height" || field.id === "weight") {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 3);
      }
      if (field.id === "birthDate") {
        e.target.value = formatDateInput(e.target.value);
        const calculatedAge = calculatePlayerAge(
          e.target.value,
          career.createdAt,
          season.seasonNumber,
          career.nation,
          season.matches,
        );
        if (calculatedAge > 0) {
          setFormValues((prev) => ({
            ...prev,
            age: String(calculatedAge),
          }));
        }
      }
      if (field.id === "contractUntil") {
        e.target.value = formatDateInput(e.target.value);
        const calculatedYears = calculateContractYears(
          e.target.value,
          career.createdAt,
          season.seasonNumber,
          career.nation,
        );
        setFormValues((prev) => ({
          ...prev,
          contractTime: calculatedYears > 0 ? String(calculatedYears) : "",
        }));
      }
      if (field.id === "sector") {
        const newSector = e.target.value;
        const norm = normalizeSector(
          newSector,
        ) as keyof typeof positionOptionsBySector;
        const availablePositions: readonly string[] =
          norm && positionOptionsBySector[norm]
            ? positionOptionsBySector[norm]
            : [];
        setFormValues((prev) => ({
          ...prev,
          sector: newSector,
          position:
            availablePositions.length > 0
              ? availablePositions.includes(prev.position || "")
                ? prev.position
                : availablePositions[0]
              : "",
        }));
        return;
      }
      handleInputChange(e, field);
    },
    [
      handleInputChange,
      career.createdAt,
      career.nation,
      season.seasonNumber,
      season.matches,
      setFormValues,
    ],
  );

  const handleBooleanChangeWrapper = (id: string, value: boolean) => {
    handleBooleanChange(id, value);
    if (id === "isSigning" && value) {
      handleBooleanChange("isLoan", false);
    } else if (id === "isLoan" && value) {
      handleBooleanChange("isSigning", false);
    } else if (id === "isKnownPlayer") {
      if (!value) {
        clearPastPlayerSelection();
      } else if (player?.playedWithUs) {
        setFormValues((prev) => ({
          ...prev,
          playedWithUs: player.playedWithUs || "",
          globalId: player.playedWithUs || "",
        }));
      }
    }
  };

  const hasInitialPlayedWithUs = Boolean(player?.playedWithUs);

  return {
    ...form,
    handleInputChange: handleInputChangeWrapper,
    handleBooleanChange: handleBooleanChangeWrapper,
    pastPlayerOptions,
    filteredPastPlayerOptions,
    isEditing,
    isLoaned: !!player?.loan,
    isIncomingLoanPlayer: !!player?.incomingLoan,
    isKnownPlayer: booleanValues.isKnownPlayer,
    isSigning: booleanValues.isSigning,
    isIncomingLoan: booleanValues.isLoan,
    hasInitialPlayedWithUs,
  };
};
