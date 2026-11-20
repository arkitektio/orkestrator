import { LokService } from "@/core/linkers";
import { useListSearch } from "@/core/layout/useListSearch";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { PageAction } from "@/core/ui/page-action";
import { useDialog } from "@/core/dialogs/registry";
import { Plus } from "lucide-react";
import ServiceList from "../components/lists/ServiceList";
import { LOK_HELP } from "../help";

/** The kinds of service a server can run. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();
  const { openDialog } = useDialog();

  return (
    <LokService.ListPage
      title="Services"
      help={LOK_HELP.services}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search services…" />
          {/* Registers a running instance of one of these services. */}
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
        <ServiceList title="" filters={filters} />
      </div>
    </LokService.ListPage>
  );
};

export default Page;
