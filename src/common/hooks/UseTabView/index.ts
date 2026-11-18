import { useState, useRef, useEffect } from "react";
import type { Swiper as SwiperClass } from "swiper";
import { NavigationSessionStore } from "../../services/NavigationSessionStore";

export const useTabView = (
  storageKey: string,
  defaultIndex: number = 0,
) => {
  const [prevStorageKey, setPrevStorageKey] = useState(storageKey);
  const [activeIndex, setActiveIndex] = useState(() =>
    NavigationSessionStore.getTab(storageKey, defaultIndex),
  );
  const swiperRef = useRef<SwiperClass | null>(null);

  let effectiveIndex = activeIndex;
  if (prevStorageKey !== storageKey) {
    setPrevStorageKey(storageKey);
    const saved = NavigationSessionStore.getTab(storageKey, defaultIndex);
    setActiveIndex(saved);
    effectiveIndex = saved;
  }

  useEffect(() => {
    const saved = NavigationSessionStore.getTab(storageKey, defaultIndex);
    swiperRef.current?.slideTo(saved, 0);
  }, [storageKey, defaultIndex]);

  useEffect(() => {
    NavigationSessionStore.setTab(storageKey, effectiveIndex);
  }, [effectiveIndex, storageKey]);

  const handleTabClick = (index: number) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveIndex(index);
    swiperRef.current?.slideTo(index);
  };

  const handleSlideChange = (swiper: SwiperClass) => {
    setActiveIndex(swiper.activeIndex);
  };

  return { activeIndex: effectiveIndex, swiperRef, handleTabClick, handleSlideChange };
};
