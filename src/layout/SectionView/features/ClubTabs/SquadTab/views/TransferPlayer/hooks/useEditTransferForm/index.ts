import { useEffect, useMemo, useState } from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { ServicePlayers } from "../../../../../../../../../common/services/ServicePlayers";
import {
  brasilDatePlaceholderShort,
  formatDateInputShort,
  parseBrasilDate,
} from "../../../../../../../../../common/utils/Date";
import {
  formatDisplayValue,
  parseValue,
} from "../../../../../../../../../common/utils/FormatValue";
import { ServiceMatches } from "../../../../../AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { getSeasonDateRange } from "../../../../../../../../../common/utils/GetSeasonDateRange";
import { notifyCareersUpdated } from "../../../../../../../../../common/hooks/Career/UseCareer";
import { updateCachedCareer } from "../../../../../../../../../common/helpers/Getters";

import { checkIsSpecialTransfer } from "../../constants/buildEditTransferFormSections";
import { Contract } from "../../../../../../../../../common/interfaces/playersInfo/contract";

export type UseEditTransferFormProps = {
  career: Career;
  season: ClubData;
  player: Players;
  contract: NonNullable<Players["contract"]>[number];
  contractIndex: number;
  direction: "arrivals" | "exit";
  onClose: () => void;
};

export const applyRevertToCareer = (
  career: Career,
  seasonId: string,
  playerId: string,
  contractIndex: number,
  direction: "arrivals" | "exit",
): Career => {
  const newClubData = (career.clubData || []).map((s) => {
    if (s.id !== seasonId) return s;

    let newPlayers = [...(s.players || [])];
    const targetPlayer = newPlayers.find((p) => p.id === playerId);
    if (!targetPlayer) return s;

    const contracts = targetPlayer.contract ? [...targetPlayer.contract] : [];
    let idx = contractIndex;
    if (idx < 0 || idx >= contracts.length) {
      idx = contracts.findIndex((c) =>
        direction === "exit"
          ? Boolean(c.dataExit || c.leftClub)
          : Boolean(c.dataArrival || c.fromClub),
      );
      if (idx < 0) idx = Math.max(0, contracts.length - 1);
    }

    if (direction === "exit") {
      const currentContract = contracts[idx];
      const finalContracts = [...contracts];

      if (currentContract?.dataArrival || currentContract?.fromClub) {
        finalContracts[idx] = {
          ...currentContract,
          leftClub: "",
          dataExit: null,
          sellValue: 0,
          isLoan: false,
          loanDuration: undefined,
          wagePercentage: undefined,
          buyOptionValue: undefined,
        };
      } else {
        if (contracts.length > 1) {
          finalContracts.splice(idx, 1);
        } else if (currentContract) {
          finalContracts[idx] = {
            ...currentContract,
            leftClub: "",
            dataExit: null,
            sellValue: 0,
            isLoan: false,
            loanDuration: undefined,
            wagePercentage: undefined,
            buyOptionValue: undefined,
          };
        }
      }

      const updatedPlayer: Players = {
        ...targetPlayer,
        sell: false,
        loan: false,
        contract: finalContracts,
      };

      newPlayers = newPlayers.map((p) =>
        p.id === playerId ? updatedPlayer : p,
      );
    } else {
      // Arrivals
      if (contracts.length <= 1) {
        newPlayers = newPlayers.filter((p) => p.id !== playerId);
      } else {
        const finalContracts = [...contracts];
        finalContracts.splice(idx, 1);
        const prev = finalContracts[finalContracts.length - 1];
        const isPrevLoanExit = Boolean(prev?.isLoan && prev?.leftClub);

        const updatedPlayer: Players = {
          ...targetPlayer,
          contract: finalContracts,
          ...(isPrevLoanExit
            ? { loan: true, sell: false, buy: false, incomingLoan: false }
            : {}),
        };

        newPlayers = newPlayers.map((p) =>
          p.id === playerId ? updatedPlayer : p,
        );
      }
    }

    return {
      ...s,
      players: newPlayers,
    };
  });

  return {
    ...career,
    updatedAt: Date.now(),
    clubData: newClubData,
  };
};

