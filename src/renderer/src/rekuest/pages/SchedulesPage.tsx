import { useDialog } from "@/core/dialogs/registry";
import { RekuestSchedule } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { Plus } from "lucide-react";
import ScheduleList from "../components/lists/ScheduleList";
import { REKUEST_HELP } from "../help";

const Page = () => {
  const { openDialog } = useDialog();

  return (
    <RekuestSchedule.ListPage
      title="Schedules"
      help={REKUEST_HELP.schedules}
      pageActions={
        <PageAction
          alwaysShow
          icon={<Plus className="h-4 w-4" />}
          onClick={() => openDialog("createschedule", {}, { size: "large" })}
        >
          New schedule
        </PageAction>
      }
    >
      <div className="p-6">
        <div className="mb-6 max-w-3xl">
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
            Schedules
          </h1>
          <p className="mt-2 text-muted-foreground">
            Actions that run on a clock: every few minutes, or on a calendar.
          </p>
        </div>
        <ScheduleList />
      </div>
    </RekuestSchedule.ListPage>
  );
};

export default Page;
