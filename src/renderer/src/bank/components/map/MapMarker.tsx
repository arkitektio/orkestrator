import { cn } from "@/core/util/utils";
import { LucideIcon, Store } from "lucide-react";

/**
 * A place pin in the app's style: a teardrop in the category colour (or the
 * brand's primary), ringed in the page background, with an icon. Use with
 * `<Marker anchor="bottom" offset={MARKER_OFFSET}>` so the tip sits on the point.
 */
export const MapMarker = ({
  color,
  icon: Icon = Store,
  selected = false,
  title,
}: {
  color?: string | null;
  icon?: LucideIcon;
  selected?: boolean;
  title?: string;
}) => (
  <span
    title={title}
    className={cn(
      "flex h-7 w-7 rotate-45 items-center justify-center rounded-full rounded-br-none border-2 border-background shadow-md transition-transform",
      !color && "bg-primary text-primary-foreground",
      color && "text-white",
      selected && "scale-125 ring-2 ring-primary ring-offset-1 ring-offset-background",
    )}
    style={color ? { backgroundColor: color } : undefined}
  >
    <Icon className="h-3.5 w-3.5 -rotate-45" strokeWidth={2.25} />
  </span>
);

// The rotated square's tip reaches (√2 − 1) / 2 of its size below its box.
export const MARKER_OFFSET: [number, number] = [0, -6];
