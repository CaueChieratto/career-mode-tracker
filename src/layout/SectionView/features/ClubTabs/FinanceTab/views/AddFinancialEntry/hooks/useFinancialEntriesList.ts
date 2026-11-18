import { useState, useEffect, useCallback } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { FinancialEntry } from "../../../../../../../../common/interfaces/finance";
import { ServiceFinance } from "../../../../../../../../common/services/ServiceFinance";

export interface UseFinancialEntriesListProps {
  careerId?: string;
  seasonId?: string;
  season?: ClubData;
  career?: Career;
}

export const useFinancialEntriesList = ({
  careerId,
  seasonId,
  season,
  career,
}: UseFinancialEntriesListProps) => {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshEntries = useCallback(async () => {
    if (!careerId || !seasonId) return;
    try {
      setIsLoading(true);
      const report = await ServiceFinance.getReportBySeason(
        careerId,
        seasonId,
        season?.seasonNumber || 1,
        season,
        career,
      );
      setEntries(report.entries || []);
    } catch (err) {
      console.error("Erro ao carregar lançamentos financeiros:", err);
    } finally {
      setIsLoading(false);
    }
  }, [careerId, seasonId, season, career]);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  const addOrUpdateEntryLocal = useCallback((entry: FinancialEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [entry, ...prev];
    });
  }, []);

  const removeEntryLocal = useCallback((entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  return {
    entries,
    setEntries,
    isLoading,
    refreshEntries,
    addOrUpdateEntryLocal,
    removeEntryLocal,
  };
};

export default useFinancialEntriesList;

