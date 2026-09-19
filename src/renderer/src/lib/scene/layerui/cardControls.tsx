/**
 * The control vocabulary every layer card in the Layers panel speaks. Shared
 * rather than copied so the cards cannot drift into three dialects:
 *
 *  - `LayerCardShell` is the card ITSELF: one collapsible surface with the
 *    5x5 icon tile, the 11px name, the trailing icon actions and the folded
 *    body every kind shares. A card supplies its identity and its sections;
 *    the shell owns the border, the fold and the click-to-toggle header.
 *  - SEGMENTED groups (`SegmentGroup` + `Segment`) for mutually-exclusive
 *    choices: one joined pill, the active segment filled sky.
 *  - ICON TOGGLES (`IconToggle`) for independent booleans: icon + label, sky
 *    when on, muted when off.
 *  - `CardSection` for a titled block: the label sits ABOVE its controls, the
 *    way the image card's render-graph editor stacks its groups, so a control
 *    gets the card's full width instead of whatever a leading label left over.
 *  - `EntryRow` for one item of a LIST the user picks from or toggles — a
 *    colouring, a filter rule. Full width, label over detail line, actions at
 *    the trailing edge.
 *  - Rows lead with a `RowLabel` — fixed width, so controls align down the
 *    card no matter how long the labels are. Prefer `CardSection` for anything
 *    wider than a couple of pills; a `RowLabel` row squeezes its control into
 *    the remainder, which is what made the colour/filter pickers unreadable.
 *  - `Badge` for facts the card states but the user cannot change.
 *
 * Keep to it when extending: a new control that invents its own shape makes
 * the card harder to read than the setting it adds is worth.
 */

import { ChevronDown } from "lucide-react";
import { memo } from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";

/**
 * The card surface, ONE dialect for every layer kind: `border-white/10
 * bg-black/40 backdrop-blur-md`, a slightly firmer border when unfolded, and
 * `opacity-50` for a hidden layer. `@container/card` makes the card its own
 * query context, so rows adapt to the width the CARD got — which in a
 * multi-column list is not the panel's width.
 */
export const layerCardShellClasses = (expanded: boolean, hidden: boolean): string =>
  `@container/card overflow-hidden rounded-lg border bg-black/40 backdrop-blur-md transition-colors ${
    expanded ? "border-white/25" : "border-white/10 hover:border-white/20"
  } ${hidden ? "opacity-50" : ""}`;

/**
 * The collapsible card every collection- and table-backed layer kind wears —
 * the sibling of the brick-backed cards' `LayerRow`-headed collapsible, built
 * from the same pieces so the panel reads as one list.
 *
 * The HEADER is the toggle: clicking anywhere on it folds the body, exactly
 * as clicking a `LayerRow` does on the image cards, and expansion shows as
 * the firmer border rather than a chevron — the panel's existing signal.
 * Trailing `actions` (save, visibility, remove, per-card toggles) live in a
 * container that stops propagation, so a button click never also toggles the
 * fold and the cards do not each have to remember to.
 *
 * NO open/close animation, same reason as the image card: the collapsible
 * height animation forced layout + paint of the whole editor subtree on every
 * toggle — the cards snap instead.
 */
