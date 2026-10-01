// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useModalAnimation } from "../common/hooks/Modal/UseModalAnimation";
import { useSlotDrag } from "../pages/Match/components/LineupTab/layouts/Section/components/SlotButton/hooks/useSlotDrag";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "clip";
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: vi.fn(() => null),
  });
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
});

describe("ciclo de vida do bloqueio global de scroll", () => {
  it("modal abre, fecha e restaura exatamente o overflow anterior", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useModalAnimation(true, onClose));

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.classList.contains("modal-open")).toBe(true);

    act(() => result.current.close());
    expect(document.body.style.overflow).toBe("clip");
    expect(document.body.classList.contains("modal-open")).toBe(false);

    act(() => vi.advanceTimersByTime(300));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("unmount e ciclos repetidos não deixam overflow hidden", () => {
    const { rerender, unmount } = renderHook(
      ({ open }) => useModalAnimation(open),
      { initialProps: { open: true } },
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender({ open: false });
    expect(document.body.style.overflow).toBe("clip");
    rerender({ open: true });
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("clip");
  });

  it("modal aninhado mantém lock até o último dono fechar", () => {
    const first = renderHook(() => useModalAnimation(true));
    const second = renderHook(() => useModalAnimation(true));
    expect(document.body.style.overflow).toBe("hidden");

    first.unmount();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.classList.contains("modal-open")).toBe(true);

    second.unmount();
    expect(document.body.style.overflow).toBe("clip");
    expect(document.body.classList.contains("modal-open")).toBe(false);
  });

  it("drag restaura no pointerup e também no unmount", () => {
    const props = { slotId: "slot-1", onSwap: vi.fn(), onOpen: vi.fn() };
    const first = renderHook(() => useSlotDrag(props));
    act(() => {
      first.result.current.handlePointerDown({
        button: 0,
        pointerType: "touch",
        clientX: 10,
        clientY: 20,
        target: document.createElement("div"),
      } as never);
      vi.advanceTimersByTime(100);
    });
    expect(document.body.style.overflow).toBe("hidden");
    const pointerUp = new Event("pointerup");
    Object.assign(pointerUp, { clientX: 10, clientY: 20 });
    act(() => window.dispatchEvent(pointerUp));
    expect(document.body.style.overflow).toBe("clip");
    first.unmount();

    const second = renderHook(() => useSlotDrag(props));
    act(() => {
      second.result.current.handlePointerDown({
        button: 0,
        pointerType: "touch",
        clientX: 10,
        clientY: 20,
        target: document.createElement("div"),
      } as never);
      vi.advanceTimersByTime(100);
    });
    expect(document.body.style.overflow).toBe("hidden");
    second.unmount();
    expect(document.body.style.overflow).toBe("clip");
  });
});
