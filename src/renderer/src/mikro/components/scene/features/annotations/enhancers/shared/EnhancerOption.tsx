import { useState, type ComponentType, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/core/util/utils";

/**
 * One choice in the enhancers popover: a small picture of what the enhancer
 * does to a stroke, its name and one line of what that means. The pictures
 * share one vocabulary — the faint wide band is the bright structure in the
 * data, the thin primary line is what gets drawn — so the options compare at a
 * glance.
 */
export const EnhancerOption = ({
  selected,
  onSelect,
  illustration,
  title,
  description,
}: {
  selected: boolean;
  onSelect?: () => void;
  illustration: ReactNode;
  title: string;
  description: string;
}) => {
  const body = (
    <>
      <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-black/40">
        {illustration}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium">{title}</span>
        <span className="text-[10px] leading-tight text-muted-foreground">{description}</span>
      </span>
    </>
  );
  const className = cn(
    "flex w-full items-center gap-2 rounded-md border p-1.5 text-left",
    selected ? "border-primary bg-primary/10" : "border-transparent",
  );

  if (!onSelect) return <div className={className}>{body}</div>;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(className, !selected && "hover:bg-muted/50")}
    >
      {body}
    </button>
  );
};

/** The bright filament every picture is drawn over. */
const FILAMENT = "M5 24 C15 4, 23 30, 31 15 S45 5, 51 11";

const Structure = () => (
  <path
    d={FILAMENT}
    fill="none"
    className="stroke-foreground/20"
    strokeWidth={6}
    strokeLinecap="round"
  />
);

const Ends = () => (
  <>
    <circle cx={5} cy={24} r={2} className="fill-primary" />
    <circle cx={51} cy={11} r={2} className="fill-primary" />
  </>
);

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 56 32" className="h-8 w-14" aria-hidden>
    {children}
  </svg>
);

/** No enhancer: the edge between two clicks is a straight line. */
export const StraightIllustration = () => (
  <Svg>
    <Structure />
    <line x1={5} y1={24} x2={51} y2={11} className="stroke-primary" strokeWidth={1.5} />
    <Ends />
  </Svg>
);

/** Traced in the slice: the edge follows the structure between the clicks. */
export const TraceSliceIllustration = () => (
  <Svg>
    <Structure />
    <path d={FILAMENT} fill="none" className="stroke-primary" strokeWidth={1.5} />
    <Ends />
  </Svg>
);

/** Traced through depth: the edge may leave the slice to stay on the structure. */
export const TraceDepthIllustration = () => (
  <Svg>
    <path d="M4 5 L38 5 L50 12 L16 12 Z" fill="none" className="stroke-foreground/30" strokeWidth={0.75} />
    <path d="M4 19 L38 19 L50 26 L16 26 Z" fill="none" className="stroke-foreground/30" strokeWidth={0.75} />
    <path
      d="M12 8.5 C24 6, 22 24, 38 22.5"
      fill="none"
      className="stroke-foreground/20"
      strokeWidth={6}
      strokeLinecap="round"
    />
    <path d="M12 8.5 C24 6, 22 24, 38 22.5" fill="none" className="stroke-primary" strokeWidth={1.5} />
    <circle cx={12} cy={8.5} r={2} className="fill-primary" />
    <circle cx={38} cy={22.5} r={2} className="fill-primary" />
  </Svg>
);

/** The skeleton brush: a wide painted stroke, its centerline extracted. */
export const SkeletonBrushIllustration = () => (
  <Svg>
    <Structure />
    <path
      d={FILAMENT}
      fill="none"
      className="stroke-primary/25"
      strokeWidth={12}
      strokeLinecap="round"
    />
    <path d={FILAMENT} fill="none" className="stroke-primary" strokeWidth={1.5} />
  </Svg>
);

/**
 * The outline pictures' own vocabulary: a faint closed blob (the object in
 * the data) instead of the filament, and the drawn polygon over it.
 */
const BLOB =
  "M14 6 C24 2, 40 4, 46 10 C52 16, 48 26, 38 28 C28 30, 20 26, 14 24 C6 21, 6 9, 14 6 Z";
const CORNERS: [number, number][] = [
  [14, 6],
  [46, 10],
  [38, 28],
  [14, 24],
];

const Blob = () => (
  <path d={BLOB} className="fill-foreground/15 stroke-foreground/25" strokeWidth={2.5} />
);

const Corners = () => (
  <>
    {CORNERS.map(([cx, cy]) => (
      <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={2} className="fill-primary" />
    ))}
  </>
);

/** No enhancer: straight sides cut across the object between the clicks. */
export const StraightPolygonIllustration = () => (
  <Svg>
    <Blob />
    <polygon
      points={CORNERS.map((c) => c.join(",")).join(" ")}
      fill="none"
      className="stroke-primary"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <Corners />
  </Svg>
);

/** Outline traced: each side hugs the object's boundary between the clicks. */
export const OutlinePolygonIllustration = () => (
  <Svg>
    <Blob />
    <path d={BLOB} fill="none" className="stroke-primary" strokeWidth={1.5} />
    <Corners />
  </Svg>
);

/** Whether a panel's Advanced column was left open, for the session. */
const advancedOpen = new Map<string, boolean>();

/**
 * An enhancer panel: its choices in the main column, and — when there is
 * something to tune — an "Advanced" fold that opens a second column to the
 * right with a short account of the algorithm and its tunes. The tunes stay
 * out of sight until asked for; the choices are what most strokes need.
 */
export const EnhancerLayout = ({
  id,
  title,
  icon: Icon,
  children,
  advanced,
}: {
  id: string;
  /** The section heading: which enhancer this is, for which tool. */
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  /** Omitted when nothing applies, e.g. the enhancer is off. */
  advanced?: { explain: ReactNode; tunes: ReactNode };
}) => {
  const [open, setOpenState] = useState(() => advancedOpen.get(id) ?? false);
  const setOpen = (next: boolean) => {
    advancedOpen.set(id, next);
    setOpenState(next);
  };
  const showing = open && advanced !== undefined;

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex w-72 flex-col gap-1">
        <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </div>
        {children}
        {advanced && (
          <button
            type="button"
            aria-expanded={showing}
            onClick={() => setOpen(!open)}
            className="mt-1 flex items-center gap-1 self-end rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            Advanced
            <ChevronRight
              className={cn("h-3 w-3 transition-transform", showing && "rotate-180")}
            />
          </button>
        )}
      </div>
      {showing && (
        <div className="flex w-64 flex-col gap-2 border-l pl-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              How it works
            </span>
            <div className="text-[10px] leading-snug text-muted-foreground">
              {advanced.explain}
            </div>
          </div>
          <div className="flex flex-col gap-1">{advanced.tunes}</div>
        </div>
      )}
    </div>
  );
};
