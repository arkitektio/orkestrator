import type { StyleSpecification } from "maplibre-gl";
import { useSyncExternalStore } from "react";
import type { ResolvedTheme } from "@/core/settings/theme/ThemeProvider";

// OpenFreeMap: OpenStreetMap vector tiles, no key. Its glyphs serve the
// cluster labels on every style, the imagery one included.
const OPENFREEMAP = "https://tiles.openfreemap.org";

const satellite: StyleSpecification = {
  version: 8,
  glyphs: `${OPENFREEMAP}/fonts/{fontstack}/{range}.pbf`,
  sources: {
    imagery: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "imagery", type: "raster", source: "imagery" }],
};

export type MapStyleId = "auto" | "light" | "dark" | "streets" | "bright" | "satellite";

export const MAP_STYLES: Record<MapStyleId, { label: string; description: string }> = {
  auto: { label: "Match theme", description: "Light or dark with the app" },
  light: { label: "Light", description: "Quiet grey, lets the places stand out" },
  dark: { label: "Dark", description: "For dark rooms" },
  streets: { label: "Streets", description: "Full colour, with 3D buildings when tilted" },
  bright: { label: "Bright", description: "High-contrast streets and labels" },
  satellite: { label: "Satellite", description: "Aerial imagery" },
};

/** The MapLibre style for a choice; "auto" follows the app theme. */
export const mapStyleFor = (id: MapStyleId, theme: ResolvedTheme): string | StyleSpecification => {
  switch (id) {
    case "auto":
      return `${OPENFREEMAP}/styles/${theme === "dark" ? "dark" : "positron"}`;
    case "light":
      return `${OPENFREEMAP}/styles/positron`;
    case "dark":
      return `${OPENFREEMAP}/styles/dark`;
    case "streets":
      return `${OPENFREEMAP}/styles/liberty`;
    case "bright":
      return `${OPENFREEMAP}/styles/bright`;
    case "satellite":
      return satellite;
  }
};

// One choice for every map, remembered per device (a convenience: losing it
// just means "Match theme" again).
const KEY = "orkestrator.bank.mapStyle";
const listeners = new Set<() => void>();

const read = (): MapStyleId => {
  try {
    const value = localStorage.getItem(KEY);
    return value && value in MAP_STYLES ? (value as MapStyleId) : "auto";
  } catch {
    return "auto";
  }
};

let current: MapStyleId | null = null;

export const setMapStyle = (id: MapStyleId) => {
  current = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Storage blocked: the choice lasts this session.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The chosen map style, shared by every map. */
export const useMapStyleId = () => useSyncExternalStore(subscribe, () => (current ??= read()));
