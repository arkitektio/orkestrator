import { useMemo } from "react";
import { Marker } from "react-map-gl/maplibre";
import { toast } from "@/core/notify";
import { MerchantLocationFragment, useUpdateMerchantLocationMutation } from "../../api/graphql";
import { toastText } from "../../errors";
import { BankMap, Bbox, toBounds } from "./BankMap";
import { MapMarker, MARKER_OFFSET } from "./MapMarker";

type Located = MerchantLocationFragment & { latitude: string; longitude: string };

const isLocated = (location: MerchantLocationFragment): location is Located =>
  location.latitude != null && location.longitude != null;

/**
 * One merchant's places as pins. Dragging a pin moves the place (it then
 * counts as set by hand); `selected` is drawn larger.
 */
export const LocationsMap = ({
  locations,
  color,
  selected,
  onSelect,
  className,
}: {
  locations: MerchantLocationFragment[];
  color?: string | null;
  selected?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) => {
  const [update] = useUpdateMerchantLocationMutation();
  const located = locations.filter(isLocated);
  const bbox = useMemo((): Bbox | null => {
    if (located.length === 0) return null;
    const lngs = located.map((l) => Number(l.longitude));
    const lats = located.map((l) => Number(l.latitude));
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    // Framed once per set of places, not on every drag.
  }, [located.map((l) => l.id).join()]);

  if (!bbox) return null;

  return (
    <BankMap
      className={className}
      fit={located.length > 1 ? bbox : null}
      initialViewState={{ bounds: toBounds(bbox), fitBoundsOptions: { padding: 48, maxZoom: 15 } }}
    >
      {located.map((location) => (
        <Marker
          key={location.id}
          longitude={Number(location.longitude)}
          latitude={Number(location.latitude)}
          anchor="bottom"
          offset={MARKER_OFFSET}
          draggable
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onSelect?.(location.id);
          }}
          onDragEnd={(e) =>
            update({
              variables: {
                input: { id: location.id, latitude: e.lngLat.lat.toFixed(6), longitude: e.lngLat.lng.toFixed(6) },
              },
            })
              .then(() => toast.success(`Moved ${location.name}`))
              .catch((error) => toast.error("Could not move it: " + toastText(error)))
          }
        >
          <MapMarker color={color} selected={location.id === selected} title={location.name} />
        </Marker>
      ))}
    </BankMap>
  );
};
