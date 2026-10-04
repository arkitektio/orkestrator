import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { PageLayout } from "@/core/layout/PageLayout";
import { RekuestService } from "@/core/linkers";
import { CommandActionIcon } from "@/core/smart/extensions/CommandActionRow";
import { Button } from "@/core/ui/button";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { Skeleton } from "@/core/ui/skeleton";
import { parseAsString, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { useListServicesQuery } from "@/rekuest/api/graphql";
import { describeService, matchesWords } from "@/rekuest/lib/service";
import { Server } from "lucide-react";
import { useMemo } from "react";
import { REKUEST_HELP } from "../help";

/**
 * The services of this hub as rekuest knows them: who sends signals and who
 * hosts which structures. The hub has a handful, sent in one answer, so the
 * search narrows them here.
 */
const Page = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const { data, error, refetch } = useListServicesQuery({ fetchPolicy: "cache-and-network" });
  const services = data?.services;

  const shown = useMemo(
    () =>
      (services ?? [])
        .filter((service) =>
          matchesWords(search, [service.name, service.identifier, service.description]),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [services, search],
  );

  return (
    <PageLayout
      title="Services"
      help={REKUEST_HELP.services}
      pageActions={
        <CollapsibleSearch
          alwaysShow
          value={search}
          onChange={(value) => setSearch(value || null)}
          placeholder="Search services…"
        />
      }
    >
      <div className="max-w-3xl p-6">
        <h1 className="mb-6 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
          Services
        </h1>

        {error && !services ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : !services ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
            {services.length > 0 ? (
              <>
                <p>No service matches “{search}”.</p>
                <Button variant="outline" size="sm" onClick={() => setSearch(null)}>
                  Clear search
                </Button>
              </>
            ) : (
              <p>
                No service has registered with rekuest yet. A service appears here once it
                declares the signals it sends or the structures it hosts.
              </p>
            )}
          </div>
        ) : (
          <div className="-mx-2 flex flex-col gap-0.5">
            {shown.map((service) => (
              <RekuestService.Smart key={service.id} object={service}>
                <RekuestService.DetailLink
                  object={service}
                  className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                >
                  <CommandActionIcon icon={Server} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-md text-foreground">
                      {service.name}
                      {service.identifier && (
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {service.identifier}
                        </span>
                      )}
                    </span>
                    {service.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {service.description}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {describeService({
                      signals: service.signals.length,
                      structures: service.structures.length,
                    })}
                  </span>
                </RekuestService.DetailLink>
              </RekuestService.Smart>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Page;
