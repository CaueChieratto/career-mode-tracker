import { TransferBonus } from "../../interfaces/playersInfo/transferTerms";

export interface PendingTransferDraft {
  careerId: string;
  seasonId: string;
  timestamp: number;
  step: number;
  formValues: Record<string, string>;
  booleanValues: Record<string, boolean>;
  bonuses?: TransferBonus[];
  playerName?: string;
  playerNation?: string;
  fromClub?: string;
  playerValue?: string;
  transferFee?: string;
  position?: string;
}

const DRAFT_KEY_PREFIX = "career_tracker_pending_transfer_";

export const TransferDraftService = {
  buildKey: (careerId: string, seasonId: string): string => {
    return `${DRAFT_KEY_PREFIX}${careerId}_${seasonId}`;
  },

  saveDraft: (
    careerId: string,
    seasonId: string,
    draft: PendingTransferDraft,
  ): void => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      const key = TransferDraftService.buildKey(careerId, seasonId);
      window.localStorage.setItem(key, JSON.stringify(draft));
    } catch (e) {
      console.warn("Falha ao salvar rascunho de transferência no localStorage:", e);
    }
  },

  getDraft: (careerId: string, seasonId: string): PendingTransferDraft | null => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      const key = TransferDraftService.buildKey(careerId, seasonId);
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as PendingTransferDraft;
    } catch {
      return null;
    }
  },

  clearDraft: (careerId: string, seasonId: string): void => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      const key = TransferDraftService.buildKey(careerId, seasonId);
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn("Falha ao limpar rascunho de transferência no localStorage:", e);
    }
  },

  hasDraft: (careerId: string, seasonId: string): boolean => {
    return TransferDraftService.getDraft(careerId, seasonId) !== null;
  },
};

export default TransferDraftService;
