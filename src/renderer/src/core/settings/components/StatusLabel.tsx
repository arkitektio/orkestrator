import { cn } from "@/core/lib/utils";

/**
 * The settings pages' one way to show a state: a coloured dot and a short
 * label in the same tone — not a filled badge. Pulses while something is in
 * progress.
 */

export type Tone = "good" | "warn" | "bad" | "muted";

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-destructive",
  muted: "text-muted-foreground",
};

const TONE_DOT: Record<Tone, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-destructive",
  muted: "bg-muted-foreground/40",
};

export const StatusDot = ({ tone, pulse }: { tone: Tone; pulse?: boolean }) => (
  <span aria-hidden className="relative flex size-2 shrink-0">
    {pulse && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", TONE_DOT[tone])} />}
    <span className={cn("relative size-2 rounded-full", TONE_DOT[tone])} />
  </span>
);

export const StatusLabel = ({
  tone,
  pulse,
  children,
  className,
}: {
  tone: Tone;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <span className={cn("flex shrink-0 items-center gap-1.5 text-xs", TONE_TEXT[tone], className)}>
    <StatusDot tone={tone} pulse={pulse} />
    {children}
  </span>
);
