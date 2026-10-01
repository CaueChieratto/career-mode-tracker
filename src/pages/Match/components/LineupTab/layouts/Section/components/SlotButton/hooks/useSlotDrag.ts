import { useState, useRef, useEffect, useCallback } from "react";
import { lockBodyScroll } from "../../../../../../../../../common/utils/bodyScrollLock";

type UseSlotDragProps = {
  slotId: string;
  onSwap: (targetId: string) => void;
  onOpen: () => void;
  disabled?: boolean;
};

export const useSlotDrag = ({
  slotId,
  onSwap,
  onOpen,
  disabled,
}: UseSlotDragProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const wasDraggedRef = useRef(false);
  const unlockScrollRef = useRef<(() => void) | null>(null);

  const unlockScroll = useCallback(() => {
    unlockScrollRef.current?.();
    unlockScrollRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
      if (disabled) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" &&
        target.className.includes("slot_remove")
      )
        return;
      if (e.button !== 0 && e.pointerType === "mouse") return;

      startPosRef.current = { x: e.clientX, y: e.clientY };

      timerRef.current = setTimeout(() => {
        setIsDragging(true);
        setDragPos({ x: e.clientX, y: e.clientY });
        if (navigator.vibrate) navigator.vibrate(50);
        unlockScrollRef.current ??= lockBodyScroll();
      }, 100);
    },
    [disabled],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging && timerRef.current) {
        const dx = Math.abs(e.clientX - startPosRef.current.x);
        const dy = Math.abs(e.clientY - startPosRef.current.y);
        if (dx > 10 || dy > 10) clearTimer();
      }
    },
    [isDragging, clearTimer],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (e: PointerEvent) =>
      setDragPos({ x: e.clientX, y: e.clientY });

    const handleGlobalUp = (e: PointerEvent) => {
      setIsDragging(false);
      wasDraggedRef.current = true;
      unlockScroll();

      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      const targetSlot = elUnder?.closest("[data-slot-id]");

      if (targetSlot) {
        const targetId = targetSlot.getAttribute("data-slot-id");
        if (targetId && targetId !== slotId) {
          onSwap(targetId);
        }
      }
      setTimeout(() => {
        wasDraggedRef.current = false;
      }, 100);
    };

    window.addEventListener("pointermove", handleGlobalMove);
    window.addEventListener("pointerup", handleGlobalUp);
    window.addEventListener("pointercancel", handleGlobalUp);

    return () => {
      window.removeEventListener("pointermove", handleGlobalMove);
      window.removeEventListener("pointerup", handleGlobalUp);
      window.removeEventListener("pointercancel", handleGlobalUp);
    };
  }, [isDragging, slotId, onSwap, unlockScroll]);

  useEffect(
    () => () => {
      clearTimer();
      unlockScroll();
    },
    [clearTimer, unlockScroll],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      if (wasDraggedRef.current) {
        e.preventDefault();
        return;
      }
      onOpen();
    },
    [onOpen, disabled],
  );

  return {
    isDragging,
    dragPos,
    handlePointerDown,
    handlePointerMove,
    clearTimer,
    handleClick,
  };
};
