import { BENCH_SLOT_PREFIX } from "../../constants/lineupSlots";

const SCROLL_DELAY_IN_MS = 150;

const EMPTY_BENCH_SLOT_SELECTOR =
  '[data-bench-add-button="true"], button[class*="empty_avatar"]';

export const scheduleLineupSlotScroll = (targetSlotId: string): void => {
  setTimeout(() => {
    const isBenchSlot = targetSlotId.startsWith(BENCH_SLOT_PREFIX);

    let elementToScroll: Element | null = null;

    if (isBenchSlot) {
      elementToScroll = document.querySelector(EMPTY_BENCH_SLOT_SELECTOR);
    }

    if (!elementToScroll) {
      elementToScroll = document.querySelector(
        `[data-slot-id="${targetSlotId}"]`,
      );
    }

    elementToScroll?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, SCROLL_DELAY_IN_MS);
};
