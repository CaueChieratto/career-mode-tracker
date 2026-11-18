export interface ClickAnchorSnapshot {
  scrollY: number;
  anchorSelector?: string;
  viewportOffsetTop?: number;
  updatedAt: number;
}

export type ClickAnchorPayload = ClickAnchorSnapshot;

export interface AllMatchesTabFilters {
  activeTab?: string;
  selectedMonth?: string;
  selectedSeason?: string;
}

const PREFIX = "cmt_nav_v1:";

export const NavigationSessionStore = {
  // 1. Contexto Macro
  getMacroContext: (): string | null => {
    try {
      return sessionStorage.getItem(`${PREFIX}macro_context`);
    } catch {
      return null;
    }
  },

  setMacroContext: (context: string): void => {
    try {
      sessionStorage.setItem(`${PREFIX}macro_context`, context);
    } catch (err) {
      console.warn("Erro ao salvar macro context:", err);
    }
  },

  clearAll: (): void => {
    try {
      // 1. Limpa todas as chaves do NavigationSessionStore e legadas no sessionStorage
      const allSessionKeys = Object.keys(sessionStorage);
      const sessionKeysToRemove = allSessionKeys.filter(
        (key) =>
          key.startsWith(PREFIX) ||
          key.startsWith("season") ||
          key.startsWith("geral") ||
          key.startsWith("player") ||
          key.startsWith("match") ||
          key.startsWith("group") ||
          key.startsWith("manage_clauses"),
      );
      for (const k of sessionKeysToRemove) {
        sessionStorage.removeItem(k);
      }

      // 2. Limpa resíduos legados em localStorage de filtros de matches
      const localKeysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("matchActiveTab_") ||
            key.startsWith("matchSelectedMonth_") ||
            key.startsWith("matchSelectedSeason_") ||
            key.startsWith("cmt_nav_"))
        ) {
          localKeysToRemove.push(key);
        }
      }
      for (const k of localKeysToRemove) {
        localStorage.removeItem(k);
      }
    } catch (err) {
      console.warn("Erro ao limpar NavigationSessionStore:", err);
    }
  },

  // 2. Tabs Numéricas (Swiper / SectionView)
  getTab: (key: string, defaultValue: number = 0): number => {
    try {
      const stored = sessionStorage.getItem(`${PREFIX}tab:${key}`);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      // Fallback para chave direta legada se houver
      const legacy = sessionStorage.getItem(key);
      if (legacy !== null) {
        const parsed = parseInt(legacy, 10);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  },

  setTab: (key: string, value: number): void => {
    try {
      sessionStorage.setItem(`${PREFIX}tab:${key}`, String(value));
      sessionStorage.setItem(key, String(value));
    } catch (err) {
      console.warn("Erro ao salvar tab:", err);
    }
  },

  // 3. Tab de Cláusulas (ManageClauses)
  getClausesTab: (defaultValue: string = "renewals"): string => {
    try {
      const macro = NavigationSessionStore.getMacroContext() || "default";
      return (
        sessionStorage.getItem(`${PREFIX}clauses_tab:${macro}`) || defaultValue
      );
    } catch {
      return defaultValue;
    }
  },

  setClausesTab: (tab: string): void => {
    try {
      const macro = NavigationSessionStore.getMacroContext() || "default";
      sessionStorage.setItem(`${PREFIX}clauses_tab:${macro}`, tab);
    } catch (err) {
      console.warn("Erro ao salvar clauses tab:", err);
    }
  },

  // 4. Tab Individualizada por Partida (Match)
  getMatchTab: (matchesId: string, defaultValue: number = 0): number => {
    try {
      const macro = NavigationSessionStore.getMacroContext() || "default";
      const stored = sessionStorage.getItem(`${PREFIX}match_tab:${macro}:${matchesId}`);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  },

  setMatchTab: (matchesId: string, tab: number): void => {
    try {
      const macro = NavigationSessionStore.getMacroContext() || "default";
      sessionStorage.setItem(
        `${PREFIX}match_tab:${macro}:${matchesId}`,
        String(tab),
      );
    } catch (err) {
      console.warn("Erro ao salvar match tab:", err);
    }
  },

  // 5. Filtros de AllMatchesTab
  getAllMatchesFilters: (scopeKey: string): AllMatchesTabFilters | null => {
    try {
      const macro = NavigationSessionStore.getMacroContext() || "default";
      const raw = sessionStorage.getItem(`${PREFIX}all_matches:${macro}:${scopeKey}`);
      if (raw) {
        return JSON.parse(raw);
      }
      return null;
    } catch {
      return null;
    }
  },

  setAllMatchesFilters: (
    scopeKey: string,
    filters: AllMatchesTabFilters,
  ): void => {
    try {
      const macro = NavigationSessionStore.getMacroContext() || "default";
      sessionStorage.setItem(
        `${PREFIX}all_matches:${macro}:${scopeKey}`,
        JSON.stringify(filters),
      );
    } catch (err) {
      console.warn("Erro ao salvar all matches filters:", err);
    }
  },

  // 6. Âncora de Clique e Scroll
  saveClickAnchor: (viewKey: string, snapshot: ClickAnchorSnapshot): void => {
    try {
      const macro = NavigationSessionStore.getMacroContext() || "default";
      sessionStorage.setItem(
        `${PREFIX}anchor:${macro}:${viewKey}`,
        JSON.stringify(snapshot),
      );
    } catch (err) {
      console.warn("Erro ao salvar click anchor:", err);
    }
  },

  getClickAnchor: (viewKey: string): ClickAnchorSnapshot | null => {
    try {
      const macro = NavigationSessionStore.getMacroContext() || "default";
      const raw = sessionStorage.getItem(`${PREFIX}anchor:${macro}:${viewKey}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  peekClickAnchor: (viewKey: string): ClickAnchorSnapshot | null => {
    return NavigationSessionStore.getClickAnchor(viewKey);
  },

  consumeClickAnchor: (viewKey: string): ClickAnchorSnapshot | null => {
    try {
      const macro = NavigationSessionStore.getMacroContext() || "default";
      const key = `${PREFIX}anchor:${macro}:${viewKey}`;
      const raw = sessionStorage.getItem(key);
      if (raw) {
        sessionStorage.removeItem(key);
        return JSON.parse(raw);
      }
      return null;
    } catch {
      return null;
    }
  },

  // 7. Screen Stack Transitório (ida/volta de /Match/:matchesId)
  saveScreenStack: (macroContext: string, stack: unknown[]): void => {
    try {
      sessionStorage.setItem(
        `${PREFIX}screen_stack:${macroContext}`,
        JSON.stringify(stack),
      );
    } catch (err) {
      console.warn("Erro ao salvar screen stack:", err);
    }
  },

  getScreenStack: (macroContext: string): unknown[] | null => {
    try {
      const raw = sessionStorage.getItem(`${PREFIX}screen_stack:${macroContext}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clearScreenStack: (macroContext: string): void => {
    try {
      sessionStorage.removeItem(`${PREFIX}screen_stack:${macroContext}`);
    } catch (err) {
      console.warn("Erro ao limpar screen stack:", err);
    }
  },
};

