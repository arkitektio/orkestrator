import type { LucideIcon } from "lucide-react";
import React from "react";
import { cn } from "@/core/util/utils";

/**
 * The card every data grid shares, first drawn for the Mikro home's recent
 * data: rounded, lightly tinted, a header with the kind's glyph and the name,
 * a muted line of facts, and the content filling the rest.
 *
 * The tint is the card's identity, and every tint is a brand-hue token
 * (`primary`, `chart-N`), so the grid repaints with the brand: kinds differ by
 * the token's lightness and strength, plus their glyph, never by a hue of
 * their own. A mixed grid still reads by kind at a glance.
 */
export const CARD_TONES = {
  file: { frame: "border-primary/15 bg-primary/5 hover:border-primary/30", icon: "text-primary/70" },
  image: { frame: "border-chart-3/25 bg-chart-3/10 hover:border-chart-3/45", icon: "text-chart-3" },
  table: { frame: "border-chart-5/25 bg-chart-5/10 hover:border-chart-5/45", icon: "text-chart-5" },
  geometry: { frame: "border-chart-1/30 bg-chart-1/10 hover:border-chart-1/50", icon: "text-chart-4" },
  /** An app or an agent: something that runs, rather than data. */
  app: { frame: "border-chart-2/25 bg-chart-2/10 hover:border-chart-2/45", icon: "text-chart-2" },
  /** An interface (a blok): something to look at and use, neither data nor a thing that runs. */
  interface: { frame: "border-chart-4/25 bg-chart-4/10 hover:border-chart-4/45", icon: "text-chart-4" },
  /** The theme colour itself: tasks, connected agents. */
  brand: { frame: "border-primary/25 bg-primary/10 hover:border-primary/45", icon: "text-primary" },
  /** No tint: a plain card (tasks), where only a status pill carries colour. */
  plain: { frame: "border-border bg-card hover:border-foreground/20", icon: "text-muted-foreground" },
} as const;

export type CardTone = keyof typeof CARD_TONES;

/**
 * One card outside a bento: square, so a grid of them reads as tiles
 * whatever its column width.
 */
export const CARD_FRAME_SIZE = "aspect-square";

/** The narrowest a card in a grid gets, in px: small tiles, many to a row. */
export const CARD_FRAME_MIN_WIDTH = 150;

/**
 * A wide card (a task: a name, a message, its state) is landscape rather than
 * square, small, many to a row.
 */
export const CARD_FRAME_WIDE_SIZE = "aspect-[3/2]";
export const CARD_FRAME_WIDE_MIN_WIDTH = 170;

/** A grid of square frames, many to a row, without the bento's spans. */
export const CARD_FRAME_GRID = "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5";

/**
 * A card's state, as the colour of the whole card: the state reads from a
 * grid at a glance, before any text. It takes the place of the card's tone
 * (and of an identity `tint`).
 * - `good`: green — online, done.
 * - `live`: the brand — working right now.
 * - `idle`: grey — offline, queued, cancelled.
 * - `attention`: yellow — held, paused, lost, only recently active.
 * - `failed`: red — failed, blocked.
 */
export type CardStatus = {
  tone: "good" | "live" | "idle" | "attention" | "failed";
  /** Said on hover. */
  label?: string;
};

const STATUS_FRAME: Record<CardStatus["tone"], string> = {
  good: "border-success/35 bg-success/10 hover:border-success/55",
  live: "border-primary/35 bg-primary/10 hover:border-primary/55",
  idle: "border-border bg-muted/40 hover:border-foreground/20",
  attention: "border-warning/45 bg-warning/10 hover:border-warning/65",
  failed: "border-destructive/45 bg-destructive/10 hover:border-destructive/65",
};

