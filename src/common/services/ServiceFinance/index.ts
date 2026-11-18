import { v4 as uuidv4 } from "uuid";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../Firebase";
import { Career } from "../../interfaces/Career";
import { ClubData } from "../../interfaces/club/clubData";
import {
  FinancialEntry,
  FinancialTotals,
  SeasonFinancialReport,
} from "../../interfaces/finance";
import { sanitizeFirestoreData } from "../../utils/sanitizeFirestore";
import { reconcileSeasonFinancialEntries } from "./reconciliation";

const getStorageKeyReport = (careerId: string, seasonId: string) =>
  `finance_report_${careerId}_${seasonId}`;

const getStorageKeyCategories = (careerId: string) =>
  `finance_categories_${careerId}`;

const getStorageKeyGroupCategories = (groupId: string) =>
  `finance_categories_group_${groupId}`;

const mergeUniqueCategories = (a: string[] = [], b: string[] = []): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];
  [...a, ...b].forEach((item) => {
    const trimmed = item?.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      merged.push(trimmed);
    }
  });
  return merged;
};


const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (typeof localStorage !== "undefined") {
        return localStorage.getItem(key);
      }
    } catch {
      // ignore
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
    } catch {
      // ignore
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  },
};

const notifyFinanceReportUpdated = (careerId: string, seasonId: string): void => {
  try {
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("finance-report-updated", {
          detail: { careerId, seasonId },
        }),
      );
    }
  } catch {
    // ignore
  }
};

