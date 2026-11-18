import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../Firebase";
import { TransferProposal } from "../../interfaces/proposals/transferProposal";
import {
  calculateOverallProposalStatus,
  generateProposalId,
  validateProposalDates,
  validateProposalStageRules,
  validateProposalTiming,
} from "../../helpers/proposals/proposalStatusHelper";
import { sanitizeFirestoreData } from "../../utils/sanitizeFirestore";

const getProposalDocPath = (
  uid: string,
  careerId: string,
  seasonId: string,
  proposalId: string,
) => `users/${uid}/careers/${careerId}/seasons/${seasonId}/proposals/${proposalId}`;

const getProposalsCollectionPath = (
  uid: string,
  careerId: string,
  seasonId: string,
) => `users/${uid}/careers/${careerId}/seasons/${seasonId}/proposals`;

export const ServiceProposals = {
  /**
   * Cria uma nova proposta na subcoleção de propostas da temporada.
   * Não altera nenhuma entidade em players/, finanças ou clubData.
   */
  createProposal: async (
    careerId: string,
    seasonId: string,
    proposal: Omit<TransferProposal, "id"> & { id?: string },
  ): Promise<TransferProposal> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    validateProposalStageRules(proposal);
    if (proposal.timing) {
      validateProposalTiming(proposal.timing);
    }
    validateProposalDates({
      timing: proposal.timing,
      agreementDate: proposal.agreementDate,
    });

    const proposalId = proposal.id || generateProposalId();
    const now = Date.now();
    const overallStatus =
      proposal.overallStatus || calculateOverallProposalStatus(proposal);

    const fullProposal: TransferProposal = {
      ...proposal,
      id: proposalId,
      careerId,
      seasonId,
      overallStatus,
      createdAt: proposal.createdAt || now,
      updatedAt: now,
    };

    const path = getProposalDocPath(user.uid, careerId, seasonId, proposalId);
    const proposalRef = doc(db, path);
    const sanitized = sanitizeFirestoreData(fullProposal);

    await setDoc(proposalRef, sanitized);
    return fullProposal;
  },

  /**
   * Atualiza uma proposta existente in-place.
   * Se os termos das etapas forem alterados, revalida as regras e recalcula o overallStatus.
   */
  updateProposal: async (
    careerId: string,
    seasonId: string,
    proposalId: string,
    partial: Partial<TransferProposal>,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const path = getProposalDocPath(user.uid, careerId, seasonId, proposalId);
    const proposalRef = doc(db, path);
    const snap = await getDoc(proposalRef);

    if (!snap.exists()) {
      throw new Error("Proposta não encontrada.");
    }

    const current = snap.data() as TransferProposal;
    const updated: TransferProposal = {
      ...current,
      ...partial,
      id: proposalId,
      careerId,
      seasonId,
      updatedAt: Date.now(),
    };

    validateProposalStageRules(updated);
    if (partial.timing) {
      validateProposalTiming(partial.timing);
    }
    validateProposalDates({
      timing: updated.timing,
      agreementDate: updated.agreementDate,
    });

    if (
      partial.overallStatus === undefined &&
      current.overallStatus !== "concluida"
    ) {
      updated.overallStatus = calculateOverallProposalStatus(updated);
    }

    const sanitized = sanitizeFirestoreData(updated);
    await setDoc(proposalRef, sanitized);
  },

  /**
   * Atualiza especificamente o status geral da proposta (ex: para 'concluida').
   */
  updateProposalStatus: async (
    careerId: string,
    seasonId: string,
    proposalId: string,
    overallStatus: import("../../interfaces/proposals/transferProposal").OverallProposalStatus,
  ): Promise<void> => {
    await ServiceProposals.updateProposal(careerId, seasonId, proposalId, {
      overallStatus,
    });
  },

  /**
   * Exclui permanentemente uma proposta.
   * Isolamento total: remove estritamente o documento da subcoleção proposals.
   */
  deleteProposal: async (
    careerId: string,
    seasonId: string,
    proposalId: string,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const path = getProposalDocPath(user.uid, careerId, seasonId, proposalId);
    const proposalRef = doc(db, path);
    await deleteDoc(proposalRef);
  },

  /**
   * Retorna todas as propostas da temporada ativa.
   */
  getProposalsBySeason: async (
    careerId: string,
    seasonId: string,
  ): Promise<TransferProposal[]> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const colPath = getProposalsCollectionPath(user.uid, careerId, seasonId);
    const colRef = collection(db, colPath);
    const snap = await getDocs(colRef);

    return snap?.docs
      ? snap.docs.map((docSnap) => docSnap.data() as TransferProposal)
      : [];
  },

  /**
   * Obtém uma proposta específica pelo ID.
   */
  getProposalById: async (
    careerId: string,
    seasonId: string,
    proposalId: string,
  ): Promise<TransferProposal | null> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const path = getProposalDocPath(user.uid, careerId, seasonId, proposalId);
    const proposalRef = doc(db, path);
    const snap = await getDoc(proposalRef);

    if (!snap.exists()) {
      return null;
    }
    return snap.data() as TransferProposal;
  },

  /**
   * Listener em tempo real (onSnapshot) com fail-closed e cancelamento limpo.
   */
  listenProposals: (
    careerId: string,
    seasonId: string,
    onUpdate: (proposals: TransferProposal[]) => void,
    onError?: (error: Error) => void,
  ): (() => void) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const colPath = getProposalsCollectionPath(user.uid, careerId, seasonId);
    const colRef = collection(db, colPath);

    return onSnapshot(
      colRef,
      (snapshot) => {
        const proposals = snapshot.docs.map(
          (docSnap) => docSnap.data() as TransferProposal,
        );
        onUpdate(proposals);
      },
      (error) => {
        if (onError) {
          onError(error);
        }
      },
    );
  },
};

