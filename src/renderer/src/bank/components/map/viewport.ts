import { useCallback, useEffect, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { BoundsInput } from "../../api/graphql";

export type Viewport = { bounds: BoundsInput; zoom: number };

// ~100 m at the equator: pans smaller than this do not change the query.
const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * The map's settled viewport (bounds rounded, zoom whole), for queries that
 * follow the view. Wire `update` to the map's `onLoad` and `onMoveEnd`; it is
 * debounced so a flurry of moves costs one query.
 */
export const useViewport = (mapRef: React.RefObject<MapRef | null>, delay = 300) => {
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const update = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      const bounds = map.getBounds();
      const next: Viewport = {
        bounds: {
          west: round(bounds.getWest()),
          south: round(bounds.getSouth()),
          east: round(bounds.getEast()),
          north: round(bounds.getNorth()),
        },
        zoom: Math.round(map.getZoom()),
      };
      setViewport((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, delay);
  }, [mapRef, delay]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { viewport, update };
};
