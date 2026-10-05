import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { getCareerById } from "../../helpers/Getters";
import { updateCareerFirestore } from "../../helpers/Setters";
import { getSeasonDateRange } from "../../utils/GetSeasonDateRange";
import { db } from "../Firebase";
import { requireAuth } from "./helpers/authHelpers";
import {
  buildSellContractHistory,
  buildLoanContractHistory,
  buildReturnContractHistory,
} from "./helpers/contractHelpers";

import { parseBrasilDate } from "../../utils/Date";
import { parseValue } from "../../utils/FormatValue";
import { ServiceMatches } from "../../../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { Players } from "../../interfaces/playersInfo/players";

export type EditTransferParams = {
  careerId: string;
  seasonId: string;
  playerId: string;
  contractIndex: number;
  direction: "exit" | "arrivals";
  transferType?: string;
  clubName?: string;
  transferValue?: string;
  date: string;
  loanDuration?: string;
  wagePercentage?: string;
};

export type RevertTransferParams = {
  careerId: string;
  seasonId: string;
  playerId: string;
  contractIndex: number;
  direction: "exit" | "arrivals";
};

export const PlayersContractService = {
  sellPlayerFromSeason: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    sellValue: string,
    toClub: string,
    dateExit: string,
  ): Promise<void> => {
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const updatedContracts = buildSellContractHistory(
      player,
      sellValue,
      toClub,
      dateExit,
      startDate,
      endDate,
    );

    const finalPlayer = { ...player, sell: true, contract: updatedContracts };
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, finalPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  loanPlayerFromSeason: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    buyOption: string,
    toClub: string,
    dateLoan: string,
    loanDuration: string,
    wagePercentage: string,
  ): Promise<void> => {
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const updatedContracts = buildLoanContractHistory(
      player,
      buyOption,
      toClub,
      dateLoan,
      loanDuration,
      wagePercentage,
      startDate,
      endDate,
    );

    const finalPlayer = {
      ...player,
      loan: true,
      shirtNumber: "",
      contract: updatedContracts,
    };
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, finalPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  returnPlayerFromLoan: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    returnDate: string,
  ): Promise<void> => {
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const { contractHistory } = buildReturnContractHistory(
      player,
      returnDate,
      startDate,
      endDate,
    );

    const finalPlayer = player.incomingLoan
      ? {
          ...player,
          sell: true,
          incomingLoan: false,
          contract: contractHistory,
        }
      : { ...player, loan: false, sell: false, contract: contractHistory };

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, finalPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  editTransferInSeason: async (params: EditTransferParams): Promise<void> => {
    const {
      careerId,
      seasonId,
      playerId,
      contractIndex,
      direction,
      transferType,
      clubName,
      transferValue,
      date,
      loanDuration,
      wagePercentage,
    } = params;

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );

    const [, month] = date.split("/").map(Number);
    const m = (month || 1) - 1;
    const year =
      m < startDate.getMonth()
        ? endDate.getFullYear()
        : startDate.getFullYear();
    const parsedDate = parseBrasilDate(date, year);
    if (!parsedDate) throw new Error("Data inválida");

    const contracts = player.contract ? [...player.contract] : [];
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
    let finalPlayer: Players = { ...player };

    const specialClubs = [
      "Base",
      "Aposentadoria",
      "Aposentou",
      "Fim de Contrato",
      "Passes Livres",
    ];
    const isSpecialExit =
      currentContract.leftClub &&
      specialClubs.includes(currentContract.leftClub);
    const isSpecialArrival =
      currentContract.fromClub &&
      specialClubs.includes(currentContract.fromClub);

    if (direction === "exit") {
      currentContract.dataExit = parsedDate;

      if (!isSpecialExit) {
        if (clubName) currentContract.leftClub = clubName;

        if (transferType === "Venda") {
          currentContract.sellValue = parseValue(transferValue || "0");
          currentContract.isLoan = false;
          delete currentContract.loanDuration;
          delete currentContract.wagePercentage;
          finalPlayer = {
            ...finalPlayer,
            sell: true,
            loan: false,
          };
        } else if (transferType === "Emprestar") {
          currentContract.sellValue = 0;
          currentContract.isLoan = true;
          currentContract.loanDuration = Number(loanDuration) || 0;
          currentContract.wagePercentage = Number(wagePercentage) || 0;
          finalPlayer = {
            ...finalPlayer,
            sell: false,
            loan: true,
            shirtNumber: "",
          };
        }
      }
    } else {
      // arrivals
      currentContract.dataArrival = parsedDate;

      if (!isSpecialArrival) {
        if (clubName) currentContract.fromClub = clubName;

        if (transferType === "Compra") {
          currentContract.buyValue = parseValue(transferValue || "0");
          currentContract.isLoan = false;
          delete currentContract.loanDuration;
          delete currentContract.wagePercentage;
          finalPlayer = {
            ...finalPlayer,
            buy: true,
            incomingLoan: false,
          };
        } else if (transferType === "Empréstimo") {
          currentContract.buyValue = 0;
          currentContract.isLoan = true;
          currentContract.loanDuration = Number(loanDuration) || 0;
          currentContract.wagePercentage = Number(wagePercentage) || 100;
          finalPlayer = {
            ...finalPlayer,
            buy: false,
            incomingLoan: true,
          };
        }
      }
    }

    contracts[idx] = currentContract;
    finalPlayer.contract = contracts;

    if (clubName && !specialClubs.includes(clubName.trim())) {
      const teamExists = seasonToUpdate.teams?.some(
        (t) => t.name.toLowerCase() === clubName.trim().toLowerCase(),
      );
      if (!teamExists) {
        await ServiceMatches.addTeamToSeason(careerId, seasonId, {
          name: clubName.trim(),
          showMatch: false,
        });
        if (!seasonToUpdate.teams) seasonToUpdate.teams = [];
        seasonToUpdate.teams.push({ name: clubName.trim(), showMatch: false });
      }
    }

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, finalPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    Object.assign(player, finalPlayer);
  },

  revertTransferInSeason: async (
    params: RevertTransferParams,
  ): Promise<void> => {
    const { careerId, seasonId, playerId, contractIndex, direction } = params;

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const contracts = player.contract ? [...player.contract] : [];
    let idx = contractIndex;
    if (idx < 0 || idx >= contracts.length) {
      idx = contracts.findIndex((c) =>
        direction === "exit"
          ? Boolean(c.dataExit || c.leftClub)
          : Boolean(c.dataArrival || c.fromClub),
      );
      if (idx < 0) idx = Math.max(0, contracts.length - 1);
    }

    const currentContract = contracts[idx];
    if (!currentContract) throw new Error("Contrato não encontrado");

    if (direction === "arrivals" && currentContract.fromClub === "Base") {
      throw new Error("Transferências promovidas da base não podem ser revertidas.");
    }

    if (direction === "exit") {
      player.sell = false;
      player.loan = false;

      if (currentContract.dataArrival || currentContract.fromClub) {
        currentContract.leftClub = "";
        currentContract.dataExit = null;
        currentContract.sellValue = 0;
        currentContract.isLoan = false;
        delete currentContract.loanDuration;
        delete currentContract.wagePercentage;
        delete currentContract.buyOptionValue;
      } else {
        if (contracts.length > 1) {
          contracts.splice(idx, 1);
        } else {
          currentContract.leftClub = "";
          currentContract.dataExit = null;
          currentContract.sellValue = 0;
          currentContract.isLoan = false;
          delete currentContract.loanDuration;
          delete currentContract.wagePercentage;
          delete currentContract.buyOptionValue;
        }
      }

      player.contract = contracts;

      const playerRef = doc(
        db,
        `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
        playerId,
      );
      await setDoc(playerRef, player);
      await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
      const targetInSeason = seasonToUpdate.players.find((p) => p.id === playerId);
      if (targetInSeason) Object.assign(targetInSeason, player);
    } else {
      // Arrivals
      if (contracts.length <= 1) {
        const playerRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
          playerId,
        );
        await deleteDoc(playerRef);
        seasonToUpdate.players = seasonToUpdate.players.filter(
          (p) => p.id !== playerId,
        );
        await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
      } else {
        contracts.splice(idx, 1);
        player.contract = contracts;
        const prev = contracts[contracts.length - 1];
        if (prev?.isLoan && prev?.leftClub) {
          player.loan = true;
          player.sell = false;
          player.buy = false;
          player.incomingLoan = false;
        }
        const playerRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
          playerId,
        );
        await setDoc(playerRef, player);
        await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
        const targetInSeason = seasonToUpdate.players.find((p) => p.id === playerId);
        if (targetInSeason) Object.assign(targetInSeason, player);
      }
    }
  },
};
