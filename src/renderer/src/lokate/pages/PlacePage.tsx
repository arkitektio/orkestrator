import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { InfoList } from "@/core/ui/info-list";
import { PageAction } from "@/core/ui/page-action";
import { LokatePlace } from "@/lokate/linkers";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Ordering, useGetPlaceQuery, useListVisitsQuery } from "../api/graphql";
import LokateMap from "../components/LokateMap";
import { VisitRow } from "../components/TimelineRows";
import { formatAt, formatDay, formatDistance } from "../format";
import { LOKATE_HELP } from "../help";

const VISITS = 50;

/** A named place: where it is on a map, and the latest visits matched to it. */
const PlacePage = asDetailQueryRoute(useGetPlaceQuery, ({ data }) => {
  const place = data.place;
  const { openDialog } = useDialog();
  const { data: visitData } = useListVisitsQuery({
    variables: { filters: { places: [place.id] }, ordering: [{ start: Ordering.Desc }], pagination: { limit: VISITS } },
  });
  const visits = visitData?.visits ?? [];
  const places = useMemo(() => [place], [place]);

  return (
    <LokatePlace.ModelPage
      help={LOKATE_HELP.place}
      title={
        <span className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {place.name ?? "Unnamed place"}
        </span>
      }
      object={place}
      pageActions={
        <>
          <PageAction
            size="sm"
            collapse="icon"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openDialog("lokateplace", { id: place.id }, { size: "medium" })}
          >
            Edit
          </PageAction>
          <PageAction
            size="sm"
            variant="outline"
            collapse="icon"
            priority={-10}
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => openDialog("lokatedeleteplace", { id: place.id }, { size: "small" })}
          >
            Delete
          </PageAction>
        </>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["Visits", place.visitCount],
              ["Last visit", place.lastVisitAt && formatAt(place.lastVisitAt)],
              ["Radius", place.radius != null && formatDistance(place.radius)],
              ["Position", place.lat != null && place.lon != null && `${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`],
              ["Edited", formatDay(place.updatedAt)],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex flex-col gap-6 p-6">
        {place.lat != null && place.lon != null && <LokateMap places={places} className="h-72 rounded-md" />}
        {visits.length > 0 && (
          <section className="flex flex-col gap-1">
            <h2 className="px-2 text-sm font-semibold text-muted-foreground">
              {visits.length < VISITS ? "Visits" : `Latest ${VISITS} visits`}
            </h2>
            {visits.map((visit) => (
              <div key={visit.id} className="flex items-center gap-2">
                <span className="w-20 shrink-0 px-2 text-xs text-muted-foreground">{formatDay(visit.start)}</span>
                <div className="min-w-0 flex-1">
                  <VisitRow visit={visit} />
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </LokatePlace.ModelPage>
  );
});

export default PlacePage;
