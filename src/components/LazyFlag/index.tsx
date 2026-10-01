import React, { lazy, Suspense } from "react";

// Carregamento dinâmico de react-world-flags para isolar o pacote SVG em chunk separado
const FlagComponent = lazy(async () => {
  const mod = await import("react-world-flags");
  const Component =
    (mod as unknown as { default?: { default?: React.FC<LazyFlagProps> } })
      ?.default?.default || mod.default;
  return { default: Component as React.FC<LazyFlagProps> };
});

export interface LazyFlagProps {
  code: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  title?: string;
  alt?: string;
}

export const LazyFlag: React.FC<LazyFlagProps> = ({
  code,
  className,
  style,
  fallback,
  ...props
}) => {
  if (!code) {
    return null;
  }

  const defaultFallback = (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: style?.width || "28px",
        height: style?.height || "20px",
        borderRadius: style?.borderRadius || "4px",
        backgroundColor: "transparent",
        ...style,
      }}
      aria-hidden="true"
    />
  );

  return (
    <Suspense fallback={fallback !== undefined ? fallback : defaultFallback}>
      <FlagComponent
        code={code}
        className={className}
        style={style}
        {...props}
      />
    </Suspense>
  );
};

export default LazyFlag;
