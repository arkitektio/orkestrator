import { Search, X } from "lucide-react";
import { Input } from "@/core/components/ui/input";
import { PageActionPolicy, useActionSlotMode } from "@/core/components/ui/page-action";
import { cn } from "@/core/lib/utils";
import { useRef, useState } from "react";

type CollapsibleSearchSize = "sm" | "default" | "lg";

/** Height/spacing tokens mirroring the Button `size` variants (default = h-7). */
const SIZES: Record<
  CollapsibleSearchSize,
  { height: string; collapsed: string; padding: string; icon: string }
> = {
  sm: { height: "h-6", collapsed: "w-6", padding: "pl-7 pr-6", icon: "size-3" },
  default: { height: "h-7", collapsed: "w-7", padding: "pl-8 pr-7", icon: "size-3.5" },
  lg: { height: "h-8", collapsed: "w-8", padding: "pl-9 pr-8", icon: "size-4" },
};

interface CollapsibleSearchProps extends PageActionPolicy {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Matches the Button `size` scale so it lines up with sibling actions. */
  size?: CollapsibleSearchSize;
  /** Tailwind width class for the expanded state. */
  expandedWidth?: string;
}

/**
 * A search affordance that renders as a single icon button and smoothly
 * expands into a text input. The element keeps a fixed height (matching the
 * Button of the same `size`) and stays mounted so it animates both in and out;
 * it auto-collapses when blurred while empty and remains open while it holds a
 * value (e.g. restored from the URL).
 */
export const CollapsibleSearch = ({
  value,
  onChange,
  placeholder = "Search…",
  className,
  size = "default",
  expandedWidth = "w-64",
}: CollapsibleSearchProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // In an action row that is down to icons the field gives up the term it is
  // showing and reads as the glyph it already has; clicking it still opens.
  const mode = useActionSlotMode();
  const expanded = open || (value.length > 0 && mode !== "icon");
  const dims = SIZES[size];

  const focusInput = () => containerRef.current?.querySelector("input")?.focus();

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative shrink-0 transition-[width] duration-200 ease-in-out",
        dims.height,
        expanded ? expandedWidth : dims.collapsed,
        className,
      )}
    >
      {/* Search glyph: a real button while collapsed, decorative once expanded. */}
      <button
        type="button"
        aria-label="Search"
        tabIndex={expanded ? -1 : 0}
        onClick={() => {
          setOpen(true);
          focusInput();
        }}
        className={cn(
          "absolute left-0 top-0 z-10 flex items-center justify-center rounded-md text-muted-foreground transition-colors",
          dims.height,
          dims.collapsed,
          expanded
            ? "pointer-events-none"
            : "border border-border hover:bg-muted/90 hover:text-foreground dark:bg-input/30",
        )}
      >
        <Search className={dims.icon} />
      </button>

      <Input
        value={value}
        tabIndex={expanded ? 0 : -1}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md transition-opacity duration-200",
          dims.height,
          dims.padding,
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onBlur={() => {
          if (!value) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            setOpen(false);
          }
        }}
      />

      {expanded && value && (
        <button
          type="button"
          // Keep focus on the input so clearing does not collapse the field.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange("");
            focusInput();
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className={dims.icon} />
        </button>
      )}
    </div>
  );
};