export const LayerCardShell = ({
  icon,
  tile,
  title,
  badges,
  actions,
  hidden,
  expanded,
  onToggle,
  children,
}: {
  /** The kind glyph, sized by the caller (`h-3 w-3 text-…`). */
  icon: React.ReactNode;
  /** The icon tile's tint, e.g. `bg-emerald-400/15`. */
  tile: string;
  title: string;
  /** Facts beside the name — `Badge`s, a dirty-save button's spot is `actions`. */
  badges?: React.ReactNode;
  /** Trailing header buttons. Clicks here never toggle the fold. */
  actions?: React.ReactNode;
  hidden: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <Collapsible open={expanded} className={layerCardShellClasses(expanded, hidden)}>
    <div
      className="flex cursor-pointer items-center gap-1.5 px-2 py-1.5"
      title={expanded ? "Collapse the layer's controls" : "Unfold the layer's controls"}
      onClick={onToggle}
    >
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded ${tile}`}>
        {icon}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/90"
        title={title}
      >
        {title}
      </span>
      {badges}
      <div
        className="flex shrink-0 items-center"
        onClick={(event) => event.stopPropagation()}
      >
        {actions}
      </div>
    </div>
    <CollapsibleContent className="overflow-hidden">
      <div className="flex flex-col border-t border-white/10">{children}</div>
    </CollapsibleContent>
  </Collapsible>
);

/** Fixed-width row label, aligning every control row. */
export const RowLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="w-11 shrink-0 text-[9px] font-medium uppercase tracking-[0.08em] text-white/35">
    {children}
  </span>
);

/**
 * A titled block of controls: the label on its own line, the controls beneath
 * it with the card's full width. The image layer card's editor is a stack of
 * these (`RenderNodeEditor`'s groups), and mesh cards read as its sibling when
 * they are too.
 *
 * `action` is the block's one trailing affordance — an "add", a "clear" —
 * sitting on the title line rather than competing with the controls below it.
 */
export const CardSection = ({
  title,
  action,
  hint,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  /** A muted line under the controls: what the current state MEANS. */
  hint?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5 border-t border-white/5 px-2 py-2">
    <div className="flex min-h-4 items-center gap-1.5">
      <span className="flex-1 text-[9px] font-medium uppercase tracking-[0.08em] text-white/35">
        {title}
      </span>
      {action}
    </div>
    {children}
    {hint && <span className="text-[9px] leading-tight text-white/25">{hint}</span>}
  </div>
);

/**
 * One item of a list the card picks from or toggles: full width, so a column
 * name has room to be read rather than being clipped inside a pill.
 *
 * The label area is the CHOICE (one button, the whole row), and `actions` are
 * deliberately outside it — a configure or a remove is not a re-pick, and
 * nesting them in the same button made both ambiguous. `leadingAction` sits
 * outside it too, at the front: an apply-toggle for a rule whose row click
 * unfolds settings rather than toggling.
 *
 * A row with `children` UNFOLDS: the settings behind the entry (a colormap, a
 * range, a value set) render inline under the row when `expanded`, inside the
 * same border — a chevron on the row says so. Configuration happens where the
 * entry lives instead of in a popover beside it.
 */
export const EntryRow = ({
  active,
  title,
  onClick,
  leading,
  leadingAction,
  label,
  detail,
  actions,
  expanded,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  /** A swatch, a colormap chip, an icon — what this entry looks like. */
  leading?: React.ReactNode;
  /** A clickable affordance BEFORE the row button — its own click target. */
  leadingAction?: React.ReactNode;
  label: React.ReactNode;
  /** The second line: what the entry currently does. */
  detail?: React.ReactNode;
  actions?: React.ReactNode;
  /** Whether the settings body below the row is unfolded. */
  expanded?: boolean;
  /** The entry's settings, rendered inline when `expanded`. */
  children?: React.ReactNode;
}) => (
  <div
    className={`rounded-md border transition-colors ${
      active
        ? "border-sky-400/40 bg-sky-400/15"
        : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/5"
    }`}
  >
    <div className="flex items-center gap-1.5 px-1.5 py-1">
      {leadingAction}
      <button
        type="button"
        title={title}
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[10px] leading-tight ${
              active ? "font-medium text-sky-100" : "text-white/70"
            }`}
          >
            {label}
          </span>
          {detail && (
            <span className="block truncate text-[9px] leading-tight text-white/35">
              {detail}
            </span>
          )}
        </span>
        {children != null && (
          <ChevronDown
            className={`h-2.5 w-2.5 shrink-0 text-white/30 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        )}
      </button>
      {actions}
    </div>
    {expanded && children != null && (
      <div className="border-t border-white/10 bg-black/20 px-1.5 py-1.5">{children}</div>
    )}
  </div>
);

/** A small trailing affordance inside an `EntryRow` or a `CardSection` title. */
export const RowAction = ({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`grid h-4 w-4 shrink-0 place-items-center rounded transition-colors ${
      danger
        ? "text-white/30 hover:bg-red-400/10 hover:text-red-300"
        : "text-white/30 hover:bg-white/10 hover:text-white/90"
    }`}
  >
    {children}
  </button>
);

/** One segment of a joined segmented control. */
export const Segment = ({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    title={title}
    onClick={onClick}
    className={`px-1.5 py-0.5 text-[9px] leading-none transition-colors ${
      active
        ? "bg-sky-400/25 font-medium text-sky-100"
        : "text-white/45 hover:bg-white/5 hover:text-white/80"
    }`}
  >
    {children}
  </button>
);

export const SegmentGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-stretch overflow-hidden rounded-md border border-white/10 bg-black/30 divide-x divide-white/10">
    {children}
  </div>
);

/** An independent boolean: icon + label, sky when on. */
export const IconToggle = ({
  active,
  title,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    title={title}
    onClick={onClick}
    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] leading-none transition-colors ${
      active
        ? "border-sky-400/40 bg-sky-400/15 text-sky-100"
        : "border-white/10 bg-black/30 text-white/45 hover:text-white/80"
    }`}
  >
    {icon}
    {label}
  </button>
);

/**
 * The opacity block every layer card ends with. Memoized with primitive props
 * and (required-to-be) stable callbacks so a drag re-renders THIS row per
 * tick and nothing else in the card: the tick's store write changes the layer
 * object, the card body re-runs, and every other memoized section skips.
 *
 * `onCommit` is for cards whose live value and persisted value differ (the
 * label card folds per tick and saves on release); a card whose opacity is
 * session-only passes `onChange` alone.
 */
export const OpacityRow = memo(function OpacityRow({
  opacity,
  step = 1,
  onChange,
  onCommit,
}: {
  opacity: number;
  step?: number;
  onChange: (opacity: number) => void;
  onCommit?: (opacity: number) => void;
}) {
  const percent = Math.round(opacity * 100);
  return (
    <CardSection title="opacity">
      <div className="flex items-center gap-1.5">
        <Slider
          min={0}
          max={100}
          step={step}
          value={[percent]}
          onValueChange={([value]) => onChange(value / 100)}
          onValueCommit={onCommit ? ([value]) => onCommit(value / 100) : undefined}
          className="flex-1 py-1"
        />
        <span className="w-7 shrink-0 text-right font-mono text-[9px] text-white/40">
          {percent}%
        </span>
      </div>
    </CardSection>
  );
});

/** A fact the card states rather than a control. */
export const Badge = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) => (
  <span
    className="shrink-0 rounded border border-white/10 bg-white/5 px-1 py-px text-[9px] text-white/50"
    title={title}
  >
    {children}
  </span>
);

/** Compact counts: 1.2M / 3.4k / 812. */
export const formatCount = (value: number): string =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}k`
      : String(value);
