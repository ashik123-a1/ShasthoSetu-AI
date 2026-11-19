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
  const resolvedOpacity = opacity ?? (isDark ? 0.44 : 0.22);

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
            ? "saturate(1.16) brightness(0.95) contrast(1.06)"
            : "saturate(0.96) brightness(1.02)",
        }}
      />
      {isDark ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 18%, rgba(56, 189, 248, 0.12), transparent 46%), radial-gradient(circle at 82% 74%, rgba(45, 212, 191, 0.10), transparent 46%), linear-gradient(180deg, rgba(4, 9, 20, 0.64) 0%, rgba(4, 9, 20, 0.38) 46%, rgba(4, 9, 20, 0.74) 100%)",
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(234, 241, 251, 0.76) 0%, rgba(247, 250, 255, 0.58) 48%, rgba(234, 241, 251, 0.82) 100%)",
          }}
        />
      )}
    </div>
  );
}
