import { cn } from "@/core/util/utils";

/** "MI" for "Max intensity projection", "C" for "crop": the monogram's letters. */
export const actionInitials = (name: string) => {
  const words = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s._-]+/)
    .filter((word) => /\p{L}|\p{N}/u.test(word));
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
};

/**
 * What an action without a logo blok shows in its place: its initials, in the
 * logo palette's brand colours, so it sits beside the drawn logos.
 */
export const ActionMonogram = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => (
  <span
    aria-hidden
    className={cn(
      "flex shrink-0 select-none items-center justify-center font-semibold tracking-tight",
      "bg-[var(--logo-brand-soft)] text-[var(--logo-brand-strong)]",
      className,
    )}
  >
    {actionInitials(name)}
  </span>
);

export default ActionMonogram;
