import { PageLayout } from "@/components/layout/PageLayout";
import { Separator } from "@/components/ui/separator";

import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { HelpSidebar } from "@/components/sidebars/help";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { JustUsername } from "@/lok-next/components/UserAvatar";
import { Database } from "lucide-react";
import { parseAsBoolean, parseAsIsoDateTime, useQueryState } from "nuqs";
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
      pageActions={<>
        <>
          {/* 3. Picker updates the URL params */}
          <DateTimeRangePicker
            // Optional: bind value to keep picker UI in sync on page refresh
            initialDateFrom={createdAfter ?? undefined}
            initialDateTo={createdBefore ?? undefined}
            onUpdate={({ range }) => {
              setCreatedAfter(range.from || null);
              setCreatedBefore(range.to || null);
            }}
          /></>
        <Button variant={"outline"} onClick={() => {
          setParentless(parentless ? null : true);
        }}>
          {parentless ? "No Parent" : "All Data"}
        </Button>



      </>}
      sidebars={<Sidebars>
        <Sidebars.Tab label="Statistics"><PeerStatisticsSidebar sub={id} /></Sidebars.Tab>
        <Sidebars.Tab label="Help"><HelpSidebar /></Sidebars.Tab>
      </Sidebars>}
      title={
        <>
          <JustUsername sub={id} />
          {"'s Home"}
        </>
      }
    >
      <div className="space-y-8 p-3">
        {/* Welcome Header */}
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <JustUsername sub={id} />
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
