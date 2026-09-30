import { PageLayout } from "@/core/layout/PageLayout";
import { Calendar } from "@/core/ui/calendar";
import { PageAction } from "@/core/ui/page-action";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Button } from "@/core/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetDayQuery, useGetRouteQuery } from "../api/graphql";
import LokateMap from "../components/LokateMap";
import { TimelineList, timelineOf } from "../components/TimelineRows";
import { formatDayTitle, formatDistance, isoDate, localTimeZone, parseIsoDate, shiftDay } from "../format";

/** Tolerance for thinning a day's path, meters: invisible at street zoom, far fewer vertices. */
const SIMPLIFY = 5;

/**
 * One day of location history (`?day=YYYY-MM-DD`, default today, in the
 * viewer's time zone): its visits and trips in order beside a map of the
 * path, the stays and their places. Hovering a stay highlights it on the map.
 */
const TimelinePage = () => {
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const day = parseIsoDate(params.get("day")) ?? new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const date = isoDate(day);
  const isToday = date === isoDate(today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const go = (next: Date) => {
    setParams(isoDate(next) === isoDate(today) ? {} : { day: isoDate(next) }, { replace: true });
    setHighlight(null);
  };

  const timezone = localTimeZone();
  const { data, previousData, loading } = useGetDayQuery({ variables: { date, timezone } });
  const shown = data ?? previousData;
  const summary = shown?.day;
  const { data: route } = useGetRouteQuery({
    variables: { since: summary?.start ?? "", until: summary?.end ?? "", simplify: SIMPLIFY },
    skip: !data?.day,
  });

  const entries = useMemo(() => (summary ? timelineOf(summary.visits, summary.trips) : []), [summary]);
  const places = useMemo(() => {
    const seen = new Map<string, { id: string; name?: string | null }>();
    for (const visit of summary?.visits ?? []) if (visit.place) seen.set(visit.place.id, visit.place);
    return seen;
  }, [summary]);
  const stays = useMemo(
    () => (summary?.visits ?? []).map((visit) => ({ id: visit.id, lat: visit.lat, lon: visit.lon, radius: visit.radius })),
    [summary],
  );

  return (
    <PageLayout
      title={formatDayTitle(day, today)}
      pageActions={
        <>
          <PageAction size="sm" variant="outline" collapse="icon" alwaysShow icon={<ChevronLeft />} onClick={() => go(shiftDay(day, -1))}>
            Previous day
          </PageAction>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                {date}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={day}
                defaultMonth={day}
                disabled={{ after: today }}
                onSelect={(picked) => {
                  if (picked) go(picked);
                  setPickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <PageAction
            size="sm"
            variant="outline"
            collapse="icon"
            alwaysShow
            disabled={isToday}
            icon={<ChevronRight />}
            onClick={() => go(shiftDay(day, 1))}
          >
            Next day
          </PageAction>
          {!isToday && (
            <PageAction size="sm" variant="ghost" onClick={() => go(today)}>
              Today
            </PageAction>
          )}
        </>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[minmax(18rem,26rem)_1fr]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4">
          {summary && entries.length > 0 && (
            <p className="px-2 text-xs text-muted-foreground">
              {[
                formatDistance(summary.distance),
                summary.visits.length === 1 ? "1 stay" : `${summary.visits.length} stays`,
                places.size === 1 ? "1 place" : places.size > 1 && `${places.size} places`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {summary && entries.length === 0 && !loading && (
            <p className="px-2 text-sm text-muted-foreground">
              {summary.pointCount > 0
                ? "Points were recorded, but no stays or trips yet — the phone segments them later."
                : "Nothing recorded this day."}
            </p>
          )}
          <TimelineList entries={entries} highlight={highlight} onHover={setHighlight} />
        </div>
        <LokateMap
          className="min-h-80 h-full"
          tracks={route?.route ?? []}
          stays={stays}
          highlight={highlight}
        />
      </div>
    </PageLayout>
  );
};

export default TimelinePage;
