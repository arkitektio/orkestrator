import { useDebounce } from "@uidotdev/usehooks";
import { Layers } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { moduleProfileFeed, type ModuleProfileFeedSource } from "@/core/modules/registries";
import { useModuleHostVersion } from "@/core/modules/host/host";
import { Button } from "@/core/ui/button";
import { CARD_FRAME_GRID, CARD_FRAME_SIZE } from "@/core/ui/card-frame";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/core/ui/empty";
import { ErrorNote } from "@/core/ui/error-note";
import { FilterClear, FilterSearchField, FilterToggle } from "@/core/ui/filter-bar";
import { parseAsArrayOf, parseAsString, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { cn } from "@/core/util/utils";
import { mergeProfileFeed, profileFeedHasMore, type ProfileFeedQuery } from "./feed";

/** How many cards the feed shows at first, and how many more each "Show more" adds. */
const PAGE = 24;

type Reported = { items: readonly unknown[]; loading: boolean; error?: unknown };
type Report = (id: string, result: Reported | null) => void;

/**
 * Runs one source's query (inside its module's guard) and hands what it found
 * up to the feed. Draws nothing: the feed draws the merged cards.
 */
const SourceRunner = ({
  source,
  query,
  report,
}: {
  source: ModuleProfileFeedSource;
  query: ProfileFeedQuery;
  report: Report;
}) => {
  const { items, loading, error } = source.useItems(query);
  useEffect(() => {
    report(source.id, { items, loading, error });
  }, [report, source.id, items, loading, error]);
  // Turned off, or its service went away: its cards leave with it.
  useEffect(() => () => report(source.id, null), [report, source.id]);
  return null;
};

const NOTHING: Reported = { items: [], loading: false };

/** In a source's place while its service is not ready: it has nothing, and is not loading. */
const NotReady = ({ id, report }: { id: string; report: Report }) => {
  useEffect(() => {
    report(id, NOTHING);
    return () => report(id, null);
  }, [report, id]);
  return null;
};

/**
 * A member's work across every service, newest first: one search field and one
 * toggle per kind over one grid of cards. Each module answers through its
 * `profileFeed` sources (`./feed.ts`), behind its own guard: a module that is
 * down drops out, its toggles with it. The search and the toggles live in the
 * URL, so a filtered profile is a link.
 */
export const ProfileFeed = ({
  sub,
  name,
  sources: given,
}: {
  sub: string;
  /** Who, for the empty state: "Nothing from ada yet". */
  name: string;
  /** Every module's sources by default; a test passes its own. */
  sources?: readonly ModuleProfileFeedSource[];
}) => {
  useModuleHostVersion();
  const sources = given ?? moduleProfileFeed();

  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  // Settled, so a keystroke does not refetch every service.
  const settled = useDebounce(search.trim(), 400);
  // The kinds turned OFF: an untouched profile has a clean URL and shows everything.
  const [hiddenList, setHidden] = useQueryState("hide", parseAsArrayOf(parseAsString).withDefault([]));
  const hiddenKey = hiddenList.join(",");
  const hidden = useMemo(() => new Set(hiddenKey ? hiddenKey.split(",") : []), [hiddenKey]);

  const toggle = (kind: string) => {
    const next = new Set(hidden);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setHidden(next.size ? [...next] : null);
  };
  const clear = () => {
    setSearch(null);
    setHidden(null);
  };
  const filtering = search.trim() !== "" || hidden.size > 0;

  // "Show more" counts from the first page again whenever the filters change.
  const filterKey = `${settled}|${hiddenKey}`;
  const [paging, setPaging] = useState({ key: filterKey, limit: PAGE });
  const limit = paging.key === filterKey ? paging.limit : PAGE;

  const [results, setResults] = useState<Record<string, Reported>>({});
  const report = useCallback<Report>((id, result) => {
    setResults((previous) => {
      if (result === null) {
        if (!(id in previous)) return previous;
        const { [id]: _gone, ...rest } = previous;
        return rest;
      }
      return { ...previous, [id]: result };
    });
  }, []);

  const active = sources
    .map((source) => ({ source, kinds: source.kinds.filter((kind) => !hidden.has(kind.id)).map((kind) => kind.id) }))
    .filter(({ kinds }) => kinds.length > 0);
  const reported = active.flatMap(({ source }) => {
    const result = results[source.id];
    return result ? [{ source, ...result }] : [];
  });

  const entries = mergeProfileFeed(reported, limit);
  const hasMore = profileFeedHasMore(reported, limit);
  // A source not heard from yet (the first frame) counts as loading.
  const loading = reported.some((result) => result.loading) || reported.length < active.length;
  const errors = reported.filter((result) => result.error);

  return (
    <div className="flex flex-col gap-4">
      {/* The filter row belongs to the grid it narrows, not to the page. */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSearchField value={search} onChange={(next) => setSearch(next || null)} placeholder="Search their work…" />
        {sources.map((source) => (
          // A toggle only for a service that is there to ask.
          <source.Guard key={source.id} fallback={null}>
            {source.kinds.map((kind) => (
              <FilterToggle
                key={kind.id}
                icon={kind.icon}
                pressed={!hidden.has(kind.id)}
                onPressedChange={() => toggle(kind.id)}
              >
                {kind.label}
              </FilterToggle>
            ))}
          </source.Guard>
        ))}
        {filtering && <FilterClear onClear={clear} />}
      </div>

      {active.map(({ source, kinds }) => (
        <source.Guard key={source.id} fallback={<NotReady id={source.id} report={report} />}>
          {/* A source whose query throws drops out alone. */}
          <ErrorBoundary fallback={<NotReady id={source.id} report={report} />}>
            <SourceRunner source={source} query={{ sub, search: settled, kinds, limit }} report={report} />
          </ErrorBoundary>
        </source.Guard>
      ))}

      {errors.length > 0 && (
        <ErrorNote
          title={`Could not load everything from ${errors.map((result) => result.source.namespace).join(", ")}`}
          error={errors[0]!.error}
        />
      )}

      {entries.length > 0 ? (
        <>
          <div className={CARD_FRAME_GRID}>
            {entries.map((entry) => (
              <entry.source.Guard key={entry.key} fallback={null}>
                <entry.source.Card item={entry.item} />
              </entry.source.Guard>
            ))}
          </div>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              className="self-center rounded-full"
              disabled={loading}
              onClick={() => setPaging({ key: filterKey, limit: limit + PAGE })}
            >
              Show more
            </Button>
          )}
        </>
      ) : loading && active.length > 0 ? (
        // The shape of what is coming, while the services answer.
        <div className={CARD_FRAME_GRID} aria-busy>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={cn(CARD_FRAME_SIZE, "animate-pulse rounded-2xl bg-muted/40")} />
          ))}
        </div>
      ) : (
        <Empty className="border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers />
            </EmptyMedia>
            <EmptyTitle>
              {active.length === 0 && hidden.size > 0
                ? "Every type is turned off"
                : filtering
                  ? "Nothing matches your filters"
                  : `Nothing from ${name} yet`}
            </EmptyTitle>
            <EmptyDescription>
              {filtering
                ? "Try a different search, or turn more types on."
                : "The data they bring in and the experiments they start show up here, newest first."}
            </EmptyDescription>
          </EmptyHeader>
          {filtering && <FilterClear onClear={clear} />}
        </Empty>
      )}
    </div>
  );
};
