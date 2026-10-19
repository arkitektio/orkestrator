import { reportErrorAs } from "@/core/notify";
import { PageLayout } from "@/core/layout/PageLayout";
import { PageAction } from "@/core/ui/page-action";
import { DialogButton } from "@/core/ui/dialog-button";
import { Separator } from "@/core/ui/separator";
import { ListDefinitionsDocument, ListReleasesDocument, useRescanReposMutation } from "../api/graphql";
import RepoList from "../components/lists/RepoList";
import { KABINET_HELP } from "../help";

const ReposPage = () => {
  const [rescan, { loading }] = useRescanReposMutation({
    refetchQueries: [ListReleasesDocument, ListDefinitionsDocument],
  });

  return (
    <PageLayout
      title="Repos"
      help={KABINET_HELP.repos}
      pageActions={
        <>
          <DialogButton alwaysShow name="createrepo" variant="outline" size="sm" dialogProps={{}}>
            Add Repo
          </DialogButton>
          <DialogButton alwaysShow name="importocirepo" variant="outline" size="sm" dialogProps={{}}>
            Import from registry
          </DialogButton>
          <PageAction
            priority={-10}
            onClick={() => rescan().catch(reportErrorAs("Couldn't rescan the repositories"))}
            size="sm"
          >
            {loading ? "Rescanning..." : "Rescan Repos"}
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <RepoList />
        <Separator className="mt-8 mb-2" />
      </div>
    </PageLayout>
  );
};

export default ReposPage;
