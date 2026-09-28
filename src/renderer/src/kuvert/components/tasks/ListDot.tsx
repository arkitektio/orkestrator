import { cn } from "@/core/util/utils";

/** A task list's colour as a small dot (the colour is the user's, so it is inline). */
export const ListDot = ({ color, className }: { color?: string | null; className?: string }) => (
  <span
    className={cn("inline-block size-2 shrink-0 rounded-full", !color && "bg-muted-foreground/40", className)}
    style={color ? { backgroundColor: color } : undefined}
  />
);
