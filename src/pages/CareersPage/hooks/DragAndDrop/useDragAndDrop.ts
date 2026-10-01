import { useState, useRef, useEffect, useCallback } from "react";
import { Career } from "../../../../common/interfaces/Career";
import { lockBodyScroll } from "../../../../common/utils/bodyScrollLock";

const preventTouchScroll = (e: TouchEvent) => {
  e.preventDefault();
};

export const useDragAndDrop = (
  onDropSuccess: (sourceId: string, targetId: string) => void,
) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<Career | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const dragInfoRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const overIdRef = useRef<string | null>(null);

  const pointerPosRef = useRef({ x: 0, y: 0 });
  const scrollSpeedRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const unlockScrollRef = useRef<(() => void) | null>(null);

  const unlockScroll = () => {
    unlockScrollRef.current?.();
    unlockScrollRef.current = null;
  };

  const updateDropTarget = useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    const dropEl = el?.closest("[data-drop-id]");
    const id = dropEl?.getAttribute("data-drop-id") ?? null;

    const finalId = id && id !== dragInfoRef.current?.id ? id : null;

    if (overIdRef.current !== finalId) {
      overIdRef.current = finalId;
      setOverId(finalId);
    }
  }, []);

  const autoScrollLoop = useCallback(() => {
    if (scrollSpeedRef.current !== 0) {
      window.scrollBy(0, scrollSpeedRef.current);

      updateDropTarget(pointerPosRef.current.x, pointerPosRef.current.y);

      scrollFrameRef.current = requestAnimationFrame(autoScrollLoop);
    } else {
      scrollFrameRef.current = null;
    }
  }, [updateDropTarget]);

  const handleDragStart = (
    params: {
      element: HTMLElement;
      clientX: number;
      clientY: number;
      pointerId: number;
    },
    career: Career,
  ) => {
    const rect = params.element.getBoundingClientRect();
    dragInfoRef.current = {
      id: career.id,
      offsetX: params.clientX - rect.left,
      offsetY: params.clientY - rect.top,
    };

    setDragId(career.id);
    setDragSource(career);
    setDragPos({ x: params.clientX, y: params.clientY });
    pointerPosRef.current = { x: params.clientX, y: params.clientY };

    try {
      params.element.setPointerCapture(params.pointerId);
    } catch (error) {
      console.debug("Pointer capture not supported", error);
    }

    unlockScrollRef.current ??= lockBodyScroll();
    document.body.style.touchAction = "none";

    window.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });
    window.addEventListener("pointermove", handleDragMove, { passive: false });
    window.addEventListener("pointerup", handleDragEnd);
  };

  const handleDragMove = (e: PointerEvent) => {
    if (!dragInfoRef.current) return;
    if (e.cancelable) e.preventDefault();

    const x = e.clientX;
    const y = e.clientY;

    setDragPos({ x, y });
    pointerPosRef.current = { x, y };

    updateDropTarget(x, y);

    const edgeThreshold = 120;
    const maxSpeed = 16;

    if (y < edgeThreshold) {
      const intensity = (edgeThreshold - y) / edgeThreshold;
      scrollSpeedRef.current = -(intensity * maxSpeed);
    } else if (y > window.innerHeight - edgeThreshold) {
      const distanceFromEdge = window.innerHeight - y;
      const intensity = (edgeThreshold - distanceFromEdge) / edgeThreshold;
      scrollSpeedRef.current = intensity * maxSpeed;
    } else {
      scrollSpeedRef.current = 0;
    }

    if (scrollSpeedRef.current !== 0 && !scrollFrameRef.current) {
      scrollFrameRef.current = requestAnimationFrame(autoScrollLoop);
    }
  };

  const handleDragEnd = () => {
    unlockScroll();
    document.body.style.touchAction = "";

    window.removeEventListener("touchmove", preventTouchScroll);
    window.removeEventListener("pointermove", handleDragMove);
    window.removeEventListener("pointerup", handleDragEnd);

    scrollSpeedRef.current = 0;
    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }

    const info = dragInfoRef.current;
    const targetId = overIdRef.current;

    if (info && targetId) {
      onDropSuccess(info.id, targetId);
    }

    dragInfoRef.current = null;
    overIdRef.current = null;
    setDragId(null);
    setDragSource(null);
    setDragPos(null);
    setOverId(null);
  };

  useEffect(() => {
    return () => {
      unlockScroll();
      document.body.style.touchAction = "";
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
      window.removeEventListener("touchmove", preventTouchScroll);
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    dragId,
    dragSource,
    dragPos,
    overId,
    dragInfoRef,
    handleDragStart,
  };
};
