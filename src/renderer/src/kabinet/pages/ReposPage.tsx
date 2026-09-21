import { PageLayout } from "@/components/layout/PageLayout";
import { PageAction } from "@/components/ui/page-action";
import { DialogButton } from "@/components/ui/dialog-button";
import { Separator } from "@/components/ui/separator";
import { ListDefinitionsDocument, ListReleasesDocument, useRescanReposMutation } from "../api/graphql";
import RepoList from "../components/lists/RepoList";

const ReposPage = () => {
  const [rescan, { loading }] = useRescanReposMutation({
    refetchQueries: [ListReleasesDocument, ListDefinitionsDocument],
  });

  return (
    <PageLayout
      title="Repos"
      pageActions={
        <>
          <DialogButton alwaysShow name="createrepo" variant="outline" size="sm" dialogProps={{}}>
            Add Repo
          </DialogButton>
          <PageAction
            priority={-10}
            onClick={async () => {
              await rescan();
            }}
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
