const SCROLL_DELAY_IN_MS = 150;

export const scheduleLineupSlotScroll = (targetSlotId: string): void => {
  setTimeout(() => {
    const elementToScroll = document.querySelector(
      `[data-slot-id="${targetSlotId}"]`,
    );

    elementToScroll?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, SCROLL_DELAY_IN_MS);
};