export const applyEditToCareer = (
  career: Career,
  seasonId: string,
  playerId: string,
  contractIndex: number,
  direction: "arrivals" | "exit",
  updatedFields: {
    clubName: string;
    transferValue: number;
    transferType: string;
    date: Date;
    loanDuration?: number;
    wagePercentage?: number;
  },
): Career => {
  const newClubData = (career.clubData || []).map((s) => {
    if (s.id !== seasonId) return s;

    let newPlayers = [...(s.players || [])];
    const targetPlayer = newPlayers.find((p) => p.id === playerId);
    if (!targetPlayer) return s;

    const contracts = targetPlayer.contract ? [...targetPlayer.contract] : [];
    let idx = contractIndex;
    if (idx < 0 || idx >= contracts.length) {
      idx = contracts.findIndex((c) =>
        direction === "exit"
          ? Boolean(c.dataExit || c.leftClub)
          : Boolean(c.dataArrival || c.fromClub),
      );
      if (idx < 0) idx = Math.max(0, contracts.length - 1);
    }

    const currentContract = { ...(contracts[idx] || {}) };
    const finalPlayer: Players = { ...targetPlayer };

    if (direction === "exit") {
      currentContract.dataExit = updatedFields.date;
      if (updatedFields.clubName)
        currentContract.leftClub = updatedFields.clubName;
      if (updatedFields.transferType === "Venda") {
        currentContract.sellValue = updatedFields.transferValue;
        currentContract.isLoan = false;
        delete currentContract.loanDuration;
        delete currentContract.wagePercentage;
        finalPlayer.sell = true;
        finalPlayer.loan = false;
      } else if (updatedFields.transferType === "Emprestar") {
        currentContract.sellValue = 0;
        currentContract.isLoan = true;
        currentContract.loanDuration = updatedFields.loanDuration || 0;
        currentContract.wagePercentage = updatedFields.wagePercentage || 0;
        finalPlayer.sell = false;
        finalPlayer.loan = true;
      }
    } else {
      currentContract.dataArrival = updatedFields.date;
      if (updatedFields.clubName)
        currentContract.fromClub = updatedFields.clubName;
      if (updatedFields.transferType === "Compra") {
        currentContract.buyValue = updatedFields.transferValue;
        currentContract.isLoan = false;
        delete currentContract.loanDuration;
        delete currentContract.wagePercentage;
        finalPlayer.buy = true;
        finalPlayer.incomingLoan = false;
      } else if (updatedFields.transferType === "Empréstimo") {
        currentContract.buyValue = 0;
        currentContract.isLoan = true;
        currentContract.loanDuration = updatedFields.loanDuration || 0;
        currentContract.wagePercentage = updatedFields.wagePercentage ?? 100;
        finalPlayer.buy = false;
        finalPlayer.incomingLoan = true;
      }
    }

    contracts[idx] = currentContract as Contract;
    finalPlayer.contract = contracts;

    newPlayers = newPlayers.map((p) => (p.id === playerId ? finalPlayer : p));

    return {
      ...s,
      players: newPlayers,
    };
  });

  return {
    ...career,
    updatedAt: Date.now(),
    clubData: newClubData,
  };
};

