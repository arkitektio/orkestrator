import { Button } from "@/components/ui/button";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { RekuestAction } from "@/linkers";
import ActionList from "@/rekuest/components/lists/ActionList";
import { parseAsIsoDateTime, useQueryState } from "@/hooks/use-search-param-state";
import { toast } from "sonner";
import { useCleanupActionsMutation } from "../api/graphql";


const Page = () => {

  const [clean] = useCleanupActionsMutation()

  const [createdAfter, setCreatedAfter] = useQueryState(
    " after",
    parseAsIsoDateTime
  );

  const [createdBefore, setCreatedBefore] = useQueryState(
    "before",
    parseAsIsoDateTime
  );

  const temporalFilter = {
    usedAfter: createdAfter ?? undefined,
    usedBefore: createdBefore ?? undefined,
  };


  return (
    <RekuestAction.ListPage title={"Actions"} pageActions={<>
      {/* 3. Picker updates the URL params */}
      <DateTimeRangePicker
        // Optional: bind value to keep picker UI in sync on page refresh
        initialDateFrom={createdAfter ?? undefined}
        initialDateTo={createdBefore ?? undefined}
        onUpdate={({ range }) => {
          setCreatedAfter(range.from || null);
          setCreatedBefore(range.to || null);
        }}
      />
      <Button variant="outline" onClick={() => {
        clean({
          variables: {
          }
        })
          .then((e) => {
            toast.success(`Cleanup ${e.data?.cleanupActions} Actions`)
          }
          )
      }}>Cleanup Implementationless</Button>
    </>} >
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-3">
          <div>
            <h1 className="scroll-m-20 font-extrabold tracking-tight lg:text-5xl">
              Your Actions
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Actions are actions that can be executed by the system. When
              assigning to a action, implementations are dynamically assigned :)
            </p>
          </div>
        </div>

        <ActionList filters={{ ...temporalFilter }} />
      </div>
    </RekuestAction.ListPage>
  );
};

export default Page;
