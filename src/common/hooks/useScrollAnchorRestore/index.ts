import { useEffect, useRef } from "react";
import {
  ClickAnchorPayload,
  NavigationSessionStore,
} from "../../services/NavigationSessionStore";

/**
 * Hook reutilizável para restaurar o scroll suave até um elemento recém adicionado ou editado.
 * Consome a âncora salva em `NavigationSessionStore` (one-shot) e persiste em ref até
 * que o elemento seja encontrado no DOM e o scrollIntoView executado.
 */
export function useScrollAnchorRestore(
  viewKey: string,
  dependencies: unknown[] = [],
): void {
  const pendingAnchorRef = useRef<ClickAnchorPayload | null>(null);

  useEffect(() => {
    if (!pendingAnchorRef.current) {
      pendingAnchorRef.current =
        NavigationSessionStore.consumeClickAnchor(viewKey);
    }
    const anchor = pendingAnchorRef.current;
    if (!anchor) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const maxAttempts = 15;

    const tryScroll = () => {
      try {
        if (anchor.anchorSelector) {
          const el = document.querySelector(anchor.anchorSelector);
          if (el) {
            pendingAnchorRef.current = null;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
        } else if (anchor.scrollY > 0) {
          pendingAnchorRef.current = null;
          window.scrollTo({ top: anchor.scrollY, behavior: "smooth" });
          return;
        }
      } catch {
        // Ignora erros de sintaxe de seletores inválidos
      }

      attempts++;
      if (attempts < maxAttempts) {
        timer = setTimeout(tryScroll, 50);
      }
    };

    const rafId = requestAnimationFrame(tryScroll);

    return () => {
      cancelAnimationFrame(rafId);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey, ...dependencies]);
}
