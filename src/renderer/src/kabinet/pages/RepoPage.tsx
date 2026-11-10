import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ListRender } from "@/core/layout/ListRender";
import { Sidebars } from "@/core/layout/Sidebars";
import { Badge } from "@/core/ui/badge";
import { PageAction, PageActionGroup } from "@/core/ui/page-action";
import { KabinetFlavour, KabinetRepo } from "@/core/linkers";
import { GitBranch, Github, RefreshCw, ShieldAlert } from "lucide-react";
import { reportErrorAs } from "@/core/notify";
import { useGetRepoQuery, useScanRepoMutation } from "../api/graphql";
import FlavourCard from "../components/cards/FlavourCard";
import { RepoInfoSidebar } from "../components/sidebars/RepoInfoSidebar";
import { RepoBlokGrid } from "../components/store/RepoBlokCard";
import { KABINET_HELP } from "../help";

/**
 * A repository is its flavours and the bloks it publishes on its own: the
 * body lists them and nothing else. What
 * the repo IS (branch, owner, links, when it was scanned) is the Info rail's
 * job, as on the mikro detail pages, so it is not repeated here.
 */
const RepoPage = asDetailQueryRoute(useGetRepoQuery, ({ data, refetch }) => {
  const repo = data.repo;
  // `ScanRepo` selects the full Repo, so the page updates from the cache.
  const [scan, { loading: scanning }] = useScanRepoMutation({
    variables: { id: repo.id },
  });

  const rescan = () => scan().catch(reportErrorAs("Couldn't rescan the repository"));

  return (
    <KabinetRepo.ModelPage
      title={repo.name}
      object={repo}
      help={KABINET_HELP.repo}
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
            title="Read the repository again and pick up new flavours and bloks"
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
      <div className="p-3 space-y-4">
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

        {repo.bloks.length > 0 && (
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-2xl font-bold">Bloks</h2>
              <div className="text-xs text-muted-foreground">
                {repo.bloks.length} bloks published in <code>.arkitekt/bloks.yaml</code>
              </div>
            </div>
            <RepoBlokGrid bloks={repo.bloks} />
          </section>
        )}
      </div>
    </KabinetRepo.ModelPage>
  );
});

export default RepoPage;