export const useEditTransferForm = ({
  career,
  season,
  player,
  contract,
  contractIndex,
  direction,
  onClose,
}: UseEditTransferFormProps) => {
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

  const initialValues = useMemo<Record<string, string>>(() => {
    const isArrival = direction === "arrivals";

    if (isArrival) {
      const isLoanArrival = Boolean(contract.isLoan || player.incomingLoan);
      const res: Record<string, string> = {
        transferType: isLoanArrival ? "Empréstimo" : "Compra",
        fromClub: contract.fromClub || "",
        buyValue:
          contract.buyValue && !isLoanArrival
            ? formatDisplayValue(contract.buyValue as number, career.currency)
            : "",
        loanDuration: contract.loanDuration
          ? String(contract.loanDuration)
          : "",
        wagePercentage: contract.wagePercentage
          ? String(contract.wagePercentage)
          : "",
        dateArrival: contract.dataArrival
          ? brasilDatePlaceholderShort(new Date(contract.dataArrival))
          : "",
      };
      return res;
    } else {
      const isLoanExit = Boolean(contract.isLoan || player.loan);
      const res: Record<string, string> = {
        transferType: isLoanExit ? "Emprestar" : "Venda",
        toClub: contract.leftClub || "",
        sellValue:
          contract.sellValue && !isLoanExit
            ? formatDisplayValue(contract.sellValue as number, career.currency)
            : "",
        loanDuration: contract.loanDuration
          ? String(contract.loanDuration)
          : "",
        wagePercentage: contract.wagePercentage
          ? String(contract.wagePercentage)
          : "",
        dateExit: contract.dataExit
          ? brasilDatePlaceholderShort(new Date(contract.dataExit))
          : "",
      };
      return res;
    }
  }, [career.currency, contract, direction, player.incomingLoan, player.loan]);

  const [formValues, setFormValues] =
    useState<Record<string, string>>(initialValues);

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
  ) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === "dateExit" || name === "dateArrival") {
      value = formatDateInputShort(value);
    }
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const currentClubName =
    direction === "arrivals" ? formValues.fromClub : formValues.toClub;

  const filteredTeamOptions = useMemo(() => {
    const searchValue = (currentClubName || "")
      .toLowerCase()
      .replace(/\s/g, "");
    if (searchValue) {
      return globalTeams.filter((teamName) =>
        teamName.toLowerCase().replace(/\s/g, "").includes(searchValue),
      );
    }
    return globalTeams;
  }, [globalTeams, currentClubName]);

  const handleSave = async () => {
    const isArrival = direction === "arrivals";
    const isSpecial = checkIsSpecialTransfer(contract, direction);
    const date = isArrival ? formValues.dateArrival : formValues.dateExit;

    if (!date || date.length < 5) {
      alert("Por favor, preencha a data corretamente (DD/MM).");
      return;
    }

    const { startDate, endDate } = getSeasonDateRange(
      season.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const [, month] = date.split("/").map(Number);
    const m = (month || 1) - 1;
    const year =
      m < startDate.getMonth()
        ? endDate.getFullYear()
        : startDate.getFullYear();
    const parsedDate = parseBrasilDate(date, year) || new Date();

    if (isSpecial) {
      setIsLoading(true);
      try {
        await ServicePlayers.editTransferInSeason({
          careerId: career.id,
          seasonId: season.id,
          playerId: player.id,
          contractIndex,
          direction,
          transferType: formValues.transferType,
          clubName: isArrival ? contract.fromClub : contract.leftClub,
          transferValue: "0",
          date,
        });

        const updatedCareer = applyEditToCareer(
          career,
          season.id,
          player.id,
          contractIndex,
          direction,
          {
            clubName: (isArrival ? contract.fromClub : contract.leftClub) || "",
            transferValue: 0,
            transferType: formValues.transferType,
            date: parsedDate,
          },
        );

        const updatedSeason = updatedCareer.clubData.find(
          (s) => s.id === season.id,
        );
        if (updatedSeason) {
          season.players = updatedSeason.players;
        }
        career.clubData = updatedCareer.clubData;
        career.updatedAt = updatedCareer.updatedAt;

        const updatedPlayer = updatedSeason?.players.find(
          (p) => p.id === player.id,
        );
        if (updatedPlayer) {
          Object.assign(player, updatedPlayer);
        }

        updateCachedCareer(updatedCareer);
        notifyCareersUpdated((prev) =>
          prev.map((c) => (c.id === career.id ? updatedCareer : c)),
        );

        onClose();
      } catch (error: unknown) {
        alert(
          error instanceof Error
            ? error.message
            : "Erro ao salvar a transferência.",
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const transferType = formValues.transferType;
    const isLoan =
      transferType === "Emprestar" || transferType === "Empréstimo";

    const clubName = isArrival ? formValues.fromClub : formValues.toClub;
    const transferValue = isArrival
      ? formValues.buyValue
      : formValues.sellValue;

    if (!clubName || !clubName.trim()) {
      alert("Por favor, informe o clube.");
      return;
    }

    if (!isLoan) {
      if (!transferValue || !transferValue.trim()) {
        alert("Por favor, informe o valor da transferência.");
        return;
      }
    } else {
      if (!formValues.loanDuration || Number(formValues.loanDuration) <= 0) {
        alert("Por favor, informe a duração do empréstimo.");
        return;
      }
      const wage = Number(formValues.wagePercentage);
      if (
        formValues.wagePercentage === undefined ||
        formValues.wagePercentage === "" ||
        isNaN(wage) ||
        wage < 0 ||
        wage > 100
      ) {
        alert("Por favor, informe a porcentagem de salário paga (0 a 100).");
        return;
      }
    }

    setIsLoading(true);
    try {
      await ServicePlayers.editTransferInSeason({
        careerId: career.id,
        seasonId: season.id,
        playerId: player.id,
        contractIndex,
        direction,
        transferType,
        clubName: clubName.trim(),
        transferValue: transferValue || "0",
        date,
        loanDuration: formValues.loanDuration,
        wagePercentage: formValues.wagePercentage,
      });

      const updatedCareer = applyEditToCareer(
        career,
        season.id,
        player.id,
        contractIndex,
        direction,
        {
          clubName: clubName.trim(),
          transferValue: parseValue(transferValue || "0"),
          transferType,
          date: parsedDate,
          loanDuration: formValues.loanDuration
            ? Number(formValues.loanDuration)
            : undefined,
          wagePercentage: formValues.wagePercentage
            ? Number(formValues.wagePercentage)
            : undefined,
        },
      );

      const updatedSeason = updatedCareer.clubData.find(
        (s) => s.id === season.id,
      );
      if (updatedSeason) {
        season.players = updatedSeason.players;
      }
      career.clubData = updatedCareer.clubData;
      career.updatedAt = updatedCareer.updatedAt;

      const updatedPlayer = updatedSeason?.players.find(
        (p) => p.id === player.id,
      );
      if (updatedPlayer) {
        Object.assign(player, updatedPlayer);
      }

      updateCachedCareer(updatedCareer);
      notifyCareersUpdated((prev) =>
        prev.map((c) => (c.id === career.id ? updatedCareer : c)),
      );

      onClose();
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao salvar a transferência.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertTransfer = async () => {
    setIsLoading(true);
    try {
      await ServicePlayers.revertTransferInSeason({
        careerId: career.id,
        seasonId: season.id,
        playerId: player.id,
        contractIndex,
        direction,
      });

      const updatedCareer = applyRevertToCareer(
        career,
        season.id,
        player.id,
        contractIndex,
        direction,
      );

      const updatedSeason = updatedCareer.clubData.find(
        (s) => s.id === season.id,
      );
      if (updatedSeason) {
        season.players = updatedSeason.players;
      }
      career.clubData = updatedCareer.clubData;
      career.updatedAt = updatedCareer.updatedAt;

      const updatedPlayer = updatedSeason?.players.find(
        (p) => p.id === player.id,
      );
      if (updatedPlayer) {
        Object.assign(player, updatedPlayer);
      }

      updateCachedCareer(updatedCareer);
      notifyCareersUpdated((prev) =>
        prev.map((c) => (c.id === career.id ? updatedCareer : c)),
      );

      onClose();
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao reverter a transferência.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    formValues,
    filteredTeamOptions,
    handleInputChange,
    handleSave,
    handleRevertTransfer,
  };
};
