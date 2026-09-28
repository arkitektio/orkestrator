import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { useSpendingGridQuery } from "../../api/graphql";
import { toNumber } from "../../format";
import { MapThemeColors } from "./theme";
import { Viewport } from "./viewport";

/** Grid cells: coarse zoomed out, ~50 m on a street. */
export const cellMetersFor = (zoom: number) => Math.min(5000, Math.max(50, Math.round(40000 / 2 ** (zoom - 8))));

const withAlpha = (rgb: string, alpha: number) => rgb.replace(/^rgb\((.*)\)$/, `rgba($1, ${alpha})`);

const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/\d+/g) ?? ["0", "0", "0"]).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Money spent in the viewport, binned into grid cells by the server and drawn
 * as a heatmap under the places: transparent → the brand colour → the
 * brighter of foreground and primary-foreground where most money goes.
 * Rendered inside the map, before the place layers (`beforeId`).
 */
export const SpendingHeatmap = ({
  viewport,
  theme,
  beforeId,
}: {
  viewport: Viewport;
  theme: MapThemeColors;
  beforeId?: string;
}) => {
  const cellMeters = cellMetersFor(viewport.zoom);
  const { data, previousData } = useSpendingGridQuery({
    variables: { within: viewport.bounds, cellMeters },
  });
  const grid = (data ?? previousData)?.spendingGrid;

  const geojson = useMemo(() => {
    const features = grid?.features ?? [];
    const max = Math.max(0, ...features.map((cell) => toNumber(cell.properties.expense)));
    return {
      type: "FeatureCollection" as const,
      features: features.map((cell, index) => ({
        type: "Feature" as const,
        id: index,
        geometry: { type: "Point" as const, coordinates: cell.geometry.coordinates },
        properties: { weight: max ? toNumber(cell.properties.expense) / max : 0 },
      })),
    };
  }, [grid]);

  // A cell's size in pixels at the zoom it was fetched for, then scaled with
  // the zoom (×2 per level) so the heat keeps its ground size while zooming.
  const latitude = (viewport.bounds.north + viewport.bounds.south) / 2;
  const metersPerPixel = (156543.03 * Math.cos((latitude * Math.PI) / 180)) / 2 ** viewport.zoom;
  const radius = Math.max(8, (grid?.cellMeters ?? cellMeters) / metersPerPixel) * 1.5;
  const top = luminance(theme.foreground) > luminance(theme.primaryForeground) ? theme.foreground : theme.primaryForeground;

  return (
    <Source id="spending-grid" type="geojson" data={geojson}>
      <Layer
        id="spending-heat"
        type="heatmap"
        beforeId={beforeId}
        paint={{
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": 1,
          "heatmap-radius": [
            "interpolate",
            ["exponential", 2],
            ["zoom"],
            0,
            radius * 2 ** -viewport.zoom,
            24,
            radius * 2 ** (24 - viewport.zoom),
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0, 0, 0, 0)",
            0.15,
            withAlpha(theme.primary, 0.35),
            0.5,
            withAlpha(theme.primary, 0.8),
            1,
            top,
          ],
          "heatmap-opacity": 0.8,
        }}
      />
    </Source>
  );
};
