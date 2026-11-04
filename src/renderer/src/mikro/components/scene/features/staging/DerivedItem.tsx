import { useState, type ReactNode } from "react";
import { ArrowUpRightIcon, EyeIcon, LoaderIcon, type LucideIcon } from "lucide-react";

import { reportError } from "@/core/notify";
import { cn } from "@/core/util/utils";

import { useOptionalStagedLayersStoreApi, useStagedLayersStore } from "../../platform/float/stagedLayerStore";
import { useStagingOwner } from "./StageToggle";
import { useStaging, type StageSource } from "./useStaging";

/** How a row opens its object's page: the smart object's DetailLink, with these props. */
export type RenderLink = (props: { className: string; title?: string; children: ReactNode }) => ReactNode;

const ROW =
  "flex h-8 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 text-left text-xs outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:opacity-60";
const OPEN =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted";

/**
 * One thing made from a shape or an object, as a button.
 *
 * - Drawable here (a lens, a dataset's whole lens, a surface) and inside a
 *   float: the row itself SHOWS it in the scene — staged under the float, the
 *   row tinted while it is — and a second click takes it out again. The ↗
 *   beside it opens its page.
 * - Anything else (a table, a network, a shape), or outside a float: the row
 *   opens its page, or just names it when it has none (`renderLink` absent).
 */
export const DerivedItem = ({
  icon,
  label,
  source,
  shown,
  renderLink,
}: {
  icon: LucideIcon;
  label: string;
  /** What staging it would draw; absent for what the scene cannot draw. */
  source?: StageSource;
  /**
   * Something already in the scene that is drawn only on request (a shape
   * refined from this one): the row turns it on and off, nothing is staged.
   */
  shown?: { on: boolean; onToggle: () => void };
  renderLink?: RenderLink;
}) => {
  const owner = useStagingOwner();
  const stagedApi = useOptionalStagedLayersStoreApi();
  const Icon = icon;
  if (shown) {
    return (
      <li className="flex items-center gap-0.5">
        <button
          type="button"
          className={cn(ROW, shown.on && "bg-primary/10 text-primary hover:bg-primary/15")}
          aria-pressed={shown.on}
          title={shown.on ? "Shown in the scene — click to hide" : "Show in the scene"}
          onClick={shown.onToggle}
        >
          <Icon className={cn("h-3.5 w-3.5 shrink-0", !shown.on && "text-muted-foreground")} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {shown.on && <EyeIcon className="h-3.5 w-3.5 shrink-0" />}
        </button>
        {renderLink?.({ className: OPEN, title: "Open", children: <ArrowUpRightIcon className="h-3.5 w-3.5" /> })}
      </li>
    );
  }
  if (source && owner && stagedApi) {
    return <StageableItem icon={icon} label={label} source={source} owner={owner} renderLink={renderLink} />;
  }
  const body = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {renderLink && <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />}
    </>
  );
  return (
    <li className="flex">
      {renderLink ? renderLink({ className: ROW, children: body }) : <span className={ROW}>{body}</span>}
    </li>
  );
};

const StageableItem = ({
  icon: Icon,
  label,
  source,
  owner,
  renderLink,
}: {
  icon: LucideIcon;
  label: string;
  source: StageSource;
  owner: string;
  renderLink?: RenderLink;
}) => {
  const { stage, discard } = useStaging();
  const staged = useStagedLayersStore((state) =>
    state.entries.find((entry) => entry.owner === owner && entry.source === source.lens),
  );
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const toggle = () => {
    if (staged) {
      discard([staged.key]);
      return;
    }
    setBusy(true);
    stage(owner, source)
      .then((result) => {
        if (result.status === "present") setRefusal("Already in the scene");
        if (result.status === "unplaceable") setRefusal("Cannot be placed in this scene");
      })
      .catch((error: unknown) => reportError(error, "Couldn't show it in the scene"))
      .finally(() => setBusy(false));
  };

  const title = staged ? "Shown in the scene, not saved — click to take it out" : refusal ?? "Show in the scene";
  return (
    <li className="flex items-center gap-0.5">
      <button
        type="button"
        className={cn(ROW, staged && "bg-primary/10 text-primary hover:bg-primary/15")}
        aria-pressed={!!staged}
        title={title}
        disabled={busy || (!staged && refusal !== null)}
        onClick={toggle}
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", !staged && "text-muted-foreground")} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {busy ? (
          <LoaderIcon className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : staged ? (
          <EyeIcon className="h-3.5 w-3.5 shrink-0" />
        ) : refusal ? (
          <span className="shrink-0 text-[10px] text-muted-foreground">{refusal === "Already in the scene" ? "in scene" : "n/a"}</span>
        ) : null}
      </button>
      {renderLink?.({ className: OPEN, title: "Open", children: <ArrowUpRightIcon className="h-3.5 w-3.5" /> })}
    </li>
  );
};

/** A run of items under a one-word caption: what kind of making it was. */
export const DerivedGroup = ({ caption, children }: { caption: string; children: ReactNode }) => (
  <section className="flex flex-col">
    <h4 className="px-2.5 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">{caption}</h4>
    <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">{children}</ul>
  </section>
);
