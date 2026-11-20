import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageAction, PageActionGroup } from "@/core/ui/page-action";
import { KabinetRepo } from "@/core/linkers";
import { Github, RefreshCw, ShieldAlert } from "lucide-react";
import { reportErrorAs } from "@/core/notify";
import { useGetRepoQuery, useScanRepoMutation } from "../api/graphql";
import FlavourCard from "../components/cards/FlavourCard";
import { CardGrid, DetailSection } from "../components/DetailSection";
import { RepoInfoSidebar } from "../components/sidebars/RepoInfoSidebar";
import { RepoBlokGrid } from "../components/store/RepoBlokCard";
import { KABINET_HELP } from "../help";

/**
 * A repository is its flavours and the bloks it publishes on its own: the
 * body lists them and nothing else. What
 * the repo IS (branch, owner, links, when it was scanned) is the Info rail's
 * job, as on the mikro detail pages, so it is not repeated here.
 */
const RepoPage = asDetailQueryRoute(useGetRepoQuery, ({ data }) => {
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
      <div className="flex flex-col gap-6 p-3">
        <DetailSection title="Flavours" count={repo.flavours.length}>
          <CardGrid>
            {repo.flavours.map((flavour) => (
              <FlavourCard key={flavour.id} item={flavour} />
            ))}
          </CardGrid>
        </DetailSection>

        {/* Published in `.arkitekt/bloks.yaml`, apart from any app. */}
        <DetailSection title="Bloks" count={repo.bloks.length}>
          <RepoBlokGrid bloks={repo.bloks} />
        </DetailSection>
      </div>
    </KabinetRepo.ModelPage>
  );
});

export default RepoPage;
