import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { MapRef, Marker } from "react-map-gl/maplibre";
import { BankMap, Bbox, toBounds } from "./BankMap";
import { MapMarker, MARKER_OFFSET } from "./MapMarker";

export type Point = { latitude: number; longitude: number };

// Nothing to frame yet: central Europe, where the bank's data lives.
const FALLBACK_VIEW = { longitude: 10, latitude: 50, zoom: 3.5 };

/**
 * Pick a point on the map: click to drop the pin, drag it to adjust. When
 * `value` moves from outside (an address search) and leaves the view, the map
 * flies there. Without a value it frames `around` (e.g. the merchant's other
 * places).
 */
export const PointPicker = ({
  value,
  onChange,
  around,
  color,
  className,
}: {
  value: Point | null;
  onChange: (point: Point) => void;
  around?: Bbox | null;
  color?: string | null;
  className?: string;
}) => {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (!map.getBounds().contains([value.longitude, value.latitude])) {
      map.flyTo({ center: [value.longitude, value.latitude], zoom: Math.max(map.getZoom(), 15) });
    }
  }, [value?.latitude, value?.longitude]);

  const initialViewState = value
    ? { longitude: value.longitude, latitude: value.latitude, zoom: 15 }
    : around
      ? { bounds: toBounds(around), fitBoundsOptions: { padding: 48, maxZoom: 14 } }
      : FALLBACK_VIEW;

  return (
    <BankMap
      ref={mapRef}
      className={className}
      initialViewState={initialViewState}
      cursor="crosshair"
      onClick={(e) => onChange({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })}
    >
      {value && (
        <Marker
          longitude={value.longitude}
          latitude={value.latitude}
          anchor="bottom"
          offset={MARKER_OFFSET}
          draggable
          onDragEnd={(e) => onChange({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })}
        >
          <MapMarker color={color} icon={MapPin} selected />
        </Marker>
      )}
    </BankMap>
  );
};

export default PointPicker;
