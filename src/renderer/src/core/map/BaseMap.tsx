import { useTheme } from "@/core/settings/theme/ThemeProvider";
import { cn } from "@/core/util/utils";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// maplibre finds its worker next to its own module (`import.meta.url`), which
// bundling and the `app://` protocol break; Vite bundles it on its own instead.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { forwardRef, ReactNode } from "react";
import Map, { AttributionControl, MapProps, MapRef } from "react-map-gl/maplibre";
import "./map.css";
import { MapControls } from "./MapControls";
import { mapStyleFor, useMapStyleId } from "./styles";

setWorkerUrl(workerUrl);

export const MAP_FONT = ["Noto Sans Regular"];

/** Longitude/latitude bounds: `[west, south, east, north]`. */
export type Bbox = [number, number, number, number];

/** A bbox as maplibre bounds; a single point gets a little room around it. */
export const toBounds = (bbox: readonly number[]): [[number, number], [number, number]] => {
  const [west, south, east, north] = bbox;
  const pad = west === east && south === north ? 0.005 : 0;
  return [
    [west - pad, south - pad],
    [east + pad, north + pad],
  ];
};

/**
 * A MapLibre map in the app's look: the chosen base map (shared by every map,
 * "Match theme" by default), themed popups and attribution, and the scene-style
 * HUD bottom-right. `fit` adds a show-everything button; `settings` goes in
 * the HUD's gear. Sources, layers, markers and popups come in as children.
 */
export const BaseMap = forwardRef<
  MapRef,
  Omit<MapProps, "mapStyle"> & { className?: string; fit?: Bbox | null; settings?: ReactNode }
>(({ className, children, fit, settings, ...props }, ref) => {
  const { resolvedTheme } = useTheme();
  const styleId = useMapStyleId();
  return (
    <div className={cn("app-map relative overflow-hidden rounded-md border", className)}>
      <Map ref={ref} mapStyle={mapStyleFor(styleId, resolvedTheme)} attributionControl={false} {...props}>
        <AttributionControl position="bottom-left" compact />
        <MapControls fit={fit ? toBounds(fit) : null} settings={settings} />
        {children}
      </Map>
    </div>
  );
});
BaseMap.displayName = "BaseMap";
