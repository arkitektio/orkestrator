import { useDialog } from "@/core/dialogs/registry";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { PageLayout } from "@/core/layout/PageLayout";
import { RekuestWiregram } from "@/core/linkers";
import { CommandActionIcon } from "@/core/smart/extensions/CommandActionRow";
import { Button } from "@/core/ui/button";
import { PageAction } from "@/core/ui/page-action";
import { Skeleton } from "@/core/ui/skeleton";
import Timestamp from "@/core/ui/timestamp";
import { useListWiregramsQuery } from "@/rekuest/api/graphql";
import { FileJson, Upload } from "lucide-react";
import { useState } from "react";
import { REKUEST_HELP } from "../help";

const PAGE = 50;

/**
 * The automation documents this organization imported. Each owns the
 * schedules and triggers it created; importing its key again updates them.
 */
const Page = () => {
  const { openDialog } = useDialog();
  const [limit, setLimit] = useState(PAGE);
  const { data, error, refetch } = useListWiregramsQuery({
    variables: { pagination: { limit } },
    fetchPolicy: "cache-and-network",
  });
  const wiregrams = data?.wiregrams;
  const importOne = () => openDialog("importwiregram", {});

  return (
    <PageLayout
      title="Wiregrams"
      help={REKUEST_HELP.wiregrams}
      pageActions={
        <PageAction alwaysShow icon={<Upload className="h-4 w-4" />} onClick={importOne}>
          Import…
        </PageAction>
      }
    >
      <div className="max-w-3xl p-6">
        <h1 className="mb-6 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
          Wiregrams
        </h1>

        {error && !wiregrams ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : !wiregrams ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : wiregrams.length === 0 ? (
          <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
            <p>
              Nothing imported yet. A wiregram is a document of schedules and triggers: import one
              to create its rules here, or export your own automations as one.
            </p>
            <Button variant="outline" size="sm" onClick={importOne}>
              <Upload className="mr-1 h-4 w-4" />
              Import…
            </Button>
          </div>
        ) : (
          <div className="-mx-2 flex flex-col gap-0.5">
            {wiregrams.map((wiregram) => (
              <RekuestWiregram.Smart key={wiregram.id} object={wiregram}>
                <RekuestWiregram.DetailLink
                  object={wiregram}
                  className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                >
                  <CommandActionIcon icon={FileJson} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-md text-foreground">
                      {wiregram.name}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {wiregram.key}
                      </span>
                    </span>
                    {wiregram.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {wiregram.description}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    <Timestamp date={wiregram.updatedAt} relative />
                  </span>
                </RekuestWiregram.DetailLink>
              </RekuestWiregram.Smart>
            ))}
          </div>
        )}
        {wiregrams && wiregrams.length >= limit && (
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
