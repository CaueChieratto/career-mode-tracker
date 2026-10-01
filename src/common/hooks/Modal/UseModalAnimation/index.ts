import { useState, useRef, useEffect, useCallback } from "react";
import { lockBodyScroll } from "../../../utils/bodyScrollLock";

export const useModalAnimation = (
  isOpen: boolean,
  onCloseCallback?: () => void
) => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [translateY, setTranslateY] = useState(0);

  const lastScrollRef = useRef(0);
  const startY = useRef<number | null>(null);
  const currentTranslateY = useRef(0);
  const dragging = useRef(false);
  const unlockScrollRef = useRef<(() => void) | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlockScroll = useCallback(() => {
    unlockScrollRef.current?.();
    unlockScrollRef.current = null;
  }, []);

  useEffect(() => {
    if (isOpen) {
      lastScrollRef.current = window.scrollY;
      unlockScrollRef.current ??= lockBodyScroll();

      setVisible(true);
      setTranslateY(0);
      currentTranslateY.current = 0;
      setClosing(false);
    }

    return () => {
      unlockScroll();
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen, unlockScroll]);

  const close = () => {
    window.scrollTo({ top: lastScrollRef.current });
    unlockScroll();

    setClosing(true);

    closeTimerRef.current = setTimeout(() => {
      setVisible(false);
      if (onCloseCallback) onCloseCallback();
      closeTimerRef.current = null;
    }, 300);
  };

  const onDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    dragging.current = true;
    startY.current = "touches" in e ? e.touches[0].clientY : e.clientY;
  };

  const onDragMove = (
    e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent
  ) => {
    if (!dragging.current || startY.current === null) return;

    e.preventDefault();

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startY.current;

    if (deltaY < 0) return;

    setTranslateY(currentTranslateY.current + deltaY);
  };

  const onDragEnd = () => {
    dragging.current = false;
    currentTranslateY.current = translateY;

    if (translateY > 150) {
      close();
    } else {
      setTranslateY(0);
      currentTranslateY.current = 0;
    }
  };

  return {
    visible,
    closing,
    translateY,
    close,
    onDragStart,
    onDragMove,
    onDragEnd,
    dragging,
  };
};
