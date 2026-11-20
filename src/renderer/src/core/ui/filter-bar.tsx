import { Check, ChevronDown, Search, X, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/core/ui/command";
import { Input } from "@/core/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { cn } from "@/core/util/utils";

/**
 * The parts of a home page's filter row: one quiet line of pills over the grid
 * it narrows (mikro's recent data, rekuest's apps). A filter that narrows is
 * tinted with the brand; one that does not stays muted.
 */

const PILL = "h-8 gap-1.5 rounded-full font-normal";
const TINT = "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15";

/** A filter's trigger: quiet while it does not narrow, tinted once it does. */
export const FilterTrigger = ({
  active,
  icon: Icon,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { active: boolean; icon: LucideIcon }) => (
  <Button
    variant="outline"
    size="sm"
    className={cn(PILL, active ? TINT : "text-muted-foreground", className)}
    {...props}
  >
    <Icon className="h-3.5 w-3.5" />
    {children}
    <ChevronDown className="h-3 w-3 opacity-60" />
  </Button>
);

/** An on/off filter in the same pill: pressed is tinted. */
export const FilterToggle = ({
  pressed,
  onPressedChange,
  icon: Icon,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  icon: LucideIcon;
}) => (
  <Button
    variant="outline"
    size="sm"
    aria-pressed={pressed}
    onClick={() => onPressedChange(!pressed)}
    className={cn(PILL, pressed ? TINT : "text-muted-foreground", className)}
    {...props}
  >
    <Icon className="h-3.5 w-3.5" />
    {children}
  </Button>
);

/** What it is called: a pill-shaped field matching the triggers beside it. */
export const FilterSearchField = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) => (
  <div className="relative">
    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => event.key === "Escape" && onChange("")}
      placeholder={placeholder}
      aria-label={placeholder.replace(/…$/, "")}
      // Important: `Input`'s own `px-2` survives the merge, and a blok on the page
      // re-emits `.px-2` in a later stylesheet (bsx's runtime Tailwind), which
      // would then win over a plain `pl-8` and put the text under the icon.
      className={cn("h-8 w-56 rounded-full pl-8! pr-7! text-sm", value && "border-primary/40 bg-primary/10")}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        aria-label="Clear search"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

export type FilterOption = { value: string; label: string };

/**
 * A pick-one filter: the pill opens a list with the default first (`null`,
 * the choice that does not narrow), then `pinned` choices, then `options`
 * under their heading. `searchable` adds a field over a long list.
 */
export const FilterPicker = ({
  icon,
  label,
  value,
  onChange,
  defaultLabel,
  pinned = [],
  options,
  heading,
  searchable = false,
}: {
  icon: LucideIcon;
  /** What the filter is about, for assistive tech and the search field ("Device"). */
  label: string;
  value: string | null;
  onChange: (next: string | null) => void;
  /** The row and the pill's text while nothing is picked ("Any device"). */
  defaultLabel: string;
  pinned?: FilterOption[];
  options: FilterOption[];
  heading?: string;
  searchable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const picked = [...pinned, ...options].find((option) => option.value === value);
  const pick = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };
  const row = (option: FilterOption) => (
    <CommandItem key={option.value} value={`${option.label} ${option.value}`} onSelect={() => pick(option.value)}>
      <span className="truncate">{option.label}</span>
      {value === option.value && <Check className="ml-auto h-4 w-4" />}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterTrigger active={value !== null} icon={icon} aria-label={label}>
          {/* A value with no option behind it (a link, a list still loading) shows as itself. */}
          <span className="max-w-40 truncate">{value === null ? defaultLabel : (picked?.label ?? value)}</span>
        </FilterTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          {searchable && <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />}
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={defaultLabel} onSelect={() => pick(null)}>
                {defaultLabel}
                {value === null && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              {pinned.map(row)}
            </CommandGroup>
            {options.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={heading}>{options.map(row)}</CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/** The row's way back: shown only while something narrows. */
export const FilterClear = ({ onClear }: { onClear: () => void }) => (
  <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={onClear}>
    <X className="h-3.5 w-3.5" />
    Clear filters
  </Button>
);
