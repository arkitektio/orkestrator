import { LokServiceInstance } from "@/core/linkers";
import { useListSearch } from "@/core/layout/useListSearch";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { PageAction } from "@/core/ui/page-action";
import { useDialog } from "@/core/dialogs/registry";
import { Plus } from "lucide-react";
import InstancesList from "../components/lists/InstancesList";
import { LOK_HELP } from "../help";

/** The services deployed on this server. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();
  const { openDialog } = useDialog();

  return (
    <LokServiceInstance.ListPage
      title="Instances"
      help={LOK_HELP.instances}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search instances…" />
          <PageAction
            alwaysShow
            size="sm"
            collapse="icon"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openDialog("createserviceinstance", {})}
          >
            New Instance
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <InstancesList title="" filters={filters} />
      </div>
    </LokServiceInstance.ListPage>
  );
};

export default Page;
