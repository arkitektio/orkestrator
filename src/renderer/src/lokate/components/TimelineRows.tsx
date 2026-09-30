import { LokatePlace, LokateTrip, LokateVisit } from "@/lokate/linkers";
import { cn } from "@/core/util/utils";
import { MapPin } from "lucide-react";
import type { ListTripFragment, ListVisitFragment } from "../api/graphql";
import { MODE_LABELS, formatDistance, formatDuration, formatTime } from "../format";
import { ModeIcon } from "./ModeIcon";

export type TimelineEntry =
  | { kind: "visit"; start: string; item: ListVisitFragment }
  | { kind: "trip"; start: string; item: ListTripFragment };

/** A day's visits and trips as one list, oldest first. */
export const timelineOf = (visits: readonly ListVisitFragment[], trips: readonly ListTripFragment[]): TimelineEntry[] =>
  [
    ...visits.map((item) => ({ kind: "visit" as const, start: item.start, item })),
    ...trips.map((item) => ({ kind: "trip" as const, start: item.start, item })),
  ].sort((a, b) => a.start.localeCompare(b.start));

const TimeRange = ({ start, end }: { start: string; end: string }) => (
  <span className="w-24 shrink-0 tabular-nums text-xs text-muted-foreground">
    {formatTime(start)}–{formatTime(end)}
  </span>
);

/** A stay: where (its place's name, when it matched one), and how long. */
export const VisitRow = ({
  visit,
  highlighted,
  onHover,
}: {
  visit: ListVisitFragment;
  highlighted?: boolean;
  onHover?: (id: string | null) => void;
}) => (
  <LokateVisit.Smart object={visit}>
    <div
      onPointerEnter={() => onHover?.(visit.id)}
      onPointerLeave={() => onHover?.(null)}
      className={cn("flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors", highlighted && "bg-muted/60")}
    >
      <TimeRange start={visit.start} end={visit.end} />
      <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        {visit.place ? (
          <LokatePlace.DetailLink object={visit.place} className="font-medium hover:underline">
            {visit.place.name ?? "Unnamed place"}
          </LokatePlace.DetailLink>
        ) : (
          <LokateVisit.DetailLink object={visit} className="text-muted-foreground hover:underline">
            {visit.lat.toFixed(4)}, {visit.lon.toFixed(4)}
          </LokateVisit.DetailLink>
        )}
      </span>
      <LokateVisit.DetailLink object={visit} className="shrink-0 text-xs text-muted-foreground hover:underline">
        {formatDuration(visit.duration)}
      </LokateVisit.DetailLink>
    </div>
  </LokateVisit.Smart>
);

/** A movement: how, how far, how long. */
export const TripRow = ({ trip }: { trip: ListTripFragment }) => (
  <LokateTrip.Smart object={trip}>
    <div className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
      <TimeRange start={trip.start} end={trip.end} />
      <ModeIcon mode={trip.mode} className="h-4 w-4 shrink-0" />
      <LokateTrip.DetailLink object={trip} className="min-w-0 flex-1 truncate hover:underline">
        {MODE_LABELS[trip.mode]} · {formatDistance(trip.distance)}
      </LokateTrip.DetailLink>
      <span className="shrink-0 text-xs">{formatDuration(trip.duration)}</span>
    </div>
  </LokateTrip.Smart>
);

/** The rows of a timeline, visits and trips interleaved. */
export const TimelineList = ({
  entries,
  highlight,
  onHover,
}: {
  entries: readonly TimelineEntry[];
  highlight?: string | null;
  onHover?: (id: string | null) => void;
}) => (
  <div className="flex flex-col">
    {entries.map((entry) =>
      entry.kind === "visit" ? (
        <VisitRow key={`v:${entry.item.id}`} visit={entry.item} highlighted={entry.item.id === highlight} onHover={onHover} />
      ) : (
        <TripRow key={`t:${entry.item.id}`} trip={entry.item} />
      ),
    )}
  </div>
);
