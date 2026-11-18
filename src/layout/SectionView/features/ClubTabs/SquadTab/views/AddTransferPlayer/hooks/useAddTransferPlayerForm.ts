import { useRef, useCallback, useEffect, useState } from "react";
import { useForm } from "../../../../../../../../common/hooks/UseForm";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { Field } from "../../../../../../../../components/FormSection";
import { formatDateInput } from "../../../../../../../../common/utils/Date";
import { calculatePlayerAge } from "../../../../../../../../common/utils/calculatePlayerAge";
import { calculateContractYears } from "../../../../../../../../common/utils/calculateContractYears";
import {
  parseValue,
  formatCompactNumber,
  formatTransferValue,
} from "../../../../../../../../common/utils/FormatValue";
import {
  SectionScreen,
  TransferClausePrefill,
} from "../../../../../../config/screens";
import { useGlobalTeamsOptions } from "../../shared/useGlobalTeamsOptions";
import { usePastPlayersAutofill } from "../../shared/usePastPlayersAutofill";
import { useTransferBonusesForm } from "../../../../../../hooks/useTransferBonusesForm";
import { TransferBonus } from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { TransferDraftService } from "../../../../../../../../common/services/TransferDraftService";
import { useAddTransferPlayerActions } from "./useAddTransferPlayerActions";
import { toast } from "../../../../../../../../common/services/ToastService";
import { OptimisticUpdateData } from "../../../../../../helpers/updateSectionCareer";
import { ServiceProposals } from "../../../../../../../../common/services/ServiceProposals";
import { positionOptionsBySector } from "../../../../../../../../common/types/Positions";
import { normalizeSector } from "../constants/transferFormFields";
import {
  NegotiationStageStatus,
  TransferProposal,
} from "../../../../../../../../common/interfaces/proposals/transferProposal";

interface UseAddTransferPlayerFormParams {
  career: Career;
  season: ClubData;
  seasonId?: string;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  prefill?: TransferClausePrefill;
  restoreDraft?: boolean;
  proposalId?: string;
  initialProposal?: TransferProposal;
  editTransfer?: {
    player: Players;
    contract: NonNullable<Players["contract"]>[number];
    contractIndex: number;
  };
}

