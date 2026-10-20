import { useDialog } from "@/core/dialogs/registry";
import { Explainer } from "@/core/layout/Explainer";
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
        <Explainer
          title="Collaborations"
          description="A collaboration is what a guest of your organization sees: the objects you put in it, with what they need to be seen and what is part of them. Share it by link; whoever accepts sees nothing else."
        />
        <CollaborationList />
      </div>
    </MikroCollaboration.ListPage>
  );
};

export default Page;
