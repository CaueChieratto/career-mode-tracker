import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { NavigationSessionStore } from "../../services/NavigationSessionStore";

export const classifyMacroRoute = (
  pathname: string,
): { type: "macro" | "child" | "outside"; macroKey: string | null } => {
  // 1. Temporada: /Career/:careerId/Season/:seasonId
  const seasonMatch = pathname.match(/^\/Career\/([^/]+)\/Season\/([^/]+)\/?$/i);
  if (seasonMatch) {
    return {
      type: "macro",
      macroKey: `season:${seasonMatch[1]}:${seasonMatch[2]}`,
    };
  }

  // 2. Geral: /Career/:careerId/Geral
  const geralMatch = pathname.match(/^\/Career\/([^/]+)\/Geral\/?$/i);
  if (geralMatch) {
    return {
      type: "macro",
      macroKey: `geral:${geralMatch[1]}`,
    };
  }

  // 3. GroupCareer: /CareerGroup/:groupId/Geral
  const groupMatch = pathname.match(/^\/CareerGroup\/([^/]+)\/Geral\/?$/i);
  if (groupMatch) {
    return {
      type: "macro",
      macroKey: `group:${groupMatch[1]}`,
    };
  }

  // 4. Match (rota filha transitória de Temporada/Geral/Group): /Career/:careerId/Season/:seasonId/Match/:matchesId
  const matchMatch = pathname.match(
    /^\/Career\/([^/]+)\/Season\/([^/]+)\/Match\/([^/]+)/i,
  );
  if (matchMatch) {
    return {
      type: "child",
      macroKey: `season:${matchMatch[1]}:${matchMatch[2]}`,
    };
  }

  // 5. Qualquer outra rota: fora do contexto macro
  return {
    type: "outside",
    macroKey: null,
  };
};

export const useMacroNavigationSession = () => {
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    const { type, macroKey } = classifyMacroRoute(location.pathname);
    const currentMacro = NavigationSessionStore.getMacroContext();

    if (type === "outside") {
      if (currentMacro) {
        NavigationSessionStore.clearAll();
      }
    } else if (type === "macro" && macroKey) {
      if (currentMacro !== macroKey) {
        // Mudou de temporada, entrou pela primeira vez, ou alternou temporada <-> geral
        NavigationSessionStore.clearAll();
        NavigationSessionStore.setMacroContext(macroKey);
        // Garante que a tab inicial seja Elenco (0)
        NavigationSessionStore.setTab(`club:${macroKey}`, 0);
      }
    } else if (type === "child") {
      // Entrou em /Match/:matchesId. Se não houver contexto macro, inicializa com a temporada da partida
      if (!currentMacro && macroKey) {
        NavigationSessionStore.setMacroContext(macroKey);
        NavigationSessionStore.setTab(`club:${macroKey}`, 0);
      }
    }

    prevPathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Listener global de captura de âncora de clique fora de rotas /Match/
  useEffect(() => {
    if (location.pathname.includes("/Match/")) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        "button, a, [role='button'], [data-testid], li[class*='item'], div[class*='card']",
      ) as HTMLElement | null;

      if (!interactive) return;

      const testId = interactive.getAttribute("data-testid");
      const id = interactive.id;
      let selector = "";
      if (testId) {
        selector = `[data-testid="${testId}"]`;
      } else if (id) {
        selector = `#${id}`;
      }

      const rect = interactive.getBoundingClientRect();
      const currentMacro = NavigationSessionStore.getMacroContext();
      if (currentMacro) {
        NavigationSessionStore.saveClickAnchor("last_click", {
          scrollY: window.scrollY,
          anchorSelector: selector || undefined,
          viewportOffsetTop: rect.top,
          updatedAt: Date.now(),
        });
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, [location.pathname]);
};

