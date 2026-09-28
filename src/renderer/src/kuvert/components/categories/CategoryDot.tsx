import { cn } from "@/core/util/utils";

/** Colours offered for a new category; any hex colour is accepted too. */
export const CATEGORY_COLORS = ["#e5484d", "#f76b15", "#ffc53d", "#46a758", "#12a594", "#0090ff", "#6e56cf", "#d6409f", "#8d8d8d"];

/** A category's colour as a dot; the colour is the member's choice, so it is drawn as given. */
export const CategoryDot = ({ color, className }: { color: string; className?: string }) => (
  <span
    aria-hidden
    className={cn("inline-block size-2 shrink-0 rounded-full", !color && "bg-muted-foreground", className)}
    style={color ? { backgroundColor: color } : undefined}
  />
);
