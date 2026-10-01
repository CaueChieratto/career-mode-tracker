// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollToStatsCard } from "../pages/Academy/layouts/AcademyContent/components/Tournament/features/Match/components/ManageMatchView/hooks/useScrollToStatsCard";

type StatsCardHarnessProps = {
  selectedPlayerId: string | null;
  typingValue?: string;
};

const StatsCardHarness = ({
  selectedPlayerId,
  typingValue,
}: StatsCardHarnessProps) => {
  const statsCardRef = useScrollToStatsCard(selectedPlayerId);

  return selectedPlayerId ? (
    <div ref={statsCardRef} data-testid="stats-card" data-typing={typingValue} />
  ) : null;
};

const scrollTo = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("scrollTo", scrollTo);
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: 200,
  });
  scrollTo.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const setLongLineupPosition = (container: HTMLElement) => {
  const statsCard = container.querySelector<HTMLElement>("[data-testid='stats-card']")!;
  vi.spyOn(statsCard, "getBoundingClientRect").mockReturnValue({
    top: 1400,
  } as DOMRect);
};

const runStatsScroll = () => act(() => vi.advanceTimersByTime(160));

describe("academy player stats scroll", () => {
  it("scrolls to the stats header when opening a player from a long lineup", () => {
    const view = render(<StatsCardHarness selectedPlayerId="field-player" />);
    setLongLineupPosition(view.container);

    runStatsScroll();

    expect(scrollTo).toHaveBeenCalledWith({ top: 1512, behavior: "smooth" });
  });

  it("scrolls again when changing to a goalkeeper already in the mounted card", () => {
    const view = render(<StatsCardHarness selectedPlayerId="field-player" />);
    setLongLineupPosition(view.container);
    runStatsScroll();

    view.rerender(<StatsCardHarness selectedPlayerId="goalkeeper" />);
    setLongLineupPosition(view.container);
    runStatsScroll();

    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it("does not scroll while editing stats or after closing the card", () => {
    const view = render(
      <StatsCardHarness selectedPlayerId="goalkeeper" typingValue="0" />,
    );
    setLongLineupPosition(view.container);
    runStatsScroll();

    view.rerender(
      <StatsCardHarness selectedPlayerId="goalkeeper" typingValue="5" />,
    );
    runStatsScroll();
    view.rerender(<StatsCardHarness selectedPlayerId={null} />);
    runStatsScroll();

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("cancels the scheduled scroll when the card unmounts", () => {
    const view = render(<StatsCardHarness selectedPlayerId="goalkeeper" />);
    setLongLineupPosition(view.container);
    view.unmount();

    runStatsScroll();

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("runs after the workspace scroll that happens when entering the match", () => {
    const view = render(<StatsCardHarness selectedPlayerId="field-player" />);
    setLongLineupPosition(view.container);
    window.setTimeout(() => window.scrollTo({ top: 13, behavior: "smooth" }), 150);

    runStatsScroll();

    expect(scrollTo.mock.calls).toEqual([
      [{ top: 13, behavior: "smooth" }],
      [{ top: 1512, behavior: "smooth" }],
    ]);
  });
});
