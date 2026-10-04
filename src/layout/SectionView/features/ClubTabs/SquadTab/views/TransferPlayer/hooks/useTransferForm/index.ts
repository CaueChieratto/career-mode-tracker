import { useState, useEffect, useMemo } from "react";
import { useForm } from "../../../../../../../../../common/hooks/UseForm";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { formatDateInputShort } from "../../../../../../../../../common/utils/Date";
import { formatDisplayValue } from "../../../../../../../../../common/utils/FormatValue";
import { Field } from "../../../../../../../../../components/FormSection";
import { BooleanValues, FormValues } from "../../types";
import { validateTransfer } from "../../validators/transferValidator";
import { validateLoan } from "../../validators/loanValidator";
import { Teams } from "../../../../../../../../../common/interfaces/Teams";
import { ServiceMatches } from "../../../../../AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { useEditSquadPlayer } from "../useEditSquadPlayer";

type UseTransferFormProps = {
  careerId: string;
  season: ClubData;
  career: Career;
  player: Players;
  currentPlayers: Players[];
  handleGoBack: () => void;
  initialMode?: "transfer" | "loan";
};

export const useTransferForm = ({
  careerId,
  season,
  career,
  player,
  currentPlayers,
  handleGoBack,
  initialMode,
}: UseTransferFormProps) => {
  const startingTab = initialMode === "loan" ? 2 : 1;
  const [activeTab] = useState<number>(startingTab);
  const [isLoading, setIsLoading] = useState(false);
  const [globalTeams, setGlobalTeams] = useState<string[]>(() => {
    if (!career?.clubData) return [];
    const teams = new Set<string>();
    career.clubData.forEach((s) => {
      s.teams?.forEach((t) => {
        if (t.name) teams.add(t.name);
      });
    });
    return Array.from(teams).sort();
  });

  useEffect(() => {
    const fetchAllUserTeams = async () => {
      try {
        const allTeams = await ServiceMatches.getAllTeamsAcrossUserCareers();
        if (allTeams.length > 0) {
          setGlobalTeams(allTeams);
        }
      } catch (error) {
        console.error("Erro ao buscar times globais: ", error);
      }
    };
    fetchAllUserTeams();
  }, []);

  const { formValues, setFormValues, handleInputChange } = useForm();
  const [booleanValues, setBooleanValues] = useState<BooleanValues>({
    isRetirement: false,
    isEndContract: false,
    isReturnLoan: false,
  });

  const { sellPlayer, loanPlayer, returnLoanPlayer } = useEditSquadPlayer({
    careerId,
    seasonId: season.id,
    playerId: player.id,
    currentPlayers,
    onPlayerEdited: () => {},
    career,
    season,
  });

  const filteredTeamOptions = useMemo(() => {
    const searchValue = (formValues.toClub || "")
      .toLowerCase()
      .replace(/\s/g, "");

    if (searchValue) {
      return globalTeams.filter((teamName) =>
        teamName.toLowerCase().replace(/\s/g, "").includes(searchValue),
      );
    }

    return globalTeams;
  }, [globalTeams, formValues.toClub]);

  useEffect(() => {
    if (player?.loan) {
      const lastContract = player.contract?.[player.contract.length - 1];
      if (lastContract) {
        setFormValues((prev) => ({
          ...prev,
          toClub: lastContract.leftClub || "",
          buyOption: lastContract.buyOptionValue
            ? formatDisplayValue(lastContract.buyOptionValue as number)
            : "",
          loanDuration: lastContract.loanDuration
            ? String(lastContract.loanDuration)
            : "",
          wagePercentage: lastContract.wagePercentage
            ? String(lastContract.wagePercentage)
            : "",
        }));
      }
    }
  }, [player, setFormValues]);

  const handleBooleanChangeWrapper = (id: string, value: boolean) => {
    setBooleanValues((prev) => {
      const newVals = { ...prev, [id]: value };
      if (id === "isRetirement" && value) newVals.isEndContract = false;
      if (id === "isEndContract" && value) newVals.isRetirement = false;
      return newVals;
    });
  };

  const handleCustomInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: Field,
  ) => {
    if (field.id === "dateExit") {
      e.target.value = formatDateInputShort(e.target.value);
    }
    handleInputChange(e, field);
  };

  const saveDestinationTeamIfNew = async (toClubName: string) => {
    if (
      !toClubName ||
      toClubName === "Aposentadoria" ||
      toClubName === "Fim de Contrato"
    )
      return;

    const teamNameCleaned = toClubName.trim();
    const teamAlreadyExists = season.teams?.some(
      (t) => t.name.toLowerCase() === teamNameCleaned.toLowerCase(),
    );

    if (!teamAlreadyExists) {
      const newTeam: Teams = {
        name: teamNameCleaned,
        showMatch: false,
      };
      await ServiceMatches.addTeamToSeason(careerId, season.id, newTeam);
    }
  };

  const processTransfer = async () => {
    const { isValid, error, data } = validateTransfer(
      formValues as FormValues,
      booleanValues,
    );
    if (!isValid || !data) {
      alert(error);
      return;
    }

    player.sell = true;

    await saveDestinationTeamIfNew(data.toClub);
    await sellPlayer(data.sellValue, data.toClub, data.dateExit);
  };

  const processLoan = async () => {
    const { isValid, error, data } = validateLoan(
      formValues as FormValues,
      booleanValues,
    );
    if (!isValid || !data) {
      alert(error);
      return;
    }

    if (data.isReturning) {
      player.loan = false;
      player.incomingLoan = false;
      await returnLoanPlayer(data.dateLoan);
    } else {
      player.loan = true;

      await saveDestinationTeamIfNew(data.toClub!);

      await loanPlayer(
        data.buyOption || "",
        data.toClub!,
        data.dateLoan,
        data.loanDuration!,
        data.wagePercentage!,
      );
    }
  };

  const handleSave = async () => {
    if (player.incomingLoan) {
      alert(
        "Jogadores emprestados ao clube não podem ser vendidos ou emprestados.",
      );
      return;
    }
    setIsLoading(true);
    try {
      if (activeTab === 1) {
        await processTransfer();
      } else {
        await processLoan();
      }
      handleGoBack();
    } catch (error) {
      alert("Ocorreu um erro ao processar a negociação.");
      console.error("Erro: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navText =
    activeTab === 1
      ? "Confirmar Venda"
      : booleanValues.isReturnLoan
        ? "Retornar Jogador"
        : player.loan
          ? "Salvar Edição"
          : "Confirmar Empréstimo";

  return {
    activeTab,
    isLoading,
    formValues,
    booleanValues,
    navText,
    handleSave,
    handleCustomInputChange,
    handleBooleanChangeWrapper,
    filteredTeamOptions,
  };
};
