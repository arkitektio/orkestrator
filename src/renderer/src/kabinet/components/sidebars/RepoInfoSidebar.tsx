import { Badge } from "@/core/ui/badge";
import Timestamp from "@/core/ui/timestamp";
import { KabinetFlavour } from "@/core/linkers";
import { ExternalLink, Github } from "lucide-react";
import { GetRepoQuery } from "../../api/graphql";
import { selectorLabel } from "../cards/FlavourCard";

type PageRepo = GetRepoQuery["repo"];
type PageFlavour = PageRepo["flavours"][number];

/** The Info rail's tri-state wording, shared with mikro's rails. */
const EMPTY_FLAVOURS =
  "No flavours found. Rescan once the repository publishes a manifest.";

const ExternalRow = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="flex items-start gap-2 break-all text-xs text-primary hover:underline"
  >
    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
    <span>
      <span className="text-muted-foreground">{label}: </span>
      {href}
    </span>
  </a>
);

const FlavourRow = ({ flavour }: { flavour: PageFlavour }) => (
  <KabinetFlavour.Smart object={flavour}>
    <div className="flex flex-col gap-1 rounded-md border border-border/60 p-2 transition-colors hover:bg-accent/50">
      <KabinetFlavour.DetailLink
        object={flavour}
        className="break-all text-xs font-medium hover:underline"
      >
        {flavour.release.app.identifier}:{flavour.release.version}-{flavour.name}
      </KabinetFlavour.DetailLink>
      <div className="break-all font-mono text-[0.625rem] text-muted-foreground">
        {flavour.image.imageString}
      </div>
      <div className="text-[0.625rem] text-muted-foreground">
        built <Timestamp date={flavour.image.buildAt} relative />
      </div>
      {(flavour.selectors.length > 0 || flavour.requirements.length > 0) && (
        <div className="flex flex-row flex-wrap gap-1">
          {flavour.selectors.map((selector, index) => (
            <Badge
              key={`s${index}`}
              variant="secondary"
              className="px-1.5 py-0 text-[0.625rem] font-normal"
            >
              {selectorLabel(selector)}
            </Badge>
          ))}
          {/* What the flavour needs at runtime: one badge per service, the
              optional ones dimmed rather than hidden. */}
          {flavour.requirements.map((requirement) => (
            <Badge
              key={requirement.key}
              variant="outline"
              title={requirement.description ?? undefined}
              className={
                "px-1.5 py-0 text-[0.625rem] font-normal" +
                (requirement.optional ? " text-muted-foreground/60" : "")
              }
            >
              {requirement.service}
              {requirement.optional ? "?" : ""}
            </Badge>
          ))}
        </div>
      )}
    </div>
  </KabinetFlavour.Smart>
);

/**
 * Everything about the repository that is not its flavours' cards: where it
 * is, whose it is, when it was last looked at, and what each flavour is built
 * from and needs. The counterpart of mikro's `FileInfoSidebar`, section for
 * section, so the detail pages read the same way. All of it comes from the
 * page's own query; nothing here costs a round trip.
 */
export const RepoInfoSidebar = ({ repo }: { repo: PageRepo }) => (
  <div className="flex flex-col gap-4 overflow-y-auto p-4">
    <div className="flex flex-col gap-1">
      <h2 className="break-all text-lg font-semibold">{repo.name}</h2>
      <p className="flex items-center gap-1 break-all text-sm text-muted-foreground">
        <Github className="h-3.5 w-3.5 shrink-0" />
        {repo.user}/{repo.repo}
      </p>
    </div>

    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold">Repository</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">Branch</span>
        <span className="font-mono text-xs">{repo.branch}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">Owner</span>
        <span className="font-mono text-xs">{repo.user}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">Organization</span>
        <span className="break-all font-mono text-xs">
          {repo.organization?.slug || "Global"}
        </span>
      </div>
    </div>

    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold">Links</div>
      <ExternalRow href={repo.url} label="GitHub" />
      <ExternalRow href={repo.issueUrl} label="Issues" />
    </div>

    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold">Timeline</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">Added</span>
        <span className="text-xs" title={new Date(repo.addedAt).toLocaleString()}>
          <Timestamp date={repo.addedAt} relative />
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">Last scanned</span>
        <span className="text-xs" title={new Date(repo.updatedAt).toLocaleString()}>
          <Timestamp date={repo.updatedAt} relative />
        </span>
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-baseline justify-between gap-2">
        <div className="text-xs font-semibold">Flavours</div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {repo.flavours.length}
        </span>
      </div>
      {repo.flavours.length === 0 ? (
        <span className="text-xs text-muted-foreground">{EMPTY_FLAVOURS}</span>
      ) : (
        repo.flavours.map((flavour) => (
          <FlavourRow key={flavour.id} flavour={flavour} />
        ))
      )}
    </div>
  </div>
);

export default RepoInfoSidebar;
