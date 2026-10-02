import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/core/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/ui/popover";
import { Button } from "@/core/ui/button";
import { cn, notEmpty } from "@/core/util/utils";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Option, SearchFunction } from "./SearchField";

/**
 * `SearchField` without the form context — a plain value/onChange combobox over
 * the same `SearchFunction` shape, so a GraphQL search query written for one
 * works unchanged in the other.
 *
 * It exists because the schema builder's inspector is prop-driven: it has no
 * `useFormContext` to hang `SearchField` off, and wrapping a lone select in its
 * own form to borrow one is worse than this.
 *
 * The trigger renders `value` verbatim when no option matches it. That is the
 * honest default here rather than a bug: these pickers hold strings that already
 * read as their own label (a structure identifier, a metric key), and
 * `MetricKindFilter` has no `keys` filter to resolve a saved key back through.
 */
export const AsyncCombobox = (props: {
  value: string | null | undefined;
  onChange: (value: string | undefined) => void;
  search: SearchFunction;
  placeholder?: string;
  commandPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Ask `search` for the label of a `value` that is not among the loaded
   * options (`{ values: [value] }`), for pickers whose value is an id rather
   * than a string that reads as its own label. Also searches again each time
   * the list opens, so what was made since shows up.
   */
  resolveSelectedLabel?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resolved, setResolved] = useState<Option | null>(null);

  const { search: searchFn, value, resolveSelectedLabel } = props;
  const refetchKey = resolveSelectedLabel ? open : false;

  useEffect(() => {
    let cancelled = false;
    searchFn({ search })
      .then((res) => {
        if (cancelled) return;
        setOptions(res.filter(notEmpty));
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [searchFn, search, refetchKey]);

  const listed = options.find((o) => o.value === props.value);

  useEffect(() => {
    if (!resolveSelectedLabel || !value || listed) return;
    let cancelled = false;
    searchFn({ values: [value] })
      .then((res) => {
        if (cancelled) return;
        setResolved(res.filter(notEmpty).find((o) => o.value === value) ?? null);
      })
      .catch(() => {
        // The id is shown instead; the list itself reports search errors.
      });
    return () => {
      cancelled = true;
    };
  }, [searchFn, value, resolveSelectedLabel, listed]);

  const selected = listed ?? (resolved?.value === props.value ? resolved : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={props.disabled}
          className={cn("w-full justify-between font-normal", props.className)}
        >
          <span className={cn("truncate", !props.value && "text-muted-foreground")}>
            {selected?.label ?? props.value ?? props.placeholder ?? "Select…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={props.commandPlaceholder ?? "Search…"}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {error ?? props.emptyPlaceholder ?? "Nothing found."}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    // Selecting the current value clears it — the rule fields
                    // this drives are all optional.
                    props.onChange(
                      option.value === props.value ? undefined : option.value,
                    );
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.value === props.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default AsyncCombobox;
