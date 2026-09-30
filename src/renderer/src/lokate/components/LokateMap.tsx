import { BaseMap, Bbox, toBounds } from "@/core/map/BaseMap";
import { MapMarker, MARKER_OFFSET } from "@/core/map/MapMarker";
import { useMapThemeColors } from "@/core/map/theme";
import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import type { ListPlaceFragment, TrackFragment } from "../api/graphql";
import { bboxOf, circleRing, lineCoordinates } from "../format";

export type MapStay = { id: string; lat: number; lon: number; radius: number };

// Nothing to frame: central Europe.
const FALLBACK_VIEW = { longitude: 10, latitude: 50, zoom: 3.5 };

/**
 * Lokate's one map: the path as lines (one per device), stays as circles
 * sized by their radius, and named places as pins. `highlight` is the id of
 * the visit or place a hovered row points at; it is drawn stronger. Frames
 * everything it is given once per set, and offers a fit button.
 */
export const LokateMap = ({
  tracks = [],
  stays = [],
  places = [],
  highlight,
  onSelectPlace,
  className,
}: {
  tracks?: readonly TrackFragment[];
  stays?: readonly MapStay[];
  places?: readonly ListPlaceFragment[];
  highlight?: string | null;
  onSelectPlace?: (id: string) => void;
  className?: string;
}) => {
  const theme = useMapThemeColors();
  const located = places.filter(
    (place): place is ListPlaceFragment & { lat: number; lon: number } => place.lat != null && place.lon != null,
  );

  const lines = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: tracks.map((track) => ({
        type: "Feature" as const,
        properties: { device: track.device.id },
        geometry: { type: "LineString" as const, coordinates: lineCoordinates(track.geojson) },
      })),
    }),
    [tracks],
  );

  const circles = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        ...stays.map((stay) => ({ id: stay.id, lat: stay.lat, lon: stay.lon, radius: stay.radius })),
        ...located
          .filter((place) => place.radius != null)
          .map((place) => ({ id: place.id, lat: place.lat, lon: place.lon, radius: place.radius as number })),
      ].map((area) => ({
        type: "Feature" as const,
        properties: { id: area.id, highlighted: area.id === highlight },
        geometry: { type: "Polygon" as const, coordinates: [circleRing(area.lat, area.lon, Math.max(area.radius, 15))] },
      })),
    }),
    [stays, located.map((place) => place.id).join(), highlight],
  );

  const everything = [
    ...lines.features.flatMap((feature) => feature.geometry.coordinates),
    ...stays.map((stay) => [stay.lon, stay.lat] as [number, number]),
    ...located.map((place) => [place.lon, place.lat] as [number, number]),
  ];
  const bbox: Bbox | null = bboxOf(everything);
  // Framed once per set of things, not on every hover.
  const frameKey = useMemo(() => bbox?.map((n) => n.toFixed(4)).join() ?? "none", [bbox?.join()]);

  return (
    <BaseMap
      key={frameKey}
      className={className}
      fit={bbox}
      initialViewState={bbox ? { bounds: toBounds(bbox), fitBoundsOptions: { padding: 48, maxZoom: 16 } } : FALLBACK_VIEW}
    >
      <Source id="lokate-areas" type="geojson" data={circles}>
        <Layer
          id="lokate-areas-fill"
          type="fill"
          paint={{
            "fill-color": theme.primary,
            "fill-opacity": ["case", ["get", "highlighted"], 0.35, 0.15],
          }}
        />
        <Layer
          id="lokate-areas-line"
          type="line"
          paint={{
            "line-color": theme.primary,
            "line-width": ["case", ["get", "highlighted"], 2.5, 1],
          }}
        />
      </Source>
      <Source id="lokate-tracks" type="geojson" data={lines}>
        <Layer
          id="lokate-tracks-casing"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": theme.background, "line-width": 6, "line-opacity": 0.8 }}
        />
        <Layer
          id="lokate-tracks-line"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": theme.primary, "line-width": 3 }}
        />
      </Source>
      {located.map((place) => (
        <Marker
          key={place.id}
          longitude={place.lon}
          latitude={place.lat}
          anchor="bottom"
          offset={MARKER_OFFSET}
          onClick={(event) => {
            event.originalEvent.stopPropagation();
            onSelectPlace?.(place.id);
          }}
        >
          <MapMarker icon={MapPin} selected={place.id === highlight} title={place.name ?? undefined} />
        </Marker>
      ))}
    </BaseMap>
  );
};

export default LokateMap;
