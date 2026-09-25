import { cn } from "@/core/lib/utils";
import { X } from "lucide-react";

/**
 * The card a thing pops out of a view with — a section clicked in the 3D
 * neuron, a recording site on a timeline track. One look for "what is this
 * point": an eyebrow naming the KIND, a title naming the THING, then facts in
 * a fixed label column with mono values, grouped by small section headers.
 *
 * It carries its own surface (the popover's: theme tokens, ring, shadow), so
 * it reads the same floating over a canvas as it does inside a Radix
 * `PopoverContent` — for the latter, strip the content's own surface
 * (`POPOUT_CONTENT_CLASS`) and let the card be the surface.
 *
 * The header stays put; the body scrolls, capped well inside the frame, so a
 * thing with many facts grows a scrollbar rather than a card taller than the
 * viewport.
 *
 * `aside` expands the SAME card to the right: the facts keep their column, the
 * aside (a trace opened inline, say) sits beside them under the one header,
 * behind a hairline — one surface, never a card beside a card.
 */

/** For a `PopoverContent` hosting the card: the card is the surface, not the content. */
export const POPOUT_CONTENT_CLASS = "w-auto bg-transparent p-0 shadow-none ring-0";

export const ThreeDPopoutCard = ({
  eyebrow,
  title,
  titleHint,
  swatch,
  onClose,
  aside,
  className,
  children,
}: {
  /** What KIND of thing this is ("Recording site", "Section"). */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Tooltip for a title that may truncate. */
  titleHint?: string;
  /** A CSS colour dotted before the title (the thing's colour in the view). */
  swatch?: string | null;
  /** Shows a close button when given (a pinned card; a popover closes itself). */
  onClose?: () => void;
  /** Content beside the facts, widening the card to the right. */
  aside?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) => (
  <div
    className={cn(
      "flex max-h-[min(22rem,60vh)] flex-col overflow-hidden rounded-lg bg-popover text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10",
      aside ? "w-auto" : "w-64",
      className,
    )}
  >
    <div className="flex shrink-0 items-start justify-between gap-2 px-3 pb-1.5 pt-3">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{eyebrow}</div>
        )}
        <div className="flex min-w-0 items-center gap-1.5">
          {swatch && (
            <span
              className="h-2 w-2 shrink-0 rounded-full ring-1 ring-foreground/20"
              style={{ backgroundColor: swatch }}
            />
          )}
          <span className="truncate text-sm font-medium" title={titleHint}>
            {title}
          </span>
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
          title="Close"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
    {(children || aside) && (
      <div className="flex min-h-0 flex-1">
        {children && (
          <div className="flex min-h-0 w-64 shrink-0 flex-col gap-2 overflow-y-auto px-3 pb-3">{children}</div>
        )}
        {aside && <div className="flex min-h-0 flex-col border-l border-foreground/10 px-3 pb-3">{aside}</div>}
      </div>
    )}
  </div>
);

/** A group of facts under a small header. Without a title, just the group. */
export const PopoutSection = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    {title && (
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
    )}
    {children}
  </div>
);

/**
 * One labelled value. The label truncates in its fixed column and the value
 * wraps mid-token: a `mechanism.param` label can be long, a quantity string
 * longer still, and neither may push the card wider. Both keep the full text
 * as a tooltip.
 */
export const PopoutFact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 items-baseline gap-2">
    <span className="w-20 shrink-0 truncate text-muted-foreground" title={label}>
      {label}
    </span>
    <span
      className="min-w-0 break-all font-mono tabular-nums"
      title={typeof children === "string" || typeof children === "number" ? String(children) : undefined}
    >
      {children}
    </span>
  </div>
);

/** A quiet line for "none" / "loading" / "not recorded". */
export const PopoutNote = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground">{children}</span>
);

/** Short tokens (mechanism names, tags) as wrapping chips. */
export const PopoutChips = ({ items }: { items: readonly string[] }) => (
  <div className="flex flex-wrap gap-1">
    {items.map((item) => (
      <span
        key={item}
        className="max-w-full truncate rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px]"
        title={item}
      >
        {item}
      </span>
    ))}
  </div>
);
