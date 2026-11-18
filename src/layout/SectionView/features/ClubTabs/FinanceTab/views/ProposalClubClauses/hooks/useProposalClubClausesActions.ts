import { useCallback } from "react";
import { calculateOverallProposalStatus } from "../../../../../../../../common/helpers/proposals/proposalStatusHelper";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import {
  TransferBonus,
  createTransferInstallments,
} from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import {
  TransferProposal,
  ClubNegotiationStage,
} from "../../../../../../../../common/interfaces/proposals/transferProposal";
import { ServiceProposals } from "../../../../../../../../common/services/ServiceProposals";
import { toast } from "../../../../../../../../common/services/ToastService";
import { parseValue, formatTransferValue } from "../../../../../../../../common/utils/FormatValue";
import {
  FormValues,
  BooleanValues,
} from "../../../../SquadTab/views/TransferPlayer/types";

interface UseProposalClubClausesActionsParams {
  career: Career;
  season: ClubData;
  proposal: TransferProposal | null;
  formValues: FormValues;
  booleanValues: BooleanValues;
  bonuses: TransferBonus[];
  setIsSaving: (saving: boolean) => void;
  onClose: () => void;
}

export const useProposalClubClausesActions = ({
  career,
  season,
  proposal,
  formValues,
  booleanValues,
  bonuses,
  setIsSaving,
  onClose,
}: UseProposalClubClausesActionsParams) => {
  const handleSaveClubClauses = useCallback(async () => {
    if (!proposal) return;

    setIsSaving(true);
    try {
      const isLoan =
        proposal.type === "emprestimo_entrada" ||
        proposal.type === "emprestimo_saida";

      const instTotal = proposal.clubNegotiation?.installments
        ? proposal.clubNegotiation.installments.annualInstallmentValue *
            proposal.clubNegotiation.installments.totalInstallments +
          (proposal.clubNegotiation.installments.upfrontValue || 0)
        : 0;

      const isExitTransfer =
        proposal.type === "venda" || proposal.type === "emprestimo_saida";

      const formFeeRaw =
        formValues.transferFee ||
        (isExitTransfer ? formValues.sellValue : formValues.buyValue);
      const parsedFormFee =
        formFeeRaw !== undefined && formFeeRaw.trim() !== ""
          ? parseValue(formFeeRaw)
          : undefined;

      const totalFee =
        parsedFormFee !== undefined && parsedFormFee > 0
          ? parsedFormFee
          : (proposal.clubNegotiation?.transferFee &&
            proposal.clubNegotiation.transferFee > 0
              ? proposal.clubNegotiation.transferFee
              : 0) ||
            instTotal ||
            parseValue(
              proposal.formState?.formValues?.buyValue ||
                proposal.formState?.formValues?.sellValue ||
                proposal.formState?.formValues?.transferFee ||
                "0",
            ) ||
            proposal.playerValue ||
            0;

      // 1. Parcelamento
      let installments: ClubNegotiationStage["installments"] = undefined;
      const isWithoutInstallments =
        formValues.installmentsPercentage === "Sem parcelas" ||
        formValues.installmentsPercentage === "Nenhum";

      const hasInstallments =
        !isWithoutInstallments &&
        (booleanValues.hasInstallments ||
          (Boolean(formValues.installmentsPercentage) &&
            formValues.installmentsPercentage !== "Sem parcelas"));

      if (hasInstallments && totalFee > 0) {
        const rawPct =
          parseInt(
            formValues.installmentsPercentage?.replace("%", "") || "20",
            10,
          ) || 20;
        const validPct = [20, 40, 60, 80, 100].includes(rawPct)
          ? (rawPct as 20 | 40 | 60 | 80 | 100)
          : 20;
        const count = Math.min(
          Math.max(parseInt(formValues.installmentsYears || "2", 10) || 2, 1),
          7,
        );
        const partnerClubName =
          proposal.clubNegotiation?.partnerClub ||
          formValues.toClub ||
          formValues.fromClub ||
          "";
        const isExitTransfer =
          proposal.type === "venda" || proposal.type === "emprestimo_saida";

        installments = createTransferInstallments({
          totalValue: totalFee,
          percentage: validPct,
          totalInstallments: count,
          currentSeasonNumber: season.seasonNumber,
          direction: isExitTransfer ? "receivable" : "payable",
          partnerClub: partnerClubName,
        });

        const paid = parseInt(formValues.paidInstallments || "0", 10) || 0;
        if (paid > 0) {
          installments.remainingInstallments = Math.max(0, count - paid);
          if (installments.remainingInstallments === 0) {
            installments.status = "paid";
          }
        }
      }

      // 2. Troca de Atleta
      let swapPlayer: ClubNegotiationStage["swapPlayer"] = undefined;
      if (booleanValues.hasPlayerSwap || formValues.swapPlayerName?.trim()) {
        const swapVal = parseValue(formValues.swapPlayerValue || "0");
        const foundPlayer = (season.players || []).find(
          (p) =>
            p.name.trim().toLowerCase() ===
            formValues.swapPlayerName?.trim().toLowerCase(),
        );

        swapPlayer = {
          playerId:
            foundPlayer?.id ||
            proposal.clubNegotiation?.swapPlayer?.playerId ||
            undefined,
          playerName: formValues.swapPlayerName?.trim() || "",
          playerValue: swapVal,
          estimatedValue: swapVal,
          position: formValues.swapPlayerPosition || "",
          sector: formValues.swapPlayerSector || "",
          overall: formValues.swapPlayerOverall
            ? Number(formValues.swapPlayerOverall)
            : proposal.clubNegotiation?.swapPlayer?.overall,
          age: formValues.swapPlayerAge
            ? Number(formValues.swapPlayerAge)
            : proposal.clubNegotiation?.swapPlayer?.age,
          incomingSwap: isExitTransfer ? true : undefined,
        };
      }

      // 3. Cláusulas Especiais de Saída/Chegada
      let sellOnPercentage: number | undefined = undefined;
      if (
        formValues.sellOnPercentage &&
        formValues.sellOnPercentage !== "Nenhum"
      ) {
        const parsed = parseInt(
          formValues.sellOnPercentage.replace("%", ""),
          10,
        );
        if (!isNaN(parsed) && parsed > 0) {
          sellOnPercentage = parsed;
        }
      }

      let buybackValue: number | undefined = undefined;
      if (formValues.buybackValue) {
        const parsedVal = parseValue(formValues.buybackValue);
        if (parsedVal > 0) {
          buybackValue = parsedVal;
        }
      }

      let loanBackDuration: 1 | 2 | undefined = undefined;
      if (
        formValues.loanBackDuration &&
        formValues.loanBackDuration !== "Nenhum"
      ) {
        const parsedYears = parseInt(formValues.loanBackDuration, 10);
        if (parsedYears === 1 || parsedYears === 2) {
          loanBackDuration = parsedYears;
        }
      }

      // 4. Termos de Empréstimo
      let loanTerms: ClubNegotiationStage["loanTerms"] =
        proposal.clubNegotiation?.loanTerms;
      if (isLoan) {
        const buyOptFee = parseValue(formValues.buyOption || "0");
        loanTerms = {
          ...(proposal.clubNegotiation?.loanTerms || {}),
          hasBuyOption: Boolean(booleanValues.hasBuyOption || buyOptFee > 0),
          buyOptionFee: buyOptFee > 0 ? buyOptFee : undefined,
          durationYears:
            parseInt(formValues.loanDuration || "1", 10) ||
            proposal.clubNegotiation?.loanTerms?.durationYears ||
            1,
          theirWagePercentage:
            parseInt(formValues.wagePercentage || "100", 10) ||
            proposal.clubNegotiation?.loanTerms?.theirWagePercentage ||
            100,
          sellOnPercentage,
        };
      }

      // 5. Montagem do ClubNegotiationStage
      const updatedClubNegotiation: ClubNegotiationStage = {
        status: "aceita",
        partnerClub:
          proposal.clubNegotiation?.partnerClub ||
          formValues.toClub ||
          formValues.fromClub ||
          "",
        transferFee: totalFee > 0 ? totalFee : undefined,
        installments,
        swapPlayer,
        bonuses: bonuses.length > 0 ? bonuses : undefined,
        sellOnPercentage,
        buybackValue,
        firstRefusal: Boolean(
          booleanValues.firstRefusal || formValues.firstRefusal === "true",
        ),
        loanBackDuration,
        loanTerms,
      };

      // 6. Recálculo do overallStatus
      const nextOverallStatus = calculateOverallProposalStatus({
        type: proposal.type,
        clubNegotiation: updatedClubNegotiation,
        playerNegotiation: proposal.playerNegotiation,
        overallStatus: proposal.overallStatus,
      });

      // 7. Mesclagem do formState preservando termos do atleta e campos existentes
      const formattedTotalFee =
        totalFee > 0 ? formatTransferValue(totalFee) : "";

      const normalizedTiming = ((): "Imediata" | "Proxima Janela" | "Proxima Temporada" => {
        const t = (formValues.timing || proposal.timing || "Imediata").trim();
        if (t === "Imediato" || t === "Imediata") return "Imediata";
        if (t.toLowerCase().includes("janela")) return "Proxima Janela";
        if (t.toLowerCase().includes("temporada")) return "Proxima Temporada";
        return "Imediata";
      })();

      const mergedFormValues: Record<string, string> = {
        ...(proposal.formState?.formValues || {}),
        ...formValues,
        timing: normalizedTiming,
        transferFee:
          formValues.transferFee ||
          (isExitTransfer ? formValues.sellValue : formValues.buyValue) ||
          formattedTotalFee ||
          "",
        ...(isExitTransfer
          ? {
              sellValue:
                formValues.sellValue ||
                formValues.transferFee ||
                formattedTotalFee ||
                "",
            }
          : {
              buyValue:
                formValues.buyValue ||
                formValues.transferFee ||
                formattedTotalFee ||
                "",
            }),
        sellOnPercentage: formValues.sellOnPercentage || "Nenhum",
        buybackValue: formValues.buybackValue || "",
        loanBackDuration: formValues.loanBackDuration || "Nenhum",
        installmentsPercentage: hasInstallments
          ? formValues.installmentsPercentage || "20% do total"
          : "Nenhum",
        installmentsYears: hasInstallments
          ? formValues.installmentsYears || "2 Parcelas"
          : "Nenhum",
        paidInstallments: formValues.paidInstallments || "0",
        swapPlayerName: formValues.swapPlayerName || "",
        swapPlayerValue: formValues.swapPlayerValue || "",
        swapPlayerPosition: formValues.swapPlayerPosition || "",
        swapPlayerSector: formValues.swapPlayerSector || "",
        buyOption: formValues.buyOption || "",
        firstRefusal: String(
          Boolean(
            booleanValues.firstRefusal || formValues.firstRefusal === "true",
          ),
        ),
      };

      const rawPrevBooleans = { ...(proposal.formState?.booleanValues || {}) };
      delete rawPrevBooleans.isSigning;

      const mergedBooleanValues = {
        ...rawPrevBooleans,
        ...booleanValues,
        firstRefusal: Boolean(
          booleanValues.firstRefusal || formValues.firstRefusal === "true",
        ),
        hasInstallments,
      };

      await ServiceProposals.updateProposal(career.id, season.id, proposal.id, {
        clubNegotiation: updatedClubNegotiation,
        overallStatus: nextOverallStatus,
        timing: normalizedTiming,
        formState: {
          formValues: {
            ...mergedFormValues,
            timing: normalizedTiming,
          },
          booleanValues: mergedBooleanValues,
        },
        ...(isExitTransfer && !swapPlayer
          ? { playerNegotiation: undefined }
          : {}),
      });

      toast.success("Cláusulas do clube salvas com sucesso!");
      onClose();
    } catch (err) {
      console.error("Erro ao salvar cláusulas do clube:", err);
      toast.error("Erro ao salvar cláusulas do clube.");
    } finally {
      setIsSaving(false);
    }
  }, [
    career.id,
    season.id,
    season.players,
    proposal,
    formValues,
    booleanValues,
    bonuses,
    season.seasonNumber,
    setIsSaving,
    onClose,
  ]);

  return {
    handleSaveClubClauses,
  };
};
