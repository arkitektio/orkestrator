import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { PageLayout } from "@/core/layout/PageLayout";
import { Sidebars } from "@/core/layout/Sidebars";
import { Button } from "@/core/ui/button";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { PageAction, PageActionGroup } from "@/core/ui/page-action";
import { Skeleton } from "@/core/ui/skeleton";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { SignalKind, useListSignalsQuery } from "@/rekuest/api/graphql";
import { useSignalUpdates } from "@/rekuest/lib/automationUpdates";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { X, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import SignalRow from "../components/automation/SignalRow";
import { REKUEST_HELP } from "../help";
import { SignalDeclarationsSidebar } from "../sidebars/SignalDeclarationsSidebar";

const PAGE = 50;
const KINDS = Object.values(SignalKind);

/**
 * What services announced about the organization's objects, newest first:
 * the feed triggers match against, with what each signal fired. Rules are
 * made from a signal (hover) or from what services declare (the sidebar).
 *
 * The search, the kind, "Fired something" and the `identifier` / `object` /
 * `service` a link arrives with are all the server's filters, so they reach
 * signals not loaded yet. New signals arrive by themselves.
 */
const Page = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [fired, setFired] = useQueryState("fired", parseAsBoolean.withDefault(false));
  const [kind, setKind] = useQueryState("kind", parseAsStringLiteral(KINDS));
  const [identifier, setIdentifier] = useQueryState("identifier", parseAsString);
  const [object, setObject] = useQueryState("object", parseAsString);
  const [service, setService] = useQueryState("service", parseAsString);
  const [limit, setLimit] = useState(PAGE);
  const term = useDebounce(search, 250).trim();

  const filters = useMemo(
    () => ({
      search: term || undefined,
      matched: fired || undefined,
      kind: kind ? [kind] : undefined,
      identifier: identifier ?? undefined,
      object: object ?? undefined,
      service: service ?? undefined,
    }),
    [term, fired, kind, identifier, object, service],
  );
  const { data, error, refetch } = useListSignalsQuery({
    variables: { filters, pagination: { limit } },
    fetchPolicy: "cache-and-network",
  });
  useSignalUpdates(() => refetch());

  // What a link narrowed the feed to, each with its way out.
  const chips = [
    identifier && { label: identifier, clear: () => setIdentifier(null) },
    object && { label: `#${object}`, clear: () => setObject(null) },
    service && { label: service, clear: () => setService(null) },
  ].filter((chip): chip is { label: string; clear: () => void } => !!chip);
  const narrowed = !!term || fired || !!kind || chips.length > 0;

  const signals = data?.signals;
  const kindButton = (value: SignalKind | null, label: string) => (
    <PageAction
      size="sm"
      variant={kind === value ? "secondary" : "outline"}
      aria-pressed={kind === value}
      onClick={() => setKind(value)}
    >
      {label}
    </PageAction>
  );

  return (
    <PageLayout
      title="Signals"
      help={REKUEST_HELP.signals}
      pageActions={
        <>
          <CollapsibleSearch
            alwaysShow
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search signals…"
          />
          {chips.map((chip) => (
            <PageAction
              key={chip.label}
              size="sm"
              variant="secondary"
              icon={<X className="h-3.5 w-3.5" />}
              title="Remove this filter"
              onClick={chip.clear}
            >
              <span className="font-mono text-xs">{chip.label}</span>
            </PageAction>
          ))}
          <PageActionGroup priority={-10} className="gap-0">
            {kindButton(null, "All")}
            {KINDS.map((value) => (
              <span key={value} className="contents capitalize">
                {kindButton(value, KIND_LABELS[value])}
              </span>
            ))}
          </PageActionGroup>
          <PageAction
            collapse="icon"
            icon={<Zap className="h-4 w-4" />}
            variant={fired ? "default" : "outline"}
            aria-pressed={fired}
            onClick={() => setFired(fired ? null : true)}
          >
            Fired something
          </PageAction>
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Declared">
            <SignalDeclarationsSidebar />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="max-w-5xl p-6">
        <h1 className="mb-6 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
          Signals
        </h1>

        {error && !signals ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : !signals ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {narrowed
              ? "No signal matches."
              : "No signals received yet. Services announce created, updated and deleted objects here."}
          </p>
        ) : (
          <div className="-mx-3 flex flex-col divide-y divide-border/40">
            {signals.map((signal) => (
              <SignalRow key={signal.id} item={signal} />
            ))}
          </div>
        )}
        {signals && signals.length >= limit && (
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