export const ServiceFinance = {
  calculateTotals(entries: FinancialEntry[] = []): FinancialTotals {
    const totalRevenue = entries
      .filter((e) => e.type === "revenue")
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalExpense = entries
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const netBalance = totalRevenue - totalExpense;
    const totalMovement = totalRevenue + totalExpense;

    const revenuePercentage =
      totalMovement > 0 ? (totalRevenue / totalMovement) * 100 : 0;
    const expensePercentage =
      totalMovement > 0 ? (totalExpense / totalMovement) * 100 : 0;

    return {
      totalRevenue,
      totalExpense,
      netBalance,
      totalMovement,
      revenuePercentage,
      expensePercentage,
    };
  },

  async getCustomCategories(
    careerId: string,
    groupId?: string | null,
  ): Promise<{ revenues: string[]; expenses: string[] }> {
    const defaultResult: { revenues: string[]; expenses: string[] } = {
      revenues: [],
      expenses: [],
    };
    if (!careerId) return defaultResult;

    let localCareer = defaultResult;
    try {
      const localData = safeLocalStorage.getItem(getStorageKeyCategories(careerId));
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed && (parsed.revenues || parsed.expenses)) {
          localCareer = {
            revenues: parsed.revenues || [],
            expenses: parsed.expenses || [],
          };
        }
      }
    } catch {
      // Ignora erro no localStorage
    }

    let localGroup = defaultResult;
    if (groupId) {
      try {
        const groupData = safeLocalStorage.getItem(
          getStorageKeyGroupCategories(groupId),
        );
        if (groupData) {
          const parsed = JSON.parse(groupData);
          if (parsed && (parsed.revenues || parsed.expenses)) {
            localGroup = {
              revenues: parsed.revenues || [],
              expenses: parsed.expenses || [],
            };
          }
        }
      } catch {
        // Ignora erro no localStorage
      }
    }

    let mergedRevenues = mergeUniqueCategories(
      localCareer.revenues,
      localGroup.revenues,
    );
    let mergedExpenses = mergeUniqueCategories(
      localCareer.expenses,
      localGroup.expenses,
    );

    const user = auth.currentUser;
    if (!user) {
      return { revenues: mergedRevenues, expenses: mergedExpenses };
    }

    let firestoreCareer = defaultResult;
    try {
      const categoriesDocRef = doc(
        db,
        `users/${user.uid}/careers/${careerId}/finance/categories`,
      );
      const snapshot = await getDoc(categoriesDocRef);
      if (snapshot?.exists?.()) {
        const data = snapshot.data() as {
          revenues?: string[];
          expenses?: string[];
        };
        firestoreCareer = {
          revenues: data.revenues || [],
          expenses: data.expenses || [],
        };
        safeLocalStorage.setItem(
          getStorageKeyCategories(careerId),
          JSON.stringify(firestoreCareer),
        );
      }
    } catch {
      // Fallback silencioso
    }

    let firestoreGroup = defaultResult;
    if (groupId) {
      try {
        const groupRef = doc(db, `users/${user.uid}/careerGroups/${groupId}`);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap?.exists?.()) {
          const groupData = groupSnap.data() as {
            financeCategories?: { revenues?: string[]; expenses?: string[] };
          };
          if (groupData.financeCategories) {
            firestoreGroup = {
              revenues: groupData.financeCategories.revenues || [],
              expenses: groupData.financeCategories.expenses || [],
            };
            safeLocalStorage.setItem(
              getStorageKeyGroupCategories(groupId),
              JSON.stringify(firestoreGroup),
            );
          }
        }
      } catch {
        // Fallback silencioso
      }
    }

    mergedRevenues = mergeUniqueCategories(
      mergedRevenues,
      mergeUniqueCategories(firestoreCareer.revenues, firestoreGroup.revenues),
    );
    mergedExpenses = mergeUniqueCategories(
      mergedExpenses,
      mergeUniqueCategories(firestoreCareer.expenses, firestoreGroup.expenses),
    );

    return { revenues: mergedRevenues, expenses: mergedExpenses };
  },

  async saveCustomCategory(
    careerId: string,
    type: "revenue" | "expense",
    category: string,
    notSeason?: boolean,
    groupId?: string | null,
  ): Promise<void> {
    if (notSeason) {
      throw new Error(
        "Mutações financeiras não são permitidas no modo somente leitura (Geral).",
      );
    }

    const trimmed = category.trim();
    if (!trimmed) return;

    const current = await this.getCustomCategories(careerId, groupId);
    const key = type === "revenue" ? "revenues" : "expenses";

    const updatedCareerCategories = {
      ...current,
      [key]: mergeUniqueCategories(current[key], [trimmed]),
    };

    safeLocalStorage.setItem(
      getStorageKeyCategories(careerId),
      JSON.stringify(updatedCareerCategories),
    );

    const user = auth.currentUser;
    if (user) {
      try {
        const categoriesDocRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/finance/categories`,
        );
        await setDoc(
          categoriesDocRef,
          sanitizeFirestoreData(updatedCareerCategories),
          {
            merge: true,
          },
        );
      } catch (error) {
        console.error(
          "Erro ao salvar categoria customizada no Firestore:",
          error,
        );
      }
    }

    if (groupId) {
      const updatedGroupCategories = {
        ...current,
        [key]: mergeUniqueCategories(current[key], [trimmed]),
      };

      safeLocalStorage.setItem(
        getStorageKeyGroupCategories(groupId),
        JSON.stringify(updatedGroupCategories),
      );

      if (user) {
        try {
          const groupRef = doc(db, `users/${user.uid}/careerGroups/${groupId}`);
          await setDoc(
            groupRef,
            sanitizeFirestoreData({
              financeCategories: updatedGroupCategories,
              updatedAt: Date.now(),
            }),
            { merge: true },
          );
        } catch (error) {
          console.error("Erro ao salvar categoria no grupo Firestore:", error);
        }
      }
    }
  },

  async getReportBySeason(
    careerId: string,
    seasonId: string,
    seasonNumber: number = 1,
    season?: ClubData,
    career?: Career | { createdAt?: Date | string | null; nation?: string | null },
  ): Promise<SeasonFinancialReport> {
    const fallbackReport: SeasonFinancialReport = {
      seasonId,
      seasonNumber,
      entries: [],
    };

    if (!careerId || !seasonId) return fallbackReport;

    let baseReport = fallbackReport;

    // Ler do localStorage
    try {
      const localData = safeLocalStorage.getItem(
        getStorageKeyReport(careerId, seasonId),
      );
      if (localData) {
        const parsed = JSON.parse(localData) as SeasonFinancialReport;
        if (parsed && Array.isArray(parsed.entries)) {
          baseReport = parsed;
        }
      }
    } catch {
      // Ignora erro
    }

    const user = auth.currentUser;
    if (user && baseReport.entries.length === 0) {
      try {
        const reportDocRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/finance/report`,
        );
        const snapshot = await getDoc(reportDocRef);
        if (snapshot?.exists?.()) {
          const firestoreData = snapshot.data() as SeasonFinancialReport;
          if (firestoreData && Array.isArray(firestoreData.entries)) {
            baseReport = firestoreData;
            safeLocalStorage.setItem(
              getStorageKeyReport(careerId, seasonId),
              JSON.stringify(baseReport),
            );
          }
        }
      } catch (error) {
        console.error("Erro ao carregar relatório financeiro do Firestore:", error);
      }
    }

    // Se a temporada for fornecida com jogadores ou partidas, reconcilia deterministicamente
    if (season && (Array.isArray(season.players) || Array.isArray(season.matches))) {
      const reconciledEntries = reconcileSeasonFinancialEntries(
        season,
        baseReport.entries || [],
        career,
      );
      baseReport = {
        ...baseReport,
        entries: reconciledEntries,
      };
      try {
        safeLocalStorage.setItem(
          getStorageKeyReport(careerId, seasonId),
          JSON.stringify(baseReport),
        );
      } catch {
        // Ignora erro
      }
    }

    return baseReport;
  },

  async getConsolidatedReport(career: Career): Promise<SeasonFinancialReport> {
    const allEntries: FinancialEntry[] = [];

    if (!career || !career.clubData) {
      return {
        seasonId: "geral",
        seasonNumber: 0,
        entries: [],
      };
    }

    for (const season of career.clubData) {
      const report = await this.getReportBySeason(
        career.id,
        season.id,
        season.seasonNumber,
        season,
        career,
      );

      if (
        season.financialReport?.entries &&
        season.financialReport.entries.length > 0
      ) {
        const mergedMap = new Map<string, FinancialEntry>();
        for (const entry of season.financialReport.entries) {
          mergedMap.set(entry.id, entry);
        }
        for (const entry of report?.entries || []) {
          mergedMap.set(entry.id, entry);
        }
        const reconciled = reconcileSeasonFinancialEntries(
          season,
          Array.from(mergedMap.values()),
          career,
        );
        allEntries.push(...reconciled);
        continue;
      }

      if (report?.entries) {
        allEntries.push(...report.entries);
      }
    }

    return {
      seasonId: "geral",
      seasonNumber: 0,
      entries: allEntries,
    };
  },

  async syncReconciledReport(
    careerId: string,
    seasonId: string,
    season: ClubData,
    notSeason?: boolean,
    career?: Career | { createdAt?: Date | string | null; nation?: string | null },
  ): Promise<SeasonFinancialReport> {
    if (notSeason || seasonId === "geral") {
      return {
        seasonId,
        seasonNumber: season?.seasonNumber || 1,
        entries: [],
      };
    }

    const currentReport = await this.getReportBySeason(
      careerId,
      seasonId,
      season.seasonNumber,
      season,
      career,
    );

    const reconciledEntries = reconcileSeasonFinancialEntries(
      season,
      currentReport.entries || [],
      career,
    );

    const updatedReport: SeasonFinancialReport = {
      ...currentReport,
      entries: reconciledEntries,
    };

    safeLocalStorage.setItem(
      getStorageKeyReport(careerId, seasonId),
      JSON.stringify(updatedReport),
    );

    const user = auth.currentUser;
    if (user) {
      try {
        const reportDocRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/finance/report`,
        );
        await setDoc(reportDocRef, sanitizeFirestoreData(updatedReport), {
          merge: true,
        });
      } catch (error) {
        console.error("Erro ao sincronizar relatório financeiro:", error);
      }
    }

    return updatedReport;
  },

  async addEntry(
    careerId: string,
    seasonId: string,
    entry: Omit<FinancialEntry, "id"> & { id?: string },
    notSeason?: boolean,
    groupId?: string | null,
  ): Promise<FinancialEntry> {
    if (notSeason || seasonId === "geral") {
      throw new Error(
        "Mutações financeiras não são permitidas no modo somente leitura (Geral).",
      );
    }

    const currentReport = await this.getReportBySeason(careerId, seasonId);

    const description = entry.description?.trim();
    const newEntry: FinancialEntry = {
      id: entry.id || uuidv4(),
      type: entry.type,
      category: entry.category.trim(),
      amount: Math.round(Number(entry.amount) || 0),
      isAutomatic: Boolean(entry.isAutomatic),
      ...(entry.date ? { date: entry.date } : {}),
      ...(description ? { description } : {}),
      ...(entry.source ? { source: entry.source } : {}),
      ...(entry.sourceId ? { sourceId: entry.sourceId } : {}),
      ...(entry.transferDirection
        ? { transferDirection: entry.transferDirection }
        : {}),
      ...(entry.contractIndex !== undefined
        ? { contractIndex: entry.contractIndex }
        : {}),
      ...(entry.clauseType ? { clauseType: entry.clauseType } : {}),
      ...(entry.calculatedAmount !== undefined
        ? { calculatedAmount: entry.calculatedAmount }
        : {}),
      ...(entry.manualAdjustment !== undefined
        ? { manualAdjustment: entry.manualAdjustment }
        : {}),
      ...(entry.lastProcessedDate !== undefined
        ? { lastProcessedDate: entry.lastProcessedDate }
        : {}),
    };

    const existingIndex = currentReport.entries.findIndex(
      (e) => e.id === newEntry.id,
    );
    let updatedEntries: FinancialEntry[];
    if (existingIndex >= 0) {
      updatedEntries = [...currentReport.entries];
      updatedEntries[existingIndex] = newEntry;
    } else {
      updatedEntries = [...currentReport.entries, newEntry];
    }

    const updatedReport: SeasonFinancialReport = {
      ...currentReport,
      entries: updatedEntries,
    };

    safeLocalStorage.setItem(
      getStorageKeyReport(careerId, seasonId),
      JSON.stringify(updatedReport),
    );

    // Salvar categoria no escopo da carreira e do grupo (se houver)
    await this.saveCustomCategory(
      careerId,
      newEntry.type,
      newEntry.category,
      notSeason,
      groupId,
    );

    const user = auth.currentUser;
    if (user) {
      try {
        const reportDocRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/finance/report`,
        );
        await setDoc(reportDocRef, sanitizeFirestoreData(updatedReport), {
          merge: true,
        });
      } catch (error) {
        console.error("Erro ao salvar lançamento no Firestore:", error);
      }
    }

    notifyFinanceReportUpdated(careerId, seasonId);

    return newEntry;
  },

  async updateEntry(
    careerId: string,
    seasonId: string,
    entryId: string,
    updatedData: Partial<Omit<FinancialEntry, "id">>,
    notSeason?: boolean,
    groupId?: string | null,
  ): Promise<FinancialEntry> {
    if (notSeason || seasonId === "geral") {
      throw new Error(
        "Mutações financeiras não são permitidas no modo somente leitura (Geral).",
      );
    }

    const currentReport = await this.getReportBySeason(careerId, seasonId);
    const entryIndex = currentReport.entries.findIndex((e) => e.id === entryId);

    if (entryIndex === -1) {
      throw new Error("Lançamento financeiro não encontrado.");
    }

    const currentEntry = currentReport.entries[entryIndex];
    const isSalaryEntry =
      currentEntry.source === "salary" ||
      currentEntry.id.startsWith("salary_");

    if (
      !isSalaryEntry &&
      (currentEntry.isAutomatic ||
        currentEntry.source === "transfer" ||
        currentEntry.source === "clause")
    ) {
      throw new Error(
        "Lançamentos de transferências e cláusulas só podem ser editados em suas respectivas telas operacionais.",
      );
    }

    const baseCalculatedAmount =
      currentEntry.calculatedAmount !== undefined
        ? currentEntry.calculatedAmount
        : currentEntry.amount - (currentEntry.manualAdjustment || 0);
    const newTotalAmount = Math.round(
      Number(updatedData.amount ?? currentEntry.amount) || 0,
    );
    const newManualAdjustment = newTotalAmount - baseCalculatedAmount;

    const updatedEntry: FinancialEntry = isSalaryEntry
      ? {
          ...currentEntry,
          type: "expense",
          category: "Salários de atletas",
          amount: newTotalAmount,
          calculatedAmount: baseCalculatedAmount,
          manualAdjustment: newManualAdjustment,
          isAutomatic: true,
          source: "salary",
        }
      : {
          ...currentEntry,
          ...updatedData,
          amount: Math.round(
            Number(updatedData.amount ?? currentEntry.amount) || 0,
          ),
          category: (updatedData.category ?? currentEntry.category).trim(),
          type: updatedData.type ?? currentEntry.type,
          ...(updatedData.description !== undefined
            ? { description: updatedData.description?.trim() }
            : {}),
          ...(updatedData.date !== undefined ? { date: updatedData.date } : {}),
        };

    const updatedEntries = [...currentReport.entries];
    updatedEntries[entryIndex] = updatedEntry;

    const updatedReport: SeasonFinancialReport = {
      ...currentReport,
      entries: updatedEntries,
    };

    safeLocalStorage.setItem(
      getStorageKeyReport(careerId, seasonId),
      JSON.stringify(updatedReport),
    );

    if (updatedEntry.category) {
      await this.saveCustomCategory(
        careerId,
        updatedEntry.type,
        updatedEntry.category,
        notSeason,
        groupId,
      );
    }

    const user = auth.currentUser;
    if (user) {
      try {
        const reportDocRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/finance/report`,
        );
        await setDoc(reportDocRef, sanitizeFirestoreData(updatedReport), {
          merge: true,
        });
      } catch (error) {
        console.error("Erro ao atualizar lançamento no Firestore:", error);
      }
    }

    notifyFinanceReportUpdated(careerId, seasonId);

    return updatedEntry;
  },

  async deleteEntry(
    careerId: string,
    seasonId: string,
    entryId: string,
    notSeason?: boolean,
  ): Promise<void> {
    if (notSeason || seasonId === "geral") {
      throw new Error(
        "Mutações financeiras não são permitidas no modo somente leitura (Geral).",
      );
    }

    const currentReport = await this.getReportBySeason(careerId, seasonId);
    const targetEntry = currentReport.entries.find((e) => e.id === entryId);

    if (
      targetEntry?.source === "salary" ||
      entryId.startsWith("salary_")
    ) {
      throw new Error(
        "A despesa automática de salários não pode ser excluída.",
      );
    }

    const updatedEntries = currentReport.entries.filter((e) => e.id !== entryId);

    if (updatedEntries.length === currentReport.entries.length) {
      return;
    }

    const updatedReport: SeasonFinancialReport = {
      ...currentReport,
      entries: updatedEntries,
    };

    safeLocalStorage.setItem(
      getStorageKeyReport(careerId, seasonId),
      JSON.stringify(updatedReport),
    );

    const user = auth.currentUser;
    if (user) {
      try {
        const reportDocRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/finance/report`,
        );
        await setDoc(reportDocRef, sanitizeFirestoreData(updatedReport), {
          merge: true,
        });
      } catch (error) {
        console.error("Erro ao excluir lançamento no Firestore:", error);
      }
    }

    notifyFinanceReportUpdated(careerId, seasonId);
  },
};
