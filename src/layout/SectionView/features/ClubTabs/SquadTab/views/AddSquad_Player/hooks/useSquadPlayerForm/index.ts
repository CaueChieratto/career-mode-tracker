import { useCallback, useEffect } from "react";
import { usePastPlayers } from "../usePastPlayers";
import { mapPlayerToFormValues } from "../../../../../../../../../common/helpers/Mappers";
import { useForm } from "../../../../../../../../../common/hooks/UseForm";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { Field } from "../../../../../../../../../components/FormSection";
import { formatDateInputShort } from "../../../../../../../../../common/utils/Date";

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

  const { pastPlayers, pastPlayerOptions } = usePastPlayers(
    career,
    season,
    isEditing,
    player,
  );

  useEffect(() => {
    if (formValues.selectedPastPlayer) {
      const selected = pastPlayers.find(
        (p) => p.name === formValues.selectedPastPlayer,
      );

      if (selected) {
        if (isEditing) {
          setFormValues((prev) => ({
            ...prev,
            globalId: selected.id,
            playedWithUs: selected.playedWithUs || selected.id,
          }));
        } else {
          setFormValues((prev) => ({
            ...prev,
            playerName: selected.name,
            globalId: selected.id,
            playedWithUs: selected.playedWithUs || selected.id,
            overall: String(selected.overall),
            sector: selected.sector,
            position: selected.position as string,
            age: String(selected.age),
            nation: selected.nation,
            shirtNumber: selected.shirtNumber || "",
            isAcademy: selected.isAcademy ? "true" : "",
            academyNickname: selected.academyNickname || "",
            academyData: selected.academyData
              ? JSON.stringify(selected.academyData)
              : "",
            academyHistory: selected.academyHistory
              ? JSON.stringify(selected.academyHistory)
              : "",
            academyTournaments: selected.academyTournaments
              ? JSON.stringify(selected.academyTournaments)
              : "",
          }));
        }
      }
    }
  }, [formValues.selectedPastPlayer, pastPlayers, isEditing, setFormValues]);

  useEffect(() => {
    if (player) {
      const initialFormValues = mapPlayerToFormValues(player, career?.currency);

      const latestContract = player.contract?.[player.contract.length - 1];
      const isIncomingLoanValue = Boolean(
        latestContract?.isLoan && !latestContract?.leftClub,
      );
      const isSigningValue = Boolean(player.buy);

      handleBooleanChange("isSigning", isSigningValue);
      handleBooleanChange("isCaptain", Boolean(player.captain));
      handleBooleanChange("isLoan", isIncomingLoanValue);
      handleBooleanChange("isReturnIncomingLoan", false);

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

  useEffect(() => {
    if (
      player?.playedWithUs &&
      !formValues.selectedPastPlayer &&
      pastPlayers.length > 0
    ) {
      const matched = pastPlayers.find(
        (p) =>
          p.id === player.playedWithUs ||
          p.playedWithUs === player.playedWithUs,
      );
      if (matched) {
        setFormValues((prev) => ({
          ...prev,
          selectedPastPlayer: matched.name,
        }));
      }
    }
  }, [player?.playedWithUs, pastPlayers, formValues.selectedPastPlayer, setFormValues]);

  const handleInputChangeWrapper = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      field: Field,
    ) => {
      if (field.id === "returnDate") {
        e.target.value = formatDateInputShort(e.target.value);
      }
      handleInputChange(e, field);
    },
    [handleInputChange],
  );

  const handleBooleanChangeWrapper = (id: string, value: boolean) => {
    handleBooleanChange(id, value);
    if (id === "isSigning" && value) {
      handleBooleanChange("isLoan", false);
    } else if (id === "isLoan" && value) {
      handleBooleanChange("isSigning", false);
    } else if (id === "isKnownPlayer" && !value) {
      setFormValues((prev) => ({
        ...prev,
        selectedPastPlayer: "",
        playedWithUs: "",
        globalId: "",
      }));
    }
  };

  const isReturningIncomingLoan =
    !!player?.incomingLoan && !!booleanValues.isReturnIncomingLoan;

  return {
    ...form,
    handleInputChange: handleInputChangeWrapper,
    handleBooleanChange: handleBooleanChangeWrapper,
    pastPlayerOptions,
    isEditing,
    isLoaned: !!player?.loan,
    isIncomingLoanPlayer: !!player?.incomingLoan,
    isReturningIncomingLoan,
    isKnownPlayer: booleanValues.isKnownPlayer,
    isSigning: booleanValues.isSigning,
    isIncomingLoan: booleanValues.isLoan,
  };
};