export const useAddTransferPlayerForm = ({
  career,
  season,
  seasonId,
  onClose,
  onOpenScreen,
  prefill,
  restoreDraft,
  proposalId,
  initialProposal,
  editTransfer,
}: UseAddTransferPlayerFormParams) => {
  const form = useForm();
  const {
    formValues,
    mergedFormValues,
    setFormValues,
    booleanValues,
    handleBooleanChange,
    handleInputChange,
  } = form;

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDrawerKey, setActiveDrawerKey] = useState<
    "bonuses" | "special" | null
  >(null);
  const [clubNegotiationStatus, setClubNegotiationStatus] =
    useState<NegotiationStageStatus>("em_negociacao");
  const [playerNegotiationStatus, setPlayerNegotiationStatus] =
    useState<NegotiationStageStatus>("em_negociacao");
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationProposal, setConfirmationProposal] =
    useState<TransferProposal | null>(null);

  const {
    bonuses,
    editingBonusIndex,
    handleAddOrEditBonus: handleAddOrEditBonusInternal,
    handleDeleteBonus: handleDeleteBonusInternal,
    resetBonuses,
    setBonuses,
    setEditingBonusIndex,
  } = useTransferBonusesForm();

  const { filteredTeamOptions } = useGlobalTeamsOptions({
    career,
    season,
    searchQuery: formValues.fromClub || "",
  });
  const {
    pastPlayerOptions,
    filteredPastPlayerOptions,
    clearPastPlayerSelection,
  } = usePastPlayersAutofill({
    career,
    season,
    selectedPastPlayer: formValues.selectedPastPlayer,
    setFormValues,
    isEditing: false,
    extraOptionName: prefill?.player?.name,
    fallbackPotentialToOverall: true,
  });

  useEffect(() => {
    if (editTransfer) return;
    setFormValues((prev: Record<string, string>) => ({
      ...prev,
      transferType: prev.transferType || "Compra",
      timing: prev.timing || "Imediata",
      loanDuration: prev.loanDuration || "1 ano",
    }));
  }, [setFormValues, editTransfer]);

  const editTransferAppliedRef = useRef(false);
  useEffect(() => {
    if (!editTransfer || editTransferAppliedRef.current) return;
    editTransferAppliedRef.current = true;
    const { player, contract } = editTransfer;
    const isLoan = Boolean(contract.isLoan);

    let loanDurationStr = "1 ano";
    if (contract.loanDuration) {
      const d = String(contract.loanDuration);
      if (d === "0.5" || d === "0.6" || d.toLowerCase().includes("curto")) {
        loanDurationStr = "Curto prazo";
      } else if (d === "2" || d.includes("2")) {
        loanDurationStr = "2 anos";
      } else {
        loanDurationStr = "1 ano";
      }
    }

    let weeklyWage: number | string | undefined;
    if (isLoan) {
      const wagePct =
        contract.wagePercentage !== undefined &&
        contract.wagePercentage !== null
          ? Number(contract.wagePercentage)
          : contract.loanTerms?.ourWagePercentage !== undefined &&
              contract.loanTerms?.ourWagePercentage !== null
            ? Number(contract.loanTerms.ourWagePercentage)
            : 100;

      if (
        contract.fullSalary !== undefined &&
        contract.fullSalary !== null &&
        Number(contract.fullSalary) > 0
      ) {
        if (
          wagePct > 0 &&
          wagePct < 100 &&
          contract.salary !== undefined &&
          Number(contract.fullSalary) === Number(contract.salary)
        ) {
          weeklyWage = Math.round(Number(contract.salary) / (wagePct / 100));
        } else {
          weeklyWage = contract.fullSalary;
        }
      } else if (
        contract.contractDetails?.weeklyWage !== undefined &&
        contract.contractDetails.weeklyWage !== null &&
        Number(contract.contractDetails.weeklyWage) > 0
      ) {
        if (
          wagePct > 0 &&
          wagePct < 100 &&
          contract.salary !== undefined &&
          Number(contract.contractDetails.weeklyWage) ===
            Number(contract.salary)
        ) {
          weeklyWage = Math.round(Number(contract.salary) / (wagePct / 100));
        } else {
          weeklyWage = contract.contractDetails.weeklyWage;
        }
      } else if (
        wagePct > 0 &&
        contract.salary !== undefined &&
        Number(contract.salary) > 0
      ) {
        weeklyWage = Math.round(Number(contract.salary) / (wagePct / 100));
      } else if (
        wagePct > 0 &&
        player.salary !== undefined &&
        Number(player.salary) > 0
      ) {
        weeklyWage = Math.round(Number(player.salary) / (wagePct / 100));
      } else {
        weeklyWage = contract.salary || player.salary;
      }
    } else {
      weeklyWage =
        contract.fullSalary ||
        contract.salary ||
        contract.contractDetails?.weeklyWage ||
        player.salary;
    }

    const numericWeeklyWage =
      typeof weeklyWage === "number"
        ? weeklyWage
        : parseValue(String(weeklyWage || "0"));
    const wageStr =
      numericWeeklyWage > 0 ? formatCompactNumber(numericWeeklyWage) : "";

    const playerVal = player.playerValue;
    const numericPlayerVal =
      typeof playerVal === "number"
        ? playerVal
        : parseValue(String(playerVal || "0"));
    const playerValStr =
      numericPlayerVal > 0 ? formatCompactNumber(numericPlayerVal) : "";

    const extraContract = contract as unknown as Record<string, unknown>;
    const instAny = contract.installments as unknown as
      | { totalValue?: number }
      | undefined;
    const rawBuyVal =
      (typeof contract.buyValue === "number" && contract.buyValue > 0) ||
      (typeof contract.buyValue === "string" &&
        parseValue(contract.buyValue) > 0)
        ? contract.buyValue
        : instAny?.totalValue ||
          (contract.installments
            ? contract.installments.annualInstallmentValue *
                contract.installments.totalInstallments +
              (contract.installments.upfrontValue || 0)
            : undefined) ||
          (extraContract.transferFee ?? extraContract.value ?? undefined);

    const numericBuyVal =
      typeof rawBuyVal === "number"
        ? rawBuyVal
        : rawBuyVal !== undefined && rawBuyVal !== null
          ? parseValue(String(rawBuyVal))
          : 0;

    const buyValStr =
      numericBuyVal > 0
        ? formatCompactNumber(numericBuyVal)
        : rawBuyVal === 0 || rawBuyVal === "0"
          ? "0"
          : "";

    const hasBuyOption = Boolean(
      contract.loanTerms?.hasBuyOption !== false &&
        (contract.loanTerms?.hasBuyOption ||
          (contract.buyOptionValue && Number(contract.buyOptionValue) > 0) ||
          (contract.loanTerms?.buyOptionFee &&
            Number(contract.loanTerms.buyOptionFee) > 0) ||
          (isLoan &&
            (parseValue(String(contract.buyValue || "0")) > 0 ||
              parseValue(String(extraContract.transferFee || "0")) > 0))),
    );

    const exercisedDerivedContract = player.contract?.find(
      (c) =>
        !c.isLoan &&
        Boolean(
          c.fromLoanBuyOption ||
          c.buyOptionFinalized ||
          c.sourceLoanContractIndex !== undefined,
        ),
    );

    const buyOptionFee =
      contract.buyOptionValue ||
      contract.loanTerms?.buyOptionFee ||
      exercisedDerivedContract?.buyValue ||
      (isLoan
        ? contract.buyValue || extraContract.transferFee || extraContract.value
        : undefined);
    const numericBuyOptionFee =
      typeof buyOptionFee === "number"
        ? buyOptionFee
        : parseValue(String(buyOptionFee || "0"));
    const buyOptionStr =
      numericBuyOptionFee > 0
        ? formatCompactNumber(numericBuyOptionFee)
        : buyValStr;

    const finalBuyVal = isLoan
      ? buyOptionStr || buyValStr
      : buyValStr || buyOptionStr;

    const sellOnPct =
      contract.loanTerms?.sellOnPercentage ??
      exercisedDerivedContract?.transferClauses?.sellOnPercentage ??
      contract.transferClauses?.sellOnPercentage;

    const wagePercentageVal =
      contract.wagePercentage !== undefined && contract.wagePercentage !== null
        ? String(contract.wagePercentage)
        : contract.loanTerms?.ourWagePercentage !== undefined &&
            contract.loanTerms?.ourWagePercentage !== null
          ? String(contract.loanTerms.ourWagePercentage)
          : "";

    setFormValues((prev) => ({
      ...prev,
      transferType: isLoan ? "Empréstimo" : "Compra",
      playerName: player.name || "",
      nation: player.nation || career.nation || "BRA",
      sector: player.sector || "",
      position: player.position || "",
      overall: player.overall ? String(player.overall) : "",
      potential: player.potential ? String(player.potential) : "",
      age: player.age ? String(player.age) : "",
      birthDate: player.birthDate || "",
      shirtNumber: player.shirtNumber ? String(player.shirtNumber) : "",
      height: player.height ? String(player.height) : "",
      weight: player.weight ? String(player.weight) : "",
      fromClub: contract.fromClub || "",
      playerValue: playerValStr,
      buyValue: finalBuyVal,
      transferFee: finalBuyVal,
      timing: contract.timing || "Imediata",
      loanDuration: loanDurationStr,
      salary: wageStr,
      wagePercentage: wagePercentageVal,
      buyOption: buyOptionStr || finalBuyVal,
      buyOptionValue: buyOptionStr || finalBuyVal,
      sellOnPercentage: sellOnPct !== undefined ? String(sellOnPct) : "",
      globalId: player.id,
      playedWithUs: player.playedWithUs ? String(player.playedWithUs) : "",
    }));

    handleBooleanChange("hasBuyOption", hasBuyOption);
    handleBooleanChange("isCaptain", Boolean(player.captain));
    handleBooleanChange("isKnownPlayer", Boolean(player.playedWithUs));

    if (contract.bonuses && contract.bonuses.length > 0) {
      resetBonuses(contract.bonuses);
    }
  }, [editTransfer, career.nation, handleBooleanChange, setFormValues, resetBonuses]);

  // Restauração de proposta existente ou rascunho persistido
  const proposalRestoredIdRef = useRef<string | null>(null);

  const applyProposalData = useCallback(
    (proposal: TransferProposal) => {
      const isLoanProposal = proposal.type === "emprestimo_entrada";

      const resolvePositiveFee = (
        ...candidates: Array<number | string | undefined | null>
      ): { numeric: number; rawStr: string } => {
        for (const cand of candidates) {
          if (typeof cand === "number" && cand > 0) {
            return { numeric: cand, rawStr: "" };
          }
          if (typeof cand === "string" && cand.trim() !== "") {
            const parsed = parseValue(cand);
            if (parsed > 0) {
              return { numeric: parsed, rawStr: cand.trim() };
            }
            if (cand.trim() !== "0") {
              return { numeric: 0, rawStr: cand.trim() };
            }
          }
        }
        return { numeric: 0, rawStr: "" };
      };

      const instTotal = proposal.clubNegotiation?.installments
        ? proposal.clubNegotiation.installments.annualInstallmentValue *
            proposal.clubNegotiation.installments.totalInstallments +
          (proposal.clubNegotiation.installments.upfrontValue || 0)
        : undefined;

      const { numeric: numericFee, rawStr: rawFeeStr } = resolvePositiveFee(
        proposal.clubNegotiation?.transferFee,
        instTotal,
        proposal.formState?.formValues?.buyValue,
        proposal.formState?.formValues?.transferFee,
        proposal.playerValue,
      );
      const formattedBuyValue =
        numericFee > 0 ? formatTransferValue(numericFee) : rawFeeStr;

      const { numeric: numericBuyOpt, rawStr: rawBuyOptStr } =
        resolvePositiveFee(
          proposal.clubNegotiation?.loanTerms?.buyOptionFee,
          proposal.formState?.formValues?.buyOption,
          proposal.formState?.formValues?.buyOptionValue,
          isLoanProposal ? proposal.clubNegotiation?.transferFee : undefined,
        );
      const formattedBuyOpt =
        numericBuyOpt > 0 ? formatTransferValue(numericBuyOpt) : rawBuyOptStr;

      const hasProposalBuyOption = Boolean(
        proposal.clubNegotiation?.loanTerms?.hasBuyOption ||
        numericBuyOpt > 0 ||
        Boolean(formattedBuyOpt),
      );

      const partnerClub = proposal.clubNegotiation?.partnerClub || "";

      if (proposal.formState?.booleanValues) {
        Object.entries(proposal.formState.booleanValues).forEach(([k, v]) => {
          if (k === "isSigning") return;
          handleBooleanChange(k, v);
        });
      }
      if (hasProposalBuyOption) {
        handleBooleanChange("hasBuyOption", true);
      }
      if (proposal.clubNegotiation?.swapPlayer?.playerName) {
        handleBooleanChange("hasPlayerSwap", true);
      }

      setFormValues((prev) => {
        const raw = proposal.formState?.formValues || {};
        const baseValues: Record<string, string> = {
          playerName: proposal.playerName || prev.playerName || "",
          position: proposal.playerPosition || prev.position || "",
          sector: proposal.playerSector || prev.sector || "",
          nation: proposal.playerNation || prev.nation || "",
          overall: proposal.playerOverall
            ? String(proposal.playerOverall)
            : raw.overall || prev.overall || "",
          age: proposal.playerAge
            ? String(proposal.playerAge)
            : raw.age || prev.age || "",
          birthDate:
            proposal.playerBirthDate || raw.birthDate || prev.birthDate || "",
          shirtNumber:
            proposal.shirtNumber || raw.shirtNumber || prev.shirtNumber || "",
          height: proposal.height || raw.height || prev.height || "",
          weight: proposal.weight || raw.weight || prev.weight || "",
          playerValue:
            raw.playerValue ||
            (proposal.playerValue
              ? formatTransferValue(proposal.playerValue)
              : "") ||
            prev.playerValue ||
            "",
          fromClub: partnerClub || raw.fromClub || prev.fromClub || "",
          timing: proposal.timing || raw.timing || prev.timing || "Imediata",
          dateArrival:
            proposal.agreementDate || raw.dateArrival || prev.dateArrival || "",
          salary:
            raw.salary ||
            (proposal.playerNegotiation?.weeklyWage
              ? formatTransferValue(proposal.playerNegotiation.weeklyWage)
              : "") ||
            prev.salary ||
            "",
          contractUntil:
            proposal.playerNegotiation?.contractUntil ||
            raw.contractUntil ||
            prev.contractUntil ||
            "",
          contractTime: proposal.playerNegotiation?.durationYears
            ? String(proposal.playerNegotiation.durationYears)
            : raw.contractTime || prev.contractTime || "1",
          squadRole:
            proposal.playerNegotiation?.squadRole ||
            raw.squadRole ||
            prev.squadRole ||
            "Rodízio",
        };

        if (isLoanProposal) {
          baseValues.transferType = "Empréstimo";
          const rawLoanDur =
            raw.loanDuration ||
            (proposal.clubNegotiation?.loanTerms?.durationYears !== undefined
              ? String(proposal.clubNegotiation.loanTerms.durationYears)
              : "1 ano");
          if (
            rawLoanDur === "0.5" ||
            rawLoanDur === "0.6" ||
            rawLoanDur.toLowerCase().includes("curto")
          ) {
            baseValues.loanDuration = "Curto prazo";
          } else if (rawLoanDur === "2" || rawLoanDur.includes("2")) {
            baseValues.loanDuration = "2 anos";
          } else {
            baseValues.loanDuration = "1 ano";
          }
          baseValues.wagePercentage = String(
            proposal.clubNegotiation?.loanTerms?.ourWagePercentage ??
              raw.wagePercentage ??
              100,
          );
          baseValues.buyOption =
            formattedBuyOpt || raw.buyOption || raw.buyOptionValue || "";
          baseValues.buyOptionValue =
            formattedBuyOpt || raw.buyOptionValue || raw.buyOption || "";
          baseValues.buyValue = "";
          baseValues.transferFee = "";
        } else {
          baseValues.transferType = "Compra";
          const finalBuyFee =
            formattedBuyValue ||
            raw.buyValue ||
            raw.transferFee ||
            (proposal.playerValue
              ? formatTransferValue(proposal.playerValue)
              : "") ||
            "";
          baseValues.buyValue = finalBuyFee;
          baseValues.transferFee = finalBuyFee;
          baseValues.buyOption = "";
          baseValues.buyOptionValue = "";
        }

        const swap = proposal.clubNegotiation?.swapPlayer;
        if (swap) {
          baseValues.swapPlayerName =
            swap.playerName || raw.swapPlayerName || "";
          baseValues.swapPlayerValue =
            swap.playerValue !== undefined
              ? formatTransferValue(swap.playerValue)
              : swap.estimatedValue !== undefined
                ? formatTransferValue(swap.estimatedValue)
                : raw.swapPlayerValue || "";
          baseValues.swapPlayerPosition =
            swap.position || raw.swapPlayerPosition || "";
          baseValues.swapPlayerSector =
            swap.sector || raw.swapPlayerSector || "";
        }

        return {
          ...prev,
          ...raw,
          ...baseValues,
        };
      });

      if (proposal.clubNegotiation?.bonuses?.length) {
        resetBonuses(proposal.clubNegotiation.bonuses);
      } else if (proposal.playerNegotiation?.performanceBonuses?.length) {
        resetBonuses(proposal.playerNegotiation.performanceBonuses);
      }

      if (proposal.clubNegotiation?.status) {
        setClubNegotiationStatus(proposal.clubNegotiation.status);
      }
      if (proposal.playerNegotiation?.status) {
        setPlayerNegotiationStatus(proposal.playerNegotiation.status);
      }
    },
    [handleBooleanChange, resetBonuses, setFormValues],
  );

  useEffect(() => {
    if (initialProposal) {
      const proposalKey = `${initialProposal.id}_${initialProposal.updatedAt || ""}`;
      if (proposalRestoredIdRef.current === proposalKey) return;
      proposalRestoredIdRef.current = proposalKey;
      applyProposalData(initialProposal);
      return;
    }

    if (proposalId) {
      if (proposalRestoredIdRef.current === proposalId) return;
      proposalRestoredIdRef.current = proposalId;
      const targetSeasonId = seasonId || season.id;
      ServiceProposals.getProposalById(career.id, targetSeasonId, proposalId)
        .then((proposal) => {
          if (!proposal) return;
          applyProposalData(proposal);
        })
        .catch((err) => {
          console.error("Erro ao carregar proposta para edição:", err);
        });
      return;
    }

    if (
      restoreDraft ||
      (!prefill &&
        !editTransfer &&
        TransferDraftService.hasDraft(career.id, season.id))
    ) {
      const draft = TransferDraftService.getDraft(career.id, season.id);
      if (draft) {
        proposalRestoredIdRef.current = "draft";
        if (draft.booleanValues) {
          Object.entries(draft.booleanValues).forEach(([k, v]) => {
            if (k === "isSigning") return;
            handleBooleanChange(k, v);
          });
        }
        if (draft.formValues) {
          setFormValues((prev) => ({ ...prev, ...draft.formValues }));
        }
        if (draft.bonuses && draft.bonuses.length > 0) {
          resetBonuses(draft.bonuses);
        }
        setCurrentStep((draft.step as 1 | 2) || 2);
      }
    }
  }, [
    initialProposal,
    proposalId,
    seasonId,
    restoreDraft,
    editTransfer,
    career.id,
    season.id,
    prefill,
    applyProposalData,
    handleBooleanChange,
    resetBonuses,
    setFormValues,
  ]);

  const transferType =
    (formValues.transferType as "Compra" | "Empréstimo") || "Compra";

  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (prefill && !prefillAppliedRef.current) {
      prefillAppliedRef.current = true;
      handleBooleanChange("isKnownPlayer", true);
      if (prefill.player.isAcademy) {
        handleBooleanChange("isAcademy", true);
      }
      const p = prefill.player;
      const pBirth = p.birthDate || "";
      const calculatedAge = pBirth
        ? calculatePlayerAge(
            pBirth,
            career.createdAt,
            season.seasonNumber,
            career.nation,
            season.matches,
          )
        : p.age;

      setFormValues((prev: Record<string, string>) => ({
        ...prev,
        transferType: "Compra",
        selectedPastPlayer: p.name,
        playerName: p.name,
        globalId: p.id,
        playedWithUs: p.playedWithUs || p.id,
        overall: String(p.overall || ""),
        potential: String(p.potential || p.overall || ""),
        sector: p.sector || "",
        position: (p.position as string) || "",
        age: String(calculatedAge || p.age || ""),
        birthDate: pBirth,
        height: p.height || "",
        weight: p.weight || "",
        nation: p.nation || "",
        shirtNumber: p.shirtNumber || "",
        isAcademy: p.isAcademy ? "true" : "",
        academyNickname: p.academyNickname || "",
        academyData: p.academyData ? JSON.stringify(p.academyData) : "",
        academyHistory: p.academyHistory
          ? JSON.stringify(p.academyHistory)
          : "",
        academyTournaments: p.academyTournaments
          ? JSON.stringify(p.academyTournaments)
          : "",
        fromClub: prefill.fromClub || "",
        buyValue:
          (prefill.mode === "buyback" || prefill.mode === "loanBuyOption") &&
          prefill.buyValue
            ? !isNaN(Number(prefill.buyValue)) &&
              Number(prefill.buyValue) >= 1000
              ? formatTransferValue(Number(prefill.buyValue)).toLowerCase()
              : String(prefill.buyValue)
            : prev.buyValue || "",
      }));
    }
  }, [
    prefill,
    career.createdAt,
    career.nation,
    season.seasonNumber,
    season.matches,
    handleBooleanChange,
    setFormValues,
  ]);

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
        const age = calculatePlayerAge(
          e.target.value,
          career.createdAt,
          season.seasonNumber,
          career.nation,
          season.matches,
        );
        if (age > 0) {
          setFormValues((prev: Record<string, string>) => ({
            ...prev,
            age: String(age),
          }));
        }
      }
      if (field.id === "contractUntil") {
        const formattedDate = formatDateInput(e.target.value);
        e.target.value = formattedDate;
        if (formattedDate.length === 10) {
          const years = calculateContractYears(
            formattedDate,
            career.createdAt,
            season.seasonNumber,
            career.nation,
          );
          if (years >= 1 && years <= 7) {
            setFormValues((prev: Record<string, string>) => ({
              ...prev,
              contractTime: String(years),
              contractUntil: formattedDate,
            }));
          }
        }
      }
      if (field.id === "bonusCategory") {
        setFormValues((prev: Record<string, string>) => ({
          ...prev,
          bonusObjective: "",
          bonusCount: "",
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
        setFormValues((prev: Record<string, string>) => ({
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
      if (field.id === "swapPlayerSector") {
        const newSector = e.target.value;
        const norm = normalizeSector(
          newSector,
        ) as keyof typeof positionOptionsBySector;
        const availablePositions: readonly string[] =
          norm && positionOptionsBySector[norm]
            ? positionOptionsBySector[norm]
            : [];
        setFormValues((prev: Record<string, string>) => ({
          ...prev,
          swapPlayerSector: newSector,
          swapPlayerPosition:
            availablePositions.length > 0
              ? availablePositions.includes(prev.swapPlayerPosition || "")
                ? prev.swapPlayerPosition
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
    if (id === "isKnownPlayer" && !value) {
      clearPastPlayerSelection();
    }
  };

  const {
    handleProceedToStep2,
    handleSaveProposal,
    handleReviewAndFinalize,
    handleOfficialSaveTransfer,
    handleSaveTransfer,
    executeFinalTransfer,
    handleRevertTransfer,
  } = useAddTransferPlayerActions({
    career,
    season,
    onClose,
    onOpenScreen,
    prefill,
    editTransfer,
    formValues,
    booleanValues,
    bonuses,
    transferType,
    setIsLoading,
    setCurrentStep,
    proposalId,
    clubNegotiationStatus,
    playerNegotiationStatus,
    setClubNegotiationStatus,
    setPlayerNegotiationStatus,
    onOpenConfirmation: (prop) => {
      setConfirmationProposal(prop);
      setIsConfirmationOpen(true);
    },
  });

  const closeDrawer = useCallback(() => {
    setActiveDrawerKey(null);
    setEditingBonusIndex(null);
    const hasObjective = bonuses.some((b) =>
      b.bonusCategory
        ? b.bonusCategory === "Objetivo atingido"
        : b.category === "objective",
    );
    setFormValues((prev) => ({
      ...prev,
      bonusCategory: hasObjective ? "Prêmio" : "Objetivo atingido",
      bonusObjective: "",
      bonusCount: "",
      bonusValue: "",
    }));
  }, [bonuses, setEditingBonusIndex, setFormValues]);

  const handleEditBonus = useCallback(
    (index: number) => {
      const item = bonuses[index];
      if (!item) return;
      setFormValues((prev) => ({
        ...prev,
        bonusCategory:
          item.bonusCategory ||
          (item.category === "performance"
            ? "Desempenho"
            : item.category === "award"
              ? "Prêmio"
              : "Objetivo atingido"),
        bonusObjective:
          item.bonusTarget ||
          item.targetObjective ||
          item.name ||
          item.description ||
          "",
        bonusCount: item.targetCount
          ? String(item.targetCount)
          : item.metricTarget
            ? String(item.metricTarget)
            : "",
        bonusValue: formatTransferValue(item.value).toLowerCase(),
      }));
      setEditingBonusIndex(index);
      setTimeout(() => {
        const drawer = document.getElementById("clauseSectionDrawerBody");
        if (drawer && typeof drawer.scrollTo === "function") {
          drawer.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 0);
    },
    [bonuses, setEditingBonusIndex, setFormValues],
  );

  const handleDeleteBonus = useCallback(
    (index: number) => {
      handleDeleteBonusInternal(index);
      if (editingBonusIndex === index) {
        setFormValues((prev) => ({
          ...prev,
          bonusCategory: "",
          bonusObjective: "",
          bonusCount: "",
          bonusValue: "",
        }));
      }
    },
    [editingBonusIndex, handleDeleteBonusInternal, setFormValues],
  );

  const handleAddOrEditBonus = () => {
    const category = (formValues.bonusCategory || "Objetivo atingido").trim();
    const objective = (formValues.bonusObjective || "").trim();
    const bonusVal = (formValues.bonusValue || "").trim();

    if (!objective) {
      toast.warning("Por favor, selecione ou informe o objetivo do bônus.");
      return;
    }

    if (!bonusVal) {
      toast.warning("Por favor, informe o valor do bônus.");
      return;
    }

    if (!/[kmb]$/i.test(bonusVal) && bonusVal !== "0") {
      toast.warning("O valor do bônus deve terminar com 'k', 'm' ou 'b'.");
      return;
    }

    const parsedBonusValue = parseValue(bonusVal);
    if (parsedBonusValue <= 0 && bonusVal !== "0") {
      toast.warning("Informe um valor válido para o bônus (ex: 500k, 2M).");
      return;
    }

    const isObjectiveCategory = category === "Objetivo atingido";
    if (isObjectiveCategory) {
      const alreadyHasObjective = bonuses.some(
        (b, idx) =>
          (b.bonusCategory
            ? b.bonusCategory === "Objetivo atingido"
            : b.category === "objective") && idx !== editingBonusIndex,
      );
      if (alreadyHasObjective) {
        toast.warning(
          "É permitido cadastrar apenas uma meta de 'Objetivo atingido' por contrato.",
        );
        return;
      }
    }

    const bonusCatType: "objective" | "award" | "performance" =
      category === "Prêmio"
        ? "award"
        : category === "Desempenho"
          ? "performance"
          : "objective";

    const updatedBonus: TransferBonus = {
      id:
        editingBonusIndex !== null && bonuses[editingBonusIndex]?.id
          ? bonuses[editingBonusIndex].id
          : `bonus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      direction: "payable",
      category: bonusCatType,
      bonusCategory: category as TransferBonus["bonusCategory"],
      name: objective,
      description: objective,
      targetObjective: objective,
      bonusTarget: objective,
      value: parsedBonusValue,
      partnerClub: formValues.fromClub || "",
      status: "pending",
      paid: false,
      ...(formValues.bonusCount
        ? { targetCount: Number(formValues.bonusCount) || undefined }
        : {}),
    };

    const success = handleAddOrEditBonusInternal(updatedBonus);
    if (!success) {
      toast.warning("Já existe uma meta cadastrada com este mesmo objetivo.");
      return;
    }

    const nextBonuses =
      editingBonusIndex !== null
        ? bonuses.map((b, idx) =>
            idx === editingBonusIndex ? updatedBonus : b,
          )
        : [...bonuses, updatedBonus];
    const nextHasObjective = nextBonuses.some((b) =>
      b.bonusCategory
        ? b.bonusCategory === "Objetivo atingido"
        : b.category === "objective",
    );
    const nextDefaultCategory = nextHasObjective
      ? "Prêmio"
      : "Objetivo atingido";

    setFormValues((prev) => ({
      ...prev,
      bonusCategory: nextDefaultCategory,
      bonusObjective: "",
      bonusCount: "",
      bonusValue: "",
    }));
    setEditingBonusIndex(null);
  };

  const handleSaveSpecialClausesDrawer = useCallback(() => {
    const releaseClauseRaw = (formValues.releaseClause || "").trim();
    if (
      releaseClauseRaw &&
      releaseClauseRaw !== "0" &&
      !/[kmb]$/i.test(releaseClauseRaw)
    ) {
      toast.warning(
        "O valor da multa rescisória deve terminar com 'k', 'm' ou 'b'.",
      );
      return;
    }

    const wageType = formValues.wageAdjustmentType || "N/D";
    if (wageType === "Aumentar" || wageType === "Diminuir") {
      if (!formValues.wageAdjustmentObjective?.trim()) {
        toast.warning("Por favor, selecione o critério de ajuste salarial.");
        return;
      }
      if (!formValues.wageAdjustmentPercentage?.trim()) {
        toast.warning("Por favor, selecione a porcentagem de ajuste salarial.");
        return;
      }
    }
    closeDrawer();
  }, [formValues, closeDrawer]);

  return {
    currentStep,
    setCurrentStep,
    formValues,
    mergedFormValues,
    setFormValues,
    booleanValues,
    transferType,
    isLoading,
    bonuses,
    editingBonusIndex,
    activeDrawerKey,
    setActiveDrawerKey,
    filteredTeamOptions,
    filteredPastPlayerOptions,
    pastPlayerOptions,
    handleInputChange: handleInputChangeWrapper,
    handleBooleanChange: handleBooleanChangeWrapper,
    handleProceedToStep2,
    handleReturnToStep1: () => setCurrentStep(1),
    handleOfficialSaveTransfer,
    handleSaveTransfer,
    handleSaveProposal,
    handleReviewAndFinalize,
    executeFinalTransfer,
    handleRevertTransfer,
    proposalId,
    clubNegotiationStatus,
    setClubNegotiationStatus,
    playerNegotiationStatus,
    setPlayerNegotiationStatus,
    isConfirmationOpen,
    setIsConfirmationOpen,
    confirmationProposal,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
    resetBonuses,
    setBonuses,
    setEditingBonusIndex,
    openDrawer: (key: "bonuses" | "special") => setActiveDrawerKey(key),
    closeDrawer,
    handleSaveSpecialClausesDrawer,
  };
};

export default useAddTransferPlayerForm;
