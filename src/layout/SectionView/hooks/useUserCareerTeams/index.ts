import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ServiceMatches } from "../../../../common/services/ServiceMatches";
import { Career } from "../../../../common/interfaces/Career";

export interface UseUserCareerTeamsResult {
  teams: string[];
  isLoading: boolean;
  refreshTeams: () => Promise<void>;
}

const extractInitialTeams = (param?: Career | string[]): string[] => {
  if (!param) return [];
  if (Array.isArray(param)) return param;
  const set = new Set<string>();
  param.clubData?.forEach((s) => {
    s.teams?.forEach((t) => {
      if (t.name) set.add(t.name);
    });
  });
  return Array.from(set);
};

export const useUserCareerTeams = (
  careerOrInitialTeams?: Career | string[],
): UseUserCareerTeamsResult => {
  const initialTeams = useMemo(
    () => extractInitialTeams(careerOrInitialTeams),
    [careerOrInitialTeams],
  );

  const [teams, setTeams] = useState<string[]>(() =>
    Array.from(new Set(initialTeams)).sort(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetched = await ServiceMatches.getAllTeamsAcrossUserCareers();
      if (isMountedRef.current && fetched.length > 0) {
        setTeams((prev) =>
          Array.from(new Set([...prev, ...initialTeams, ...fetched])).sort(),
        );
      }
    } catch {
      // Ignorar erros caso esteja não autenticado ou em ambiente desconectado
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [initialTeams]);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  return { teams, isLoading, refreshTeams };
};

export default useUserCareerTeams;
