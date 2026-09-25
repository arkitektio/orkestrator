import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { ListRender } from "@/core/components/layout/ListRender";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { Badge } from "@/core/components/ui/badge";
import { PageAction, PageActionGroup } from "@/core/components/ui/page-action";
import { KabinetFlavour, KabinetRepo } from "@/core/linkers";
import { Code2, GitBranch, Github, RefreshCw, Share2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useGetRepoQuery, useScanRepoMutation } from "../api/graphql";
import FlavourCard from "../components/cards/FlavourCard";
import { RepoInfoSidebar } from "../components/sidebars/RepoInfoSidebar";
import { installBadgeMarkdown, installRepoLink } from "../repoLink";
import { copyText } from "@/core/lib/universalLink";

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

  // What you send a colleague: their Orkestrator opens on the install prompt
  // for this repository, whichever Kabinet they are on. The badge is the same
  // link dressed for a README, which is where an app repo advertises itself.
  const copyShare = (what: "link" | "badge") => async () => {
    const coordinates = { user: repo.user, repo: repo.repo };
    const text = what === "link" ? installRepoLink(coordinates) : installBadgeMarkdown(coordinates);
    if (await copyText(text)) toast.success(what === "link" ? "Install link copied" : "Badge copied", { description: text });
    else toast.error("Could not copy it");
  };

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
          {/* Both hand this repo to someone else, so they go together. */}
          <PageActionGroup>
            <PageAction
              collapse="icon"
              icon={<Share2 className="h-4 w-4" />}
              size="sm"
              onClick={copyShare("link")}
              title="Copy a link that prompts someone else to add this repo"
            >
              Copy install link
            </PageAction>
            <PageAction
              collapse="icon"
              icon={<Code2 className="h-4 w-4" />}
              size="sm"
              onClick={copyShare("badge")}
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
