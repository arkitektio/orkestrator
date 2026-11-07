import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/core/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { cn } from "@/core/util/utils";
import { formatUnit } from "@/core/util/units";

/** A column as a picker offers it: its name, and its unit where it declares one. */
export type ComboColumn = { name: string; unit: string | null; longName?: string | null };

const NONE = "__none__";

/** Long enough that scrolling a list stops being the quick way: then a search box shows. */
const SEARCH_FROM = 8;

/**
 * Pick one column of a table — the scene's column picker's look, for every
 * place a chart names a column: the name, its unit as a quiet tag beside it, a
 * check on the current one, and a search once the list is long.
 *
 * `none` makes the column optional and says what leaving it out means
 * ("every row", "none"). A value the list does not offer is still shown on the
 * trigger, so the control never reads blank.
 *
 * Two sizes: `card` (a layer card's compact well) and `form` (a dialog field).
 */
export const ColumnCombobox = ({
  value,
  columns,
  onChange,
  none,
  disabled,
  placeholder = "Column",
  title,
  size = "card",
  className,
}: {
  value: string | null;
  columns: readonly ComboColumn[];
  onChange: (value: string | null) => void;
  none?: string;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
  size?: "card" | "form";
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const current = value ? columns.find((c) => c.name === value) : undefined;
  const unit = formatUnit(current?.unit);
  const pick = (next: string | null) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };
  const card = size === "card";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={title}
          className={cn(
            "flex min-w-0 items-center gap-1 rounded border text-left transition-colors disabled:opacity-50",
            card
              ? "h-5 w-36 border-foreground/10 bg-background/30 px-1.5 text-[10px] text-foreground/80 hover:border-foreground/25"
              : "h-7 w-full border-input bg-background px-2 text-xs hover:bg-accent/50",
            className,
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
            {value ? (current?.longName ?? value) : (none ?? placeholder)}
          </span>
          {unit && <span className="shrink-0 text-[9px] text-muted-foreground">{unit}</span>}
          <ChevronsUpDown className={cn("shrink-0 opacity-40", card ? "h-2.5 w-2.5" : "h-3 w-3")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-0"
        // The card header toggles on click, and portalled content still bubbles through it.
        onClick={(event) => event.stopPropagation()}
      >
        <Command>
          {columns.length >= SEARCH_FROM && <CommandInput placeholder="Find a column…" className="h-8 text-xs" />}
          <CommandList className="max-h-72">
            <CommandEmpty className="px-3 py-2 text-[11px] text-muted-foreground">No column matches.</CommandEmpty>
            <CommandGroup>
              {none !== undefined && (
                <CommandItem value={NONE} onSelect={() => pick(null)} className="gap-2 text-xs text-muted-foreground">
                  <span className="flex-1 italic">{none}</span>
                  {value === null && <Check className="h-3 w-3 shrink-0" />}
                </CommandItem>
              )}
              {columns.map((column) => {
                const shown = formatUnit(column.unit);
                return (
                  <CommandItem
                    key={column.name}
                    value={`${column.name} ${column.longName ?? ""}`}
                    onSelect={() => pick(column.name)}
                    className="gap-2 text-xs"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{column.longName ?? column.name}</span>
                      {column.longName && column.longName !== column.name && (
                        <span className="truncate font-mono text-[9px] text-muted-foreground">{column.name}</span>
                      )}
                    </span>
                    {shown && (
                      <span className="shrink-0 rounded bg-foreground/5 px-1 text-[9px] text-muted-foreground">
                        {shown}
                      </span>
                    )}
                    <Check className={cn("h-3 w-3 shrink-0", value === column.name ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
