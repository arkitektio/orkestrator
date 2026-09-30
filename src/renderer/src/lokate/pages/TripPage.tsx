import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { InfoList } from "@/core/ui/info-list";
import { LokateTrip } from "@/lokate/linkers";
import { useGetRouteQuery, useGetTripQuery } from "../api/graphql";
import { DayLink } from "../components/DayLink";
import { DeviceLabel } from "../components/DeviceLabel";
import LokateMap from "../components/LokateMap";
import { ModeIcon } from "../components/ModeIcon";
import { MODE_LABELS, formatAt, formatDistance, formatDuration, formatTime } from "../format";

/** A movement: the path its phone recorded while it lasted, and how fast. */
const TripPage = asDetailQueryRoute(useGetTripQuery, ({ data }) => {
  const trip = data.trip;
  const { data: route } = useGetRouteQuery({
    variables: { since: trip.start, until: trip.end, devices: [trip.device.id], simplify: 3 },
  });
  const speed = trip.duration > 0 ? (trip.distance / trip.duration) * 3.6 : null;

  return (
    <LokateTrip.ModelPage
      title={
        <span className="flex items-center gap-2">
          <ModeIcon mode={trip.mode} className="h-5 w-5" />
          {MODE_LABELS[trip.mode]} · {formatDistance(trip.distance)}
        </span>
      }
      object={trip}
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["How", MODE_LABELS[trip.mode]],
              ["From", formatAt(trip.start)],
              ["Until", formatTime(trip.end)],
              ["Took", formatDuration(trip.duration)],
              ["Distance", formatDistance(trip.distance)],
              ["Average", speed != null && `${speed.toFixed(1)} km/h`],
              ["Phone", <DeviceLabel deviceId={trip.deviceId} />],
              ["Day", <DayLink at={trip.start} />],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex h-full flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">
          {formatAt(trip.start)} – {formatTime(trip.end)} · {formatDuration(trip.duration)}
        </p>
        <LokateMap tracks={route?.route ?? []} className="min-h-72 flex-1 rounded-md" />
      </div>
    </LokateTrip.ModelPage>
  );
});

export default TripPage;
