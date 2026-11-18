import { useCallback, useRef, useState } from "react";
import { NavigationSessionStore } from "../../services/NavigationSessionStore";

export function useScreenStack<T>(initialScreen?: T | null) {
  const [stack, setStack] = useState<T[]>(() =>
    initialScreen ? [initialScreen] : [],
  );
  const scrollPositions = useRef<number[]>([]);

  const scrollAfterRender = (top: number) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top,
          left: 0,
          behavior: "instant",
        });
      });
    });
  };

  const push = useCallback((screen: T) => {
    scrollPositions.current.push(window.scrollY);

    setStack((prev) => {
      const top = prev[prev.length - 1];
      const topRecord = top as Record<string, unknown> | undefined;
      const screenRecord = screen as Record<string, unknown> | undefined;
      if (
        topRecord &&
        topRecord.key &&
        topRecord.key === screenRecord?.key
      ) {
        return [...prev.slice(0, -1), screen];
      }
      return [...prev, screen];
    });

    scrollAfterRender(0);
  }, []);

  const pop = useCallback(() => {
    const lastScroll = scrollPositions.current.pop() ?? 0;
    const anchor = NavigationSessionStore.consumeClickAnchor("last_click");

    setStack((prev) => prev.slice(0, -1));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (anchor?.anchorSelector) {
          const el = document.querySelector(
            anchor.anchorSelector,
          ) as HTMLElement | null;
          if (el) {
            const currentRect = el.getBoundingClientRect();
            const targetTop = Math.max(
              0,
              window.scrollY + currentRect.top - (anchor.viewportOffsetTop ?? 0),
            );
            window.scrollTo({
              top: targetTop,
              left: 0,
              behavior: "instant",
            });
            return;
          }
        }
        window.scrollTo({
          top: anchor?.scrollY ?? lastScroll,
          left: 0,
          behavior: "instant",
        });
      });
    });
  }, []);

  const reset = useCallback(() => {
    setStack([]);
    scrollPositions.current = [];

    scrollAfterRender(0);
  }, []);

  return {
    current: stack[stack.length - 1] ?? null,
    stack,
    push,
    pop,
    reset,
  };
}

