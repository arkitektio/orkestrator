import { useDialog } from "@/core/dialogs/registry";
import { MikroCollaboration } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { PlusIcon } from "lucide-react";
import CollaborationList from "../components/lists/CollaborationList";

const Page = () => {
  const { openDialog } = useDialog();

  return (
    <MikroCollaboration.ListPage
      title="Collaborations"
      pageActions={
        <PageAction
          alwaysShow
          size="sm"
          icon={<PlusIcon className="h-4 w-4" />}
          onClick={() => openDialog("createcollaboration", {}, { size: "medium" })}
        >
          New
        </PageAction>
      }
    >
      <div className="p-3">
        <CollaborationList />
      </div>
    </MikroCollaboration.ListPage>
  );
};

export default Page;
