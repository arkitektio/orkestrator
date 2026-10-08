import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { PageLayout } from "@/core/layout/PageLayout";
import { Button } from "@/core/ui/button";
import { PageAction, PageActionGroup } from "@/core/ui/page-action";
import { Skeleton } from "@/core/ui/skeleton";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { FiringOutcome, useListFiringsQuery } from "@/rekuest/api/graphql";
import { useSignalUpdates } from "@/rekuest/lib/automationUpdates";
import { OUTCOME_LABELS } from "@/rekuest/lib/firing";
import { RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FiringsTable } from "../components/automation/FiringsTable";
import { REKUEST_HELP } from "../help";

const PAGE = 50;
const OUTCOMES = [FiringOutcome.Fired, FiringOutcome.Rejected, FiringOutcome.Failed] as const;

/**
 * Every time a trigger met a signal, newest first: the log of what the
 * automations on signals did and did not do. A link from a trigger or a
 * signal arrives narrowed to it (`?trigger=`, `?signal=`).
 */
const Page = () => {
  const [outcome, setOutcome] = useQueryState("outcome", parseAsStringLiteral(OUTCOMES));
  const [replay, setReplay] = useQueryState("replay", parseAsBoolean.withDefault(false));
  const [trigger, setTrigger] = useQueryState("trigger", parseAsString);
  const [signal, setSignal] = useQueryState("signal", parseAsString);
  const [limit, setLimit] = useState(PAGE);

  const filters = useMemo(
    () => ({
      outcome: outcome ? [outcome] : undefined,
      replay: replay || undefined,
      trigger: trigger ?? undefined,
      signal: signal ?? undefined,
    }),
    [outcome, replay, trigger, signal],
  );
  const { data, error, refetch } = useListFiringsQuery({
    variables: { filters, pagination: { limit } },
    fetchPolicy: "cache-and-network",
  });
  // a firing follows a signal: the signal feed is what says there is news
  useSignalUpdates(() => refetch());

  const firings = data?.firings;
  const narrowed = !!outcome || replay || !!trigger || !!signal;

  const outcomeButton = (value: FiringOutcome | null, label: string) => (
    <PageAction
      size="sm"
      variant={outcome === value ? "secondary" : "outline"}
      aria-pressed={outcome === value}
      onClick={() => setOutcome(value)}
    >
      {label}
    </PageAction>
  );

  return (
    <PageLayout
      title="Firings"
      help={REKUEST_HELP.firings}
      pageActions={
        <>
          {trigger && (
            <PageAction
              size="sm"
              variant="secondary"
              icon={<X className="h-3.5 w-3.5" />}
              title="Show every trigger"
              onClick={() => setTrigger(null)}
            >
              One trigger
            </PageAction>
          )}
          {signal && (
            <PageAction
              size="sm"
              variant="secondary"
              icon={<X className="h-3.5 w-3.5" />}
              title="Show every signal"
              onClick={() => setSignal(null)}
            >
              One signal
            </PageAction>
          )}
          <PageActionGroup className="gap-0">
            {outcomeButton(null, "All")}
            {OUTCOMES.map((value) => (
              <span key={value} className="contents">
                {outcomeButton(value, OUTCOME_LABELS[value])}
              </span>
            ))}
          </PageActionGroup>
          <PageAction
            collapse="icon"
            priority={-10}
            icon={<RotateCcw className="h-4 w-4" />}
            variant={replay ? "default" : "outline"}
            aria-pressed={replay}
            onClick={() => setReplay(replay ? null : true)}
          >
            Fired by hand
          </PageAction>
        </>
      }
    >
      <div className="max-w-5xl p-6">
        <h1 className="mb-6 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
          Firings
        </h1>

        {error && !firings ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : !firings ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : firings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {narrowed
              ? "No firing matches these filters."
              : "No trigger has met a signal yet. A firing appears here whenever one does."}
          </p>
        ) : (
          <FiringsTable
            firings={firings}
            title={null}
            hide={trigger ? "trigger" : signal ? "signal" : undefined}
          />
        )}
        {firings && firings.length >= limit && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-muted-foreground"
            onClick={() => setLimit(limit + PAGE)}
          >
            Show more
          </Button>
        )}
      </div>
    </PageLayout>
  );
};

export default Page;
