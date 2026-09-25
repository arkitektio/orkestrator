import { StructureDisplay } from "@/core/components/display/StructureDisplay";
import { PageLayout } from "@/core/components/layout/PageLayout";
import { Separator } from "@/core/components/ui/separator";

import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { HelpSidebar } from "@/core/components/sidebars/help";
import { PageAction } from "@/core/components/ui/page-action";
import { CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { DateTimeRangePicker } from "@/core/components/ui/date-time-range-picker";

import { Database } from "lucide-react";
import { parseAsBoolean, parseAsIsoDateTime, useQueryState } from "@/core/hooks/use-search-param-state";
import { usePeerHomePageQuery } from "../api/graphql";
import FolderList from "../components/lists/FolderList";
import FileList from "../components/lists/FileList";
import ArrayDatasetList from "../components/lists/ArrayDatasetList";
import { PeerStatisticsSidebar } from "../components/sidebars/PeerStatisticsSidebar";

export interface IRepresentationScreenProps { }

const Page = asDetailQueryRoute(usePeerHomePageQuery, ({ id }) => {

  const [parentless, setParentless] = useQueryState(
    "parentless",
    parseAsBoolean
  );

  const [createdAfter, setCreatedAfter] = useQueryState(
    "after",
    parseAsIsoDateTime
  );

  const [createdBefore, setCreatedBefore] = useQueryState(
    "before",
    parseAsIsoDateTime
  );

  const temporalFilter = {
    createdAfter: createdAfter ?? undefined,
    createdBefore: createdBefore ?? undefined,
  };

  return (
    <PageLayout
      pageActions={
        <>
          <PageAction.Slot collapse="hide" priority={-20}>
            <DateTimeRangePicker
              initialDateFrom={createdAfter ?? undefined}
              initialDateTo={createdBefore ?? undefined}
              onUpdate={({ range }) => {
                setCreatedAfter(range.from || null);
                setCreatedBefore(range.to || null);
              }}
            />
          </PageAction.Slot>
          <PageAction
            onClick={() => {
              setParentless(parentless ? null : true);
            }}
          >
            {parentless ? "No Parent" : "All Data"}
          </PageAction>
        </>
      }
      sidebars={<Sidebars>
        <Sidebars.Tab label="Statistics"><PeerStatisticsSidebar sub={id} /></Sidebars.Tab>
        <Sidebars.Tab label="Help"><HelpSidebar /></Sidebars.Tab>
      </Sidebars>}
      title="Peer Home"
    >
      <div className="space-y-8 p-3">
        {/* Welcome Header */}
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <StructureDisplay identifier="@lok/user" id={id} variant="inline" />
            {"'s Data"}
          </CardTitle>
          <CardDescription className="text-lg">
            Their recently uploaded and managed data
          </CardDescription>
        </CardHeader>

        <ArrayDatasetList
          filters={{ notDerived: parentless ? true : undefined, owner: id, ...temporalFilter }}
        />
        <Separator className="my-4" />
        <FolderList
          filters={{ parentless: parentless ? true : undefined, owner: id, ...temporalFilter }}
        />
        <Separator className="my-4" />
        <FileList filters={{ owner: id, ...temporalFilter }} />
      </div>
    </PageLayout>
  );
});

export default Page;
