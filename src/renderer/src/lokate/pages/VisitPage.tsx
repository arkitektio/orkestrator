import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { InfoList } from "@/core/ui/info-list";
import { PageAction } from "@/core/ui/page-action";
import { LokatePlace, LokateVisit } from "@/lokate/linkers";
import { MapPin, MapPinPlus } from "lucide-react";
import { useMemo } from "react";
import { useGetVisitQuery } from "../api/graphql";
import { DayLink } from "../components/DayLink";
import { DeviceLabel } from "../components/DeviceLabel";
import LokateMap from "../components/LokateMap";
import { formatAt, formatDistance, formatDuration, formatTime } from "../format";

/** A stay: where and how long, on a map; an unmatched one can become a place. */
const VisitPage = asDetailQueryRoute(useGetVisitQuery, ({ data }) => {
  const visit = data.visit;
  const { openDialog } = useDialog();
  const stays = useMemo(() => [{ id: visit.id, lat: visit.lat, lon: visit.lon, radius: visit.radius }], [visit]);

  return (
    <LokateVisit.ModelPage
      title={
        <span className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {visit.place?.name ?? "Visit"}
        </span>
      }
      object={visit}
      pageActions={
        !visit.place && (
          <PageAction
            size="sm"
            collapse="icon"
            icon={<MapPinPlus className="h-4 w-4" />}
            onClick={() => openDialog("lokateplace", { visit: visit.id }, { size: "medium" })}
          >
            Save as place
          </PageAction>
        )
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Place",
                visit.place && (
                  <LokatePlace.DetailLink object={visit.place} className="hover:underline">
                    {visit.place.name ?? "Unnamed place"}
                  </LokatePlace.DetailLink>
                ),
              ],
              ["From", formatAt(visit.start)],
              ["Until", formatTime(visit.end)],
              ["Stayed", formatDuration(visit.duration)],
              ["Radius", formatDistance(visit.radius)],
              ["Points", visit.pointCount],
              ["Phone", <DeviceLabel deviceId={visit.deviceId} />],
              ["Day", <DayLink at={visit.start} />],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex h-full flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">
          {formatAt(visit.start)} – {formatTime(visit.end)} · {formatDuration(visit.duration)}
        </p>
        <LokateMap stays={stays} className="min-h-72 flex-1 rounded-md" />
      </div>
    </LokateVisit.ModelPage>
  );
});

export default VisitPage;
