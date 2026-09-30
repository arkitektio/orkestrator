import { useDialog } from "@/core/dialogs/registry";
import { RekuestTrigger } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { Plus } from "lucide-react";
import TriggerList from "../components/lists/TriggerList";

const Page = () => {
  const { openDialog } = useDialog();

  return (
    <RekuestTrigger.ListPage
      title="Triggers"
      pageActions={
        <PageAction
          alwaysShow
          icon={<Plus className="h-4 w-4" />}
          onClick={() => openDialog("createtrigger", {}, { size: "medium" })}
        >
          New trigger
        </PageAction>
      }
    >
      <div className="p-6">
        <div className="mb-6 max-w-3xl">
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
            Triggers
          </h1>
          <p className="mt-2 text-muted-foreground">
            Actions that run when a service signals a new, changed or deleted object.
          </p>
        </div>
        <TriggerList />
      </div>
    </RekuestTrigger.ListPage>
  );
};

export default Page;
