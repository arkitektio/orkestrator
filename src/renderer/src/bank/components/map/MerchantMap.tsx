import { Switch } from "@/core/ui/switch";
import { BankMerchant } from "@/bank/linkers";
import { useMemo, useRef, useState } from "react";
import { Layer, MapLayerMouseEvent, MapRef, Popup, Source } from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import { MerchantLocationFeatureFragment, MerchantLocationFilter, useMerchantLocationsGeojsonQuery } from "../../api/graphql";
import { formatDay } from "../../format";
import { Money } from "../Money";
import { AreaStatsPanel } from "./AreaStatsPanel";
import { BaseMap, Bbox, MAP_FONT, toBounds } from "@/core/map/BaseMap";
import { MapSettingRow } from "@/core/map/MapControls";
import { SpendingHeatmap } from "./SpendingHeatmap";
import { useMapThemeColors } from "@/core/map/theme";
import { useViewport } from "./viewport";

type Properties = MerchantLocationFeatureFragment["properties"];

/** A place's popup: which merchant, where, how often, how much. */
const PlacePopup = ({ place, onClose }: { place: { lngLat: [number, number]; properties: Properties }; onClose: () => void }) => {
  const p = place.properties;
  return (
    <Popup
      longitude={place.lngLat[0]}
      latitude={place.lngLat[1]}
      onClose={onClose}
      closeButton={false}
      offset={12}
    >
      <div className="flex min-w-44 flex-col gap-1 text-xs">
        <BankMerchant.DetailLink object={{ id: p.merchantId }} className="text-sm font-medium">
          {p.merchantName}
        </BankMerchant.DetailLink>
        {p.name !== p.merchantName && <span>{p.name}</span>}
        {(p.street || p.city) && (
          <span className="text-muted-foreground">{[p.street, p.city].filter(Boolean).join(", ")}</span>
        )}
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">
            {p.transactionCount} {p.transactionCount === 1 ? "visit" : "visits"}
            {p.lastVisit && <> · last {formatDay(p.lastVisit)}</>}
          </span>
          <Money amount={p.net} currency={p.currency} signed className="font-medium" />
        </div>
      </div>
    </Popup>
  );
};

/**
 * The organization's located merchant places, clustered, each dot in its
 * merchant's category colour (the brand colour without one) and sized by
 * visits, ringed in the page background. Click a cluster to zoom in, a dot for
 * the place. Clustering and sizing are toggles in the map's gear, as are a
 * spending heatmap under the places and a panel with stats for the view (both
 * follow the viewport).
 */
export const MerchantMap = ({ filters, className }: { filters?: MerchantLocationFilter; className?: string }) => {
  const { data } = useMerchantLocationsGeojsonQuery({ variables: { filters } });
  const mapRef = useRef<MapRef>(null);
  const [place, setPlace] = useState<{ lngLat: [number, number]; properties: Properties } | null>(null);
  const [hovering, setHovering] = useState(false);
  const [clustered, setClustered] = useState(true);
  const [sized, setSized] = useState(true);
  const [heatmap, setHeatmap] = useState(false);
  const [areaStats, setAreaStats] = useState(false);
  const theme = useMapThemeColors();
  const { viewport, update: updateViewport } = useViewport(mapRef);

  const collection = data?.merchantLocationsGeojson;
  // A plain FeatureCollection: the server's is valid GeoJSON, but the popup
  // reads the typed properties by feature id rather than maplibre's flattened copy.
  const geojson = useMemo(
    () =>
      collection && {
        type: "FeatureCollection" as const,
        features: collection.features.map((f, index) => ({
          type: "Feature" as const,
          id: index,
          geometry: { type: "Point" as const, coordinates: f.geometry.coordinates },
          properties: { color: f.properties.color ?? theme.primary, visits: f.properties.transactionCount, index },
        })),
      },
    [collection, theme.primary],
  );

  const onClick = async (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const map = mapRef.current;
    if (!feature || !map || feature.geometry.type !== "Point") return;
    const lngLat = feature.geometry.coordinates as [number, number];
    if (feature.properties?.cluster) {
      const source = map.getSource("places") as GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
      map.easeTo({ center: lngLat, zoom });
      return;
    }
    const properties = collection?.features[feature.properties?.index]?.properties;
    if (properties) setPlace({ lngLat, properties });
  };

  if (!collection || !geojson) return <div className={className} />;
  if (collection.features.length === 0)
    return (
      <div className={className}>
        <p className="p-6 text-sm text-muted-foreground">
          No places on the map yet. Places appear once a merchant's store has an address.
        </p>
      </div>
    );

  return (
    <BaseMap
      ref={mapRef}
      className={className}
      fit={collection.bbox as Bbox | null | undefined}
      settings={
        <>
          <MapSettingRow label="Group nearby places">
            <Switch checked={clustered} onCheckedChange={setClustered} />
          </MapSettingRow>
          <MapSettingRow label="Size by visits">
            <Switch checked={sized} onCheckedChange={setSized} />
          </MapSettingRow>
          <MapSettingRow label="Spending heatmap">
            <Switch checked={heatmap} onCheckedChange={setHeatmap} />
          </MapSettingRow>
          <MapSettingRow label="Stats for this view">
            <Switch checked={areaStats} onCheckedChange={setAreaStats} />
          </MapSettingRow>
        </>
      }
      initialViewState={
        collection.bbox ? { bounds: toBounds(collection.bbox), fitBoundsOptions: { padding: 48, maxZoom: 15 } } : undefined
      }
      interactiveLayerIds={["clusters", "places"]}
      onClick={onClick}
      onLoad={updateViewport}
      onMoveEnd={updateViewport}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      cursor={hovering ? "pointer" : "grab"}
    >
      {heatmap && viewport && <SpendingHeatmap viewport={viewport} theme={theme} beforeId="clusters" />}
      {/* Keyed: a geojson source cannot switch clustering in place. */}
      <Source
        key={clustered ? "clustered" : "flat"}
        id="places"
        type="geojson"
        data={geojson}
        cluster={clustered}
        clusterRadius={40}
        clusterMaxZoom={14}
      >
        <Layer
          id="clusters"
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": theme.primary,
            "circle-opacity": 0.9,
            "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24],
            "circle-stroke-width": 3,
            "circle-stroke-color": theme.background,
            "circle-stroke-opacity": 0.8,
          }}
        />
        <Layer
          id="cluster-count"
          type="symbol"
          filter={["has", "point_count"]}
          layout={{ "text-field": "{point_count_abbreviated}", "text-font": MAP_FONT, "text-size": 12 }}
          paint={{ "text-color": theme.primaryForeground }}
        />
        <Layer
          id="places"
          type="circle"
          filter={["!", ["has", "point_count"]]}
          paint={{
            "circle-color": ["get", "color"],
            "circle-radius": sized ? ["interpolate", ["linear"], ["sqrt", ["get", "visits"]], 1, 6, 10, 14] : 7,
            "circle-stroke-width": 2,
            "circle-stroke-color": theme.background,
          }}
        />
      </Source>
      {place && <PlacePopup place={place} onClose={() => setPlace(null)} />}
      {areaStats && viewport && <AreaStatsPanel viewport={viewport} />}
    </BaseMap>
  );
};
