import type { Settings } from "@/core/settings/store/validator";
import type { CSSProperties } from "react";

export type RailBackdropId = Settings["railBackdrop"];
export type BuiltinBackdropId = Exclude<RailBackdropId, "none" | "custom">;

/**
 * The backdrops that come with the app. Drawn, not shipped as files: they are
 * gradients on the brand colour, so they follow it (and the theme) live.
 * The rail and the picker in Settings both paint from here.
 */
export const RAIL_BACKDROPS: Record<BuiltinBackdropId, { label: string; style: CSSProperties }> = {
  // Two soft lights in the brand colour, one in each far corner.
  aurora: {
    label: "Aurora",
    style: {
      backgroundImage: [
        "radial-gradient(130% 60% at 0% 0%, oklch(0.72 calc(var(--brand-chroma) * 1.1) var(--brand-hue) / 0.45), transparent 65%)",
        "radial-gradient(130% 55% at 100% 100%, oklch(0.62 var(--brand-chroma) calc(var(--brand-hue) + 45) / 0.4), transparent 62%)",
      ].join(", "),
    },
  },
  // A faint dot grid, with the brand colour rising from the foot of the rail.
  grid: {
    label: "Grid",
    style: {
      backgroundImage: [
        "radial-gradient(color-mix(in oklab, var(--foreground) 16%, transparent) 1px, transparent 1px)",
        "linear-gradient(to top, oklch(0.65 var(--brand-chroma) var(--brand-hue) / 0.35), transparent 55%)",
      ].join(", "),
      backgroundSize: "18px 18px, 100% 100%",
    },
  },
};

/** How the user's own image sits in the rail (or in a preview of it). */
export const customBackdropStyle = (url: string, fit: Settings["railBackdropFit"]): CSSProperties => ({
  backgroundImage: `url("${url}")`,
  backgroundRepeat: "no-repeat",
  ...(fit === "bottom"
    ? // Whole and as wide as the rail, standing on its foot.
      { backgroundSize: "100% auto", backgroundPosition: "center bottom" }
    : { backgroundSize: "cover", backgroundPosition: "center" }),
});