const PILL: Record<CardStatus["tone"], { pill: string; dot: string }> = {
  good: { pill: "bg-success/15 text-success", dot: "bg-success" },
  live: { pill: "bg-primary/15 text-primary", dot: "bg-primary animate-pulse" },
  idle: { pill: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
  attention: { pill: "bg-warning/20 text-warning-foreground dark:text-warning", dot: "bg-warning" },
  failed: { pill: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
};

/**
 * A state as a small pill (a coloured dot and its word) for a card's header:
 * the card keeps the theme colour, and the pill says what state it is in.
 */
export const StatusPill = ({ tone, children }: { tone: CardStatus["tone"]; children: React.ReactNode }) => (
  <span
    className={cn(
      "inline-flex max-w-24 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
      PILL[tone].pill,
    )}
  >
    <span className={cn("size-1.5 shrink-0 rounded-full", PILL[tone].dot)} />
    <span className="truncate">{children}</span>
  </span>
);

/**
 * A card's leading logo with its state as a bead on the corner: the same
 * state as the band, beside the name. `bead` is the glyph (a status dot, a
 * task's state icon); `label` is said and shown on hover.
 */
export const LeadWithBead = ({
  children,
  bead,
  label,
}: {
  children: React.ReactNode;
  bead: React.ReactNode;
  label: string;
}) => (
  <span className="relative inline-flex shrink-0">
    {children}
    <span
      title={label}
      className="absolute -bottom-1 -right-1 flex size-3 items-center justify-center rounded-full bg-background ring-1 ring-foreground/10 [&_svg]:size-2.5"
    >
      {bead}
      <span className="sr-only">{label}</span>
    </span>
  </span>
);

/**
 * One fact of a stacked card: a small glyph and its words, on a line of its
 * own. A fact without a glyph lines up with the ones that have one.
 */
export type CardFact = {
  icon?: LucideIcon;
  /** Drawn in the icon's place: a status dot, a state's own icon. */
  glyph?: React.ReactNode;
  content: React.ReactNode;
  title?: string;
  className?: string;
  /** Pinned to the card's foot (where it runs, when) instead of under the name. */
  at?: "end";
};

const isCardFact = (fact: unknown): fact is CardFact =>
  !!fact && typeof fact === "object" && "content" in fact && !React.isValidElement(fact);

export const CardFrame = ({
  tone,
  icon: Icon,
  iconLabel,
  leading,
  title,
  facts,
  stacked,
  menu,
  quiet,
  tint,
  watermark,
  status,
  badge,
  footer,
  className,
  children,
}: {
  tone: CardTone;
  icon?: LucideIcon;
  iconLabel?: string;
  /** Drawn in the glyph's place: a logo of its own. */
  leading?: React.ReactNode;
  /** The name, as the link that opens it. */
  title: React.ReactNode;
  facts: (string | React.ReactNode | CardFact)[];
  /**
   * Every fact on a line of its own (agents, tasks, tables): the facts under
   * the name, the ones marked `at: "end"` at the card's foot. Otherwise one
   * line of facts under the name (the Mikro home's bento cards, whose picture
   * needs room).
   */
  stacked?: boolean;
  /** The card's menu burger sits in the header's corner: keep the name clear of it. */
  menu?: boolean;
  /** Present but not available (an offline agent): the whole card steps back. */
  quiet?: boolean;
  /**
   * A colour of the card's own in place of its tone's (an agent wears its
   * app's, `identityColor`): `background` paints the card, `border` its edge.
   * Keep the background light; the content sits on it.
   */
  tint?: { background: string; border: string };
  /**
   * Drawn large and very faint behind the content (an agent's logo): the
   * card's identity as texture, not as something to read.
   */
  watermark?: React.ReactNode;
  /** The card's state, as its colour (`CardStatus`); wins over `tone` and `tint`. */
  status?: CardStatus;
  /** At the end of the header row, after the name (a task's state pill). */
  badge?: React.ReactNode;
  /** At the bottom right, beside the foot facts (an agent's restart button). */
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) => (
  <div
    className={cn(
      "group/frame relative isolate flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border p-2 transition-colors",
      status ? STATUS_FRAME[status.tone] : tint ? "hover:brightness-[1.03]" : CARD_TONES[tone].frame,
      quiet && "opacity-70 saturate-50 hover:opacity-100 hover:saturate-100",
      className,
    )}
    style={!status && tint ? { backgroundImage: tint.background, borderColor: tint.border } : undefined}
    title={status?.label}
  >
    {watermark && (
      <div
        aria-hidden
        // Sized by the card (two thirds of its width, a corner tucked past
        // its edge) so it covers about half of any card, tilted.
        className="pointer-events-none absolute -bottom-[10%] -right-[10%] -z-10 aspect-square w-[66%] rotate-[-12deg] opacity-[0.08] [&>*]:h-full [&>*]:w-full"
      >
        {watermark}
      </div>
    )}
    <div className={cn("flex min-w-0 items-center gap-2 px-1 pt-0.5 text-sm font-medium", menu && "pr-7")}>
      {leading ?? (Icon && <Icon className={cn("h-4 w-4 shrink-0", CARD_TONES[tone].icon)} aria-label={iconLabel} />)}
      {title}
      {badge && <span className="ml-auto shrink-0">{badge}</span>}
    </div>
    {facts.length > 0 &&
      (stacked ? (
        <FactLines facts={facts.filter((fact) => !(isCardFact(fact) && fact.at === "end"))} />
      ) : (
        // Wraps rather than cutting a fact off: a card says all of its line.
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-xs tabular-nums text-muted-foreground">
          {facts.map((fact, index) => (
            <span key={index} className={cn("flex min-w-0 items-center gap-1.5", typeof fact === "string" && "break-words")}>
              {index > 0 && <span aria-hidden>·</span>}
              {isCardFact(fact) ? fact.content : fact}
            </span>
          ))}
        </div>
      ))}
    {children && <div className="relative min-h-0 flex-1">{children}</div>}
    {((stacked && facts.some((fact) => isCardFact(fact) && fact.at === "end")) || footer) && (
      // The foot: pushed to the bottom whether or not the card has a body.
      <div className="mt-auto flex min-w-0 items-end gap-1">
        {stacked && (
          <FactLines
            className="min-w-0 flex-1"
            facts={facts.filter((fact) => isCardFact(fact) && fact.at === "end")}
          />
        )}
        {footer && <div className="ml-auto shrink-0">{footer}</div>}
      </div>
    )}
  </div>
);

/** Stacked facts, one per line, each led by its glyph in a column of its own. */
const FactLines = ({ facts, className }: { facts: (string | React.ReactNode | CardFact)[]; className?: string }) => (
  <ul className={cn("flex min-w-0 flex-col gap-1 px-1 text-xs tabular-nums text-muted-foreground", className)}>
    {facts.map((fact, index) => {
      const { icon: FactIcon, glyph, content, title, className: factClass }: CardFact = isCardFact(fact)
        ? fact
        : { content: fact };
      return (
        <li key={index} className={cn("flex min-w-0 items-center gap-1.5", factClass)} title={title}>
          <span className="flex w-3.5 shrink-0 justify-center">
            {glyph ?? (FactIcon && <FactIcon className="h-3.5 w-3.5 opacity-70" />)}
          </span>
          <span className="min-w-0 truncate">{content}</span>
        </li>
      );
    })}
  </ul>
);
