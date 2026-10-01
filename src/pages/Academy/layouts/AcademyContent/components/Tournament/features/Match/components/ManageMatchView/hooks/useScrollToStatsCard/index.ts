import { useEffect, useRef } from "react";

const STATS_SCROLL_DELAY = 160;
const STATS_SCROLL_OFFSET = 88;

export const useScrollToStatsCard = (selectedPlayerId: string | null) => {
  const statsCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedPlayerId) return;

    let animationFrame: number | undefined;
    const timeout = window.setTimeout(() => {
      animationFrame = window.requestAnimationFrame(() => {
        const statsCard = statsCardRef.current;
        if (!statsCard) return;

        const top = Math.max(
          0,
          statsCard.getBoundingClientRect().top +
            window.scrollY -
            STATS_SCROLL_OFFSET,
        );

        window.scrollTo({ top, behavior: "smooth" });
      });
    }, STATS_SCROLL_DELAY);

    return () => {
      window.clearTimeout(timeout);
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [selectedPlayerId]);

  return statsCardRef;
};
