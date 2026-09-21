import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { ListRender } from "@/components/layout/ListRender";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { PageAction, PageActionGroup } from "@/components/ui/page-action";
import { KabinetFlavour, KabinetRepo } from "@/linkers";
import { GitBranch, Github, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useGetRepoQuery, useScanRepoMutation } from "../api/graphql";
import FlavourCard from "../components/cards/FlavourCard";
import { RepoInfoSidebar } from "../components/sidebars/RepoInfoSidebar";

/**
 * A repository is its flavours: the body lists them and nothing else. What
 * the repo IS (branch, owner, links, when it was scanned) is the Info rail's
 * job, as on the mikro detail pages, so it is not repeated here.
 */
const RepoPage = asDetailQueryRoute(useGetRepoQuery, ({ data, refetch }) => {
  const repo = data.repo;
  // `ScanRepo` selects the full Repo, so the page updates from the cache.
  const [scan, { loading: scanning }] = useScanRepoMutation({
    variables: { id: repo.id },
  });

  const rescan = () =>
    scan()
      .then(() => toast.success("Rescanned"))
      .catch((e: Error) => toast.error("Could not rescan: " + e.message));

  return (
    <KabinetRepo.ModelPage
      title={repo.name}
      object={repo}
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <RepoInfoSidebar repo={repo} />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
      pageActions={
        <>
          <PageAction
            collapse="icon"
            icon={<RefreshCw className={"h-4 w-4" + (scanning ? " animate-spin" : "")} />}
            size="sm"
            onClick={rescan}
            disabled={scanning}
            title="Read the manifest again and pick up new flavours"
          >
            Rescan
          </PageAction>
          {/* Both lead off to the same repository, so they go together. */}
          <PageActionGroup priority={-10}>
            <PageAction asChild size="sm">
              <a href={repo.url} target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                Open Repo
              </a>
            </PageAction>
            <PageAction asChild size="sm">
              <a href={repo.issueUrl} target="_blank" rel="noreferrer">
                <ShieldAlert className="h-4 w-4" />
                Issues
              </a>
            </PageAction>
          </PageActionGroup>
        </>
      }
    >
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Github className="h-4 w-4" />
          <span className="break-all">
            {repo.user}/{repo.repo}
          </span>
          <Badge variant="secondary" className="gap-1 rounded-full px-2 py-0.5">
            <GitBranch className="h-3 w-3" />
            {repo.branch}
          </Badge>
        </div>

        <ListRender
          array={repo.flavours}
          title={
            <KabinetFlavour.ListLink className="flex-0 mb-5">
              <h2 className="text-2xl font-bold">Flavours</h2>
              <div className="text-muted-foreground text-xs mb-3">
                {repo.flavours.length} flavours discovered in this repository
              </div>
            </KabinetFlavour.ListLink>
          }
          refetch={refetch}
        >
          {(flavour) => <FlavourCard key={flavour.id} item={flavour} />}
        </ListRender>
      </div>
    </KabinetRepo.ModelPage>
  );
});

export default RepoPage;
