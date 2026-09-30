import { useDialog } from "@/core/dialogs/registry";
import { Input } from "@/core/ui/input";
import { PageAction } from "@/core/ui/page-action";
import { cn } from "@/core/util/utils";
import { LokatePlace } from "@/lokate/linkers";
import { MapPin, Plus } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListPlaceFragment, Ordering, useListPlacesQuery } from "../api/graphql";
import LokateMap from "../components/LokateMap";
import { formatDay } from "../format";

/** Enough for anyone's named places; the map shows them all at once. */
const LIMIT = 500;

const PlaceRow = ({
  place,
  highlighted,
  onHover,
}: {
  place: ListPlaceFragment;
  highlighted: boolean;
  onHover: (id: string | null) => void;
}) => (
  <LokatePlace.Smart object={place}>
    <div
      onPointerEnter={() => onHover(place.id)}
      onPointerLeave={() => onHover(null)}
      className={cn("flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors", highlighted && "bg-muted/60")}
    >
      <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <LokatePlace.DetailLink object={place} className="min-w-0 flex-1 truncate font-medium hover:underline">
        {place.name ?? "Unnamed place"}
      </LokatePlace.DetailLink>
      <span className="shrink-0 text-xs text-muted-foreground">
        {place.visitCount}×{place.lastVisitAt && <> · {formatDay(place.lastVisitAt)}</>}
      </span>
    </div>
  </LokatePlace.Smart>
);

/** The user's named places, shared by all their phones: a list beside a map. */
const PlacesPage = () => {
  const { openDialog } = useDialog();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const search = useDeferredValue(text.trim());
  const [highlight, setHighlight] = useState<string | null>(null);
  const { data, previousData, loading } = useListPlacesQuery({
    variables: {
      filters: search ? { search } : undefined,
      ordering: [{ name: Ordering.Asc }],
      pagination: { limit: LIMIT },
    },
  });
  const places = (data ?? previousData)?.places ?? [];

  return (
    <LokatePlace.ListPage
      title="Places"
      pageActions={
        <>
          <PageAction.Slot alwaysShow>
            <Input placeholder="Search places…" value={text} onChange={(e) => setText(e.target.value)} className="h-8 w-48" />
          </PageAction.Slot>
          <PageAction
            size="sm"
            collapse="icon"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openDialog("lokateplace", {}, { size: "medium" })}
          >
            Add place
          </PageAction>
        </>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[minmax(16rem,22rem)_1fr]">
        <div className="flex min-h-0 flex-col overflow-y-auto p-4">
          {places.length === 0 && !loading && (
            <p className="px-2 text-sm text-muted-foreground">
              {search ? "No place matches." : "No places yet. Name one on a phone, add one here, or save a visit as a place."}
            </p>
          )}
          {places.map((place) => (
            <PlaceRow key={place.id} place={place} highlighted={place.id === highlight} onHover={setHighlight} />
          ))}
        </div>
        <LokateMap
          className="min-h-80 h-full"
          places={places}
          highlight={highlight}
          onSelectPlace={(id) => navigate(LokatePlace.linkBuilder(id))}
        />
      </div>
    </LokatePlace.ListPage>
  );
};

export default PlacesPage;
