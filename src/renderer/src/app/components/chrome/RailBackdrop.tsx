import { loadBackdrop } from "@/core/settings/store/backdropStore";
import { useSettings } from "@/core/settings/store/SettingsContext";
import { useEffect, useState } from "react";
import { customBackdropStyle, RAIL_BACKDROPS } from "./railBackdrops";

/**
 * An object URL for the stored backdrop image, re-read whenever `version`
 * moves (an upload here or in another window). Null while loading and when
 * nothing is stored.
 */
export const useStoredBackdropUrl = (enabled: boolean, version: number): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    loadBackdrop()
      .then((blob) => {
        if (!cancelled) setUrl(blob ? URL.createObjectURL(blob) : null);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, version]);

  // Released only once it is no longer shown: the old image stays up while
  // the new one is read, instead of blinking out.
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
};

/**
 * What is painted on the window surface (Settings → Appearance → Sidebar):
 * one of the built-in backdrops or the user's own image. It spans the whole
 * chrome, not just the rail: `AppLayout` mounts it on the window surface, so
 * it also shows in the frame around the page card.
 *
 * It lies UNDER everything on that surface and over its colour, so the
 * transparent parts of an image show the sidebar colour, or the blurred
 * desktop when the window is glass. It takes no pointer events and does not opt
 * out of the rail's drag region: it is the surface, not a thing on it.
 */
export const RailBackdrop = () => {
  const { settings } = useSettings();
  const { railBackdrop: backdrop, railBackdropVersion, railBackdropOpacity, railBackdropFit } = settings;
  const url = useStoredBackdropUrl(backdrop === "custom", railBackdropVersion);

  const style =
    backdrop === "custom"
      ? url
        ? customBackdropStyle(url, railBackdropFit)
        : null
      : backdrop === "none"
        ? null
        : RAIL_BACKDROPS[backdrop].style;
  const active = style !== null;

  // What sits on the rail opts out of its opaque fill with `railbg:`.
  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add("rail-backdrop");
    return () => document.documentElement.classList.remove("rail-backdrop");
  }, [active]);

  if (!style) return null;
  return (
    <div
      aria-hidden
      data-testid="rail-backdrop"
      data-backdrop={backdrop}
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ ...style, opacity: railBackdropOpacity }}
    />
  );
};

export default RailBackdrop;
