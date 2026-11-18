import { useEffect, useRef, useState } from "react";
import Styles from "./OverflowText.module.css";

type OverflowTextProps = {
  text: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  direction?: "left" | "right";
  widthReference?: number;
  disableDynamicMinWidth?: boolean;
};

export const OverflowText = ({
  text,
  children,
  className = "",
  style,
  direction = "left",
  widthReference,
  disableDynamicMinWidth = false,
}: OverflowTextProps) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = textRef.current;

    if (!el || !el.parentElement) return;

    const parentWidth = widthReference ?? el.parentElement?.clientWidth ?? 0;
    const contentWidth = el.scrollWidth;

    const buffer = 15;
    const totalWidth = contentWidth + buffer;

    const isOverflow = contentWidth > parentWidth;

    setIsOverflowing(isOverflow);

    if (isOverflow) {
      const distance = totalWidth - parentWidth;

      el.style.setProperty("--scroll-distance", `${distance}px`);

      if (!disableDynamicMinWidth) {
        el.style.setProperty("--dynamic-min-width", `${totalWidth}px`);
      } else {
        el.style.removeProperty("--dynamic-min-width");
      }
    } else {
      if (!disableDynamicMinWidth) {
        el.style.setProperty("--dynamic-min-width", "100%");
      } else {
        el.style.removeProperty("--dynamic-min-width");
      }
    }
  }, [text, widthReference, disableDynamicMinWidth]);

  return (
    <span
      ref={textRef}
      style={style}
      className={`${Styles.baseOverflow} ${className} ${
        isOverflowing
          ? direction === "right"
            ? Styles.marqueeRight
            : Styles.marqueeLeft
          : ""
      }`.trim()}
    >
      {children ?? text}
    </span>
  );
};
