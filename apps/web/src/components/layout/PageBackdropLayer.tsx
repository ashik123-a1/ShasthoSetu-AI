import { usePreferences } from "../../lib/preferences";

export interface PageBackdropLayerProps {
  imageSrc: string;
  alt?: string;
  opacity?: number;
  mode?: "sapphire" | "adaptive";
}

/**
 * Full-bleed non-interactive atmospheric background image layer matched to each page's clinical domain.
 * Renders cleanly underneath a subtle vignette scrim while preserving full contrast on glass cards.
 */
export function PageBackdropLayer({
  imageSrc,
  alt = "",
  opacity,
  mode = "sapphire",
}: PageBackdropLayerProps) {
  const { theme } = usePreferences();
  const isDark = mode === "sapphire" || theme === "dark";
  const resolvedOpacity = opacity ?? (isDark ? 0.24 : 0.11);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      <img
        src={imageSrc}
        alt={alt}
        loading="eager"
        className="w-full h-full object-cover object-center transition-opacity duration-700"
        style={{
          opacity: resolvedOpacity,
          filter: isDark
            ? "saturate(1.18) brightness(0.88) contrast(1.06)"
            : "saturate(0.95) brightness(1.04)",
        }}
      />
      {isDark ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 22% 18%, rgba(56, 189, 248, 0.14), transparent 46%), radial-gradient(circle at 80% 72%, rgba(45, 212, 191, 0.11), transparent 46%), linear-gradient(180deg, rgba(4, 9, 20, 0.82) 0%, rgba(4, 9, 20, 0.56) 46%, rgba(4, 9, 20, 0.94) 100%)",
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(234, 241, 251, 0.86) 0%, rgba(247, 250, 255, 0.72) 48%, rgba(234, 241, 251, 0.92) 100%)",
          }}
        />
      )}
    </div>
  );
}
