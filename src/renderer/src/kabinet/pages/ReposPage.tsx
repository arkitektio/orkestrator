import { reportErrorAs } from "@/core/notify";
import { KabinetRepo } from "@/core/linkers";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { PageAction } from "@/core/ui/page-action";
import { useDialog } from "@/core/dialogs/registry";
import { PackageOpen, Plus, RefreshCw } from "lucide-react";
import { ListDefinitionsDocument, ListReleasesDocument, useRescanReposMutation } from "../api/graphql";
import { useListSearch } from "../components/ListSearch";
import RepoList from "../components/lists/RepoList";
import { KABINET_HELP } from "../help";

/** Every repository Kabinet reads apps from. */
const ReposPage = () => {
  const { openDialog } = useDialog();
  const { search, setSearch, filters } = useListSearch();
  const [rescan, { loading }] = useRescanReposMutation({
    refetchQueries: [ListReleasesDocument, ListDefinitionsDocument],
  });

  return (
    <KabinetRepo.ListPage
      title="Repos"
      help={KABINET_HELP.repos}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search repos…" />
          <PageAction
            alwaysShow
            size="sm"
            collapse="icon"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openDialog("createrepo", {})}
          >
            Add Repo
          </PageAction>
          <PageAction
            size="sm"
            collapse="icon"
            icon={<PackageOpen className="h-4 w-4" />}
            onClick={() => openDialog("importocirepo", {})}
          >
            Import from registry
          </PageAction>
          <PageAction
            priority={-10}
            size="sm"
            collapse="icon"
            icon={<RefreshCw className={"h-4 w-4" + (loading ? " animate-spin" : "")} />}
            disabled={loading}
            onClick={() => rescan().catch(reportErrorAs("Couldn't rescan the repositories"))}
          >
            Rescan Repos
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <RepoList title="" filters={filters} defaultLimit={40} />
      </div>
    </KabinetRepo.ListPage>
  );
};

export default ReposPage;
