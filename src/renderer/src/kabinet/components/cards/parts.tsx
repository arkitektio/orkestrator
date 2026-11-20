import React from "react";
import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { PodStatus } from "../../api/graphql";
import { POD_STATUS_DOT, POD_STATUS_RANK, podStatusLabel } from "../../lib/podStatus";

/**
 * The one anatomy every kabinet card shares, so a grid of pods, backends and
 * releases reads as one family: a lead tile, the name with one status word at
 * the right, one muted line, an optional body, and a quiet footer.
 *
 * `tone="failed"` draws the border in the destructive colour, so a broken item
 * stands out in a grid without a banner.
 */
export const KabinetCard = ({
  lead,
  title,
  aside,
  sub,
  children,
  footer,
  tone,
  className,
}: {
  lead: React.ReactNode;
  title: React.ReactNode;
  aside?: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "failed" | "muted";
  className?: string;
}) => (
  <Card
    className={cn(
      "group/kcard flex h-full flex-col gap-2.5 p-3 transition-colors hover:border-foreground/20",
      tone === "failed" && "border-destructive/40 hover:border-destructive/60",
      tone === "muted" && "opacity-60",
      className,
    )}
  >
    <div className="flex min-w-0 items-start gap-3">
      {lead}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <div className="min-w-0 truncate text-sm font-medium leading-tight">{title}</div>
          {aside && <div className="shrink-0 text-xs text-muted-foreground">{aside}</div>}
        </div>
        {sub && <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
    {children}
    {footer && (
      <div className="mt-auto flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground/70">
        {footer}
      </div>
    )}
  </Card>
);

/** The square a card leads with when it has no app icon: a muted tile around a glyph. */
export const LeadTile = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span
    className={cn(
      "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4",
      className,
    )}
  >
    {children}
  </span>
);

/** A status as a dot and its word. */
export const StatusWord = ({ status }: { status: PodStatus }) => (
  <span className="flex items-center gap-1.5">
    <span className={cn("size-1.5 shrink-0 rounded-full", POD_STATUS_DOT[status])} />
    {podStatusLabel(status)}
  </span>
);

/** How many of each status, most alive first; statuses with none are left out. */
export const tallyStatuses = (items: readonly { status: PodStatus }[]): [PodStatus, number][] => {
  const counts = new Map<PodStatus, number>();
  for (const { status } of items) counts.set(status, (counts.get(status) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => POD_STATUS_RANK[a] - POD_STATUS_RANK[b]);
};

/**
 * A thin bar split by status, for what runs many pods (a backend, a resource):
 * green when all is well, a red sliver when something failed. Nothing when
 * there is nothing to count.
 */
export const StatusBar = ({ items }: { items: readonly { status: PodStatus }[] }) => {
  if (items.length === 0) return null;
  const tally = tallyStatuses(items);
  return (
    <div
      className="flex h-1 w-full overflow-hidden rounded-full bg-muted"
      title={tally.map(([status, count]) => `${count} ${podStatusLabel(status).toLowerCase()}`).join(", ")}
    >
      {tally.map(([status, count]) => (
        <span
          key={status}
          className={cn("h-full", POD_STATUS_DOT[status])}
          style={{ width: `${(count / items.length) * 100}%` }}
        />
      ))}
    </div>
  );
};

/** "3 running · 1 failed", or `empty` when there is nothing. */
export const StatusTally = ({
  items,
  empty,
}: {
  items: readonly { status: PodStatus }[];
  empty: string;
}) => {
  if (items.length === 0) return <span>{empty}</span>;
  return (
    <span className="flex min-w-0 items-center gap-2 truncate">
      {tallyStatuses(items).map(([status, count]) => (
        <span key={status} className="flex items-center gap-1 tabular-nums">
          <span className={cn("size-1.5 shrink-0 rounded-full", POD_STATUS_DOT[status])} />
          {count} {podStatusLabel(status).toLowerCase()}
        </span>
      ))}
    </span>
  );
};

/** "1 flavour" / "3 flavours". */
export const plural = (count: number, word: string, many = `${word}s`) =>
  `${count} ${count === 1 ? word : many}`;
