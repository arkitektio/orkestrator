import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ListRender } from "@/core/layout/ListRender";
import { Sidebars } from "@/core/layout/Sidebars";
import { Badge } from "@/core/ui/badge";
import { PageAction, PageActionGroup } from "@/core/ui/page-action";
import { KabinetFlavour, KabinetRepo } from "@/core/linkers";
import { Check, Code2, GitBranch, Github, RefreshCw, Share2, ShieldAlert } from "lucide-react";
import { reportErrorAs } from "@/core/notify";
import { useCopyToClipboard } from "@/core/ui/copy-button";
import { useGetRepoQuery, useScanRepoMutation } from "../api/graphql";
import FlavourCard from "../components/cards/FlavourCard";
import { RepoInfoSidebar } from "../components/sidebars/RepoInfoSidebar";
import { RepoBlokGrid } from "../components/store/RepoBlokCard";
import { installBadgeMarkdown, installRepoLink } from "../repoLink";
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

  // What you send a colleague: their Orkestrator opens on the install prompt
  // for this repository, whichever Kabinet they are on. The badge is the same
  // link dressed for a README, which is where an app repo advertises itself.
  // Each button flips to a check once copied.
  const coordinates = { user: repo.user, repo: repo.repo };
  const link = useCopyToClipboard();
  const badge = useCopyToClipboard();

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
          {/* Both hand this repo to someone else, so they go together. */}
          <PageActionGroup>
            <PageAction
              collapse="icon"
              icon={link.copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              size="sm"
              onClick={() => void link.copy(installRepoLink(coordinates))}
              title="Copy a link that prompts someone else to add this repo"
            >
              Copy install link
            </PageAction>
            <PageAction
              collapse="icon"
              icon={badge.copied ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
              size="sm"
              onClick={() => void badge.copy(installBadgeMarkdown(coordinates))}
              title="Copy the markdown for an 'Open in Arkitekt' README badge"
            >
              Copy README badge
            </PageAction>
          </PageActionGroup>
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
