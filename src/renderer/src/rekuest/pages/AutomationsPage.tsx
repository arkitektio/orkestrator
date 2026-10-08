import { useDialog } from "@/core/dialogs/registry";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { PageLayout } from "@/core/layout/PageLayout";
import { Button } from "@/core/ui/button";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { PageAction, PageActionGroup } from "@/core/ui/page-action";
import { Skeleton } from "@/core/ui/skeleton";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { useListSchedulesQuery, useListTriggersQuery } from "@/rekuest/api/graphql";
import {
  AutomationKind,
  scheduleRow,
  sortAutomations,
  triggerRow,
} from "@/rekuest/lib/automation";
import { useRuleUpdates } from "@/rekuest/lib/automationUpdates";
import { AlarmClock, AlertTriangle, Plus, Share, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import AutomationRowItem from "../components/automation/AutomationRow";
import { REKUEST_HELP } from "../help";

const KINDS = ["clock", "signal"] as const;
const PAGE = 50;

/**
 * Everything that runs by itself, in one list: actions on a clock
 * (schedules) and actions on a signal (triggers). Each row is the rule as a
 * sentence and where it stands; what needs a look comes first.
 *
 * The backend lists the two apart, so both are loaded up to one shared
 * limit and merged here. The search and "Failing" are the server's filters
 * (the search reads a rule's name and description, its action, agent and
 * interface, what sets it off and its wiregram), so they reach rules not
 * loaded yet.
 */
const Page = () => {
  const { openDialog } = useDialog();
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [kind, setKind] = useQueryState("kind", parseAsStringLiteral(KINDS));
  const [failing, setFailing] = useQueryState("failing", parseAsBoolean.withDefault(false));
  const [limit, setLimit] = useState(PAGE);
  const term = useDebounce(search, 250).trim();

  const filters = useMemo(
    () => ({ search: term || undefined, failing: failing || undefined }),
    [term, failing],
  );
  const schedules = useListSchedulesQuery({
    variables: { filters, pagination: { limit } },
    skip: kind === "signal",
    fetchPolicy: "cache-and-network",
  });
  const triggers = useListTriggersQuery({
    variables: { filters, pagination: { limit } },
    skip: kind === "clock",
    fetchPolicy: "cache-and-network",
  });
  useRuleUpdates(() => {
    if (kind !== "signal") schedules.refetch();
    if (kind !== "clock") triggers.refetch();
  });

  const scheduleItems = kind === "signal" ? undefined : schedules.data?.schedules;
  const triggerItems = kind === "clock" ? undefined : triggers.data?.triggers;

  const rows = useMemo(
    () =>
      sortAutomations([
        ...(scheduleItems ?? []).map((schedule) => scheduleRow(schedule)),
        ...(triggerItems ?? []).map(triggerRow),
      ]),
    [scheduleItems, triggerItems],
  );
  const narrowed = !!term || failing;

  const error = (kind !== "signal" && schedules.error) || (kind !== "clock" && triggers.error);
  const loaded =
    (kind === "signal" || !!schedules.data) && (kind === "clock" || !!triggers.data);
  const more = (scheduleItems?.length ?? 0) >= limit || (triggerItems?.length ?? 0) >= limit;
  const create = () => openDialog("createautomation", { kind: kind ?? undefined });

  const kindButton = (value: AutomationKind | null, label: string, icon?: React.ReactNode) => (
    <PageAction
      size="sm"
      icon={icon}
      variant={kind === value ? "secondary" : "outline"}
      aria-pressed={kind === value}
      onClick={() => setKind(value)}
    >
      {label}
    </PageAction>
  );

  return (
    <PageLayout
      title="Automations"
      help={REKUEST_HELP.automations}
      pageActions={
        <>
          <CollapsibleSearch
            alwaysShow
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search automations…"
          />
          <PageActionGroup priority={-10} className="gap-0">
            {kindButton(null, "All")}
            {kindButton("clock", "Clock", <AlarmClock className="h-4 w-4" />)}
            {kindButton("signal", "Signal", <Zap className="h-4 w-4" />)}
          </PageActionGroup>
          <PageAction
            collapse="icon"
            priority={-15}
            icon={<AlertTriangle className="h-4 w-4" />}
            variant={failing ? "default" : "outline"}
            aria-pressed={failing}
            onClick={() => setFailing(failing ? null : true)}
          >
            Failing
          </PageAction>
          <PageAction
            collapse="menu"
            priority={-20}
            icon={<Share className="h-4 w-4" />}
            onClick={() => openDialog("exportwiregram", {})}
          >
            Export…
          </PageAction>
          <PageAction alwaysShow icon={<Plus className="h-4 w-4" />} onClick={create}>
            New automation
          </PageAction>
        </>
      }
    >
      <div className="max-w-3xl p-6">
        <h1 className="mb-6 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
          Automations
        </h1>

        {error && !loaded ? (
          <QueryError
            error={error}
            onRetry={() => {
              schedules.refetch();
              triggers.refetch();
            }}
          />
        ) : !loaded ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
            {narrowed ? (
              <>
                <p>
                  {term
                    ? `No ${failing ? "failing " : ""}automation matches “${term}”.`
                    : "No automation is failing."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch(null);
                    setFailing(null);
                  }}
                >
                  Show all
                </Button>
              </>
            ) : (
              <>
                <p>Nothing runs by itself yet. Put an action on a clock, or run it when data changes.</p>
                <Button variant="outline" size="sm" onClick={create}>
                  <Plus className="mr-1 h-4 w-4" />
                  New automation
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="-mx-2 flex flex-col gap-0.5">
              {rows.map((row) => (
                <AutomationRowItem key={`${row.kind}:${row.id}`} row={row} />
              ))}
            </div>
            {more && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-muted-foreground"
                onClick={() => setLimit(limit + PAGE)}
              >
                Show more
              </Button>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default Page;
