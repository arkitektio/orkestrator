import type { DescriptorConstraint } from "@/core/ports/engine/constraints";
import { PortConstraintBadges } from "@/core/ports/widgets/PortConstraintBadges";
import { Badge } from "@/core/ui/badge";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/core/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { useDebouncedCallback } from "@/core/util/hooks/useDebouncedCallback";
import { useLatestRef } from "@/core/util/hooks/useLatestRef";
import { cn } from "@/core/util/utils";
import { CheckIcon } from "@radix-ui/react-icons";
import { AlertCircle, ChevronsUpDown, X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

export const PICKER_PAGE_SIZE = 25;

/** One page of candidates, or the objects behind these ids. */
export type PickerRequest = {
  search?: string;
  /** Resolve exactly these, whatever narrows the list: a value already chosen is shown as it is. */
  ids?: string[];
  limit: number;
  offset: number;
};

/**
 * A narrowing the list is under that the user may lift: "Related to ‹a path›".
 * Shown as a chip; an empty list under an active scope offers to show all.
 */
export type PickerScope = { label: string; active: boolean; onToggle: () => void };

export type StructurePickerControlProps<T> = {
  /** The id of the chosen object, if any. */
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  /** What one of these is called in the placeholder and the empty state: "lens". */
  noun: string;
  load: (request: PickerRequest) => Promise<T[]>;
  keyOf: (item: T) => string;
  /** One candidate in the list: as much as it takes to tell it from its neighbours. */
  renderRow: (item: T) => ReactNode;
  /** The chosen one, in the closed field: one line. */
  renderValue: (item: T) => ReactNode;
  /** What the list is fixed to, shown so an empty list explains itself. */
  requires?: readonly DescriptorConstraint[];
  scope?: PickerScope;
  /** Whether `load` honours `limit` and `offset`. A source that always answers everything is asked once. */
  paged?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/** The chosen object in the closed field, resolved by id. Mounted per id (`key`), so it starts out loading. */
const Chosen = <T,>({
  id,
  load,
  renderValue,
}: Pick<StructurePickerControlProps<T>, "load" | "renderValue"> & { id: string }) => {
  const [item, setItem] = useState<T | null | undefined>(undefined);
  const loadRef = useLatestRef(load);

  useEffect(() => {
    let cancelled = false;
    loadRef
      .current({ ids: [id], limit: 1, offset: 0 })
      .then((found) => !cancelled && setItem(found[0] ?? null))
      .catch(() => !cancelled && setItem(null));
    return () => {
      cancelled = true;
    };
  }, [id, loadRef]);

  if (item === undefined) {
    return <span className="h-3 w-24 animate-pulse rounded-full bg-muted-foreground/20" />;
  }
  if (item === null) {
    return <span className="truncate font-mono text-xs text-muted-foreground">{id}</span>;
  }
  return <>{renderValue(item)}</>;
};

/**
 * A searchable, paged list of one kind of object to pick one from.
 *
 * Controlled, and bound to no form and no module: the caller supplies the
 * query (`load`) and the two renderings. This holds what every such picker
 * shares: the debounced search, loading when first opened, paging on scroll,
 * and the narrowings shown as chips (what the input requires, fixed; a scope,
 * which the user may lift) so an empty list explains itself.
 */
export const StructurePickerControl = <T,>({
  value,
  onChange,
  noun,
  load,
  keyOf,
  renderRow,
  renderValue,
  requires,
  scope,
  paged = true,
  placeholder,
  disabled,
  className,
}: StructurePickerControlProps<T>) => {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Paging bookkeeping lives in refs so a stale closure can never append a
  // page that belongs to a previous search term.
  const requestRef = useRef(0);
  const offsetRef = useRef(0);
  const searchRef = useRef<string | undefined>(undefined);

  const fetchPage = useCallback(
    (search: string | undefined, offset: number) => {
      const requestId = ++requestRef.current;
      if (offset === 0) searchRef.current = search;
      load({ search: search || undefined, limit: PICKER_PAGE_SIZE, offset })
        .then((page) => {
          if (requestRef.current !== requestId) return;
          offsetRef.current = offset + page.length;
          setItems((previous) => (offset > 0 ? [...previous, ...page] : page));
          setHasMore(paged && page.length === PICKER_PAGE_SIZE);
          setError(null);
        })
        .catch((failure) => {
          if (requestRef.current !== requestId) return;
          setError(failure?.message || "Error");
          if (offset === 0) setItems([]);
          setHasMore(false);
        })
        .finally(() => {
          if (requestRef.current !== requestId) return;
          setLoadingMore(false);
          setLoaded(true);
        });
    },
    [load, paged],
  );

  const query = useDebouncedCallback((term: string) => fetchPage(term, 0));

  // Loaded when first opened, not when mounted: a form with five structure
  // inputs should not run five queries nobody looks at. `load` changes when
  // what narrows the list does (a scope lifted, another input chosen).
  useEffect(() => {
    if (open) fetchPage(searchRef.current, 0);
  }, [open, fetchPage]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!open || !hasMore || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || loadingMore) return;
        setLoadingMore(true);
        fetchPage(searchRef.current, offsetRef.current);
      },
      { root: listRef.current, rootMargin: "0px 0px 64px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasMore, loadingMore, fetchPage]);

  const choose = (id: string | undefined) => {
    onChange(id);
    setInputValue("");
    setOpen(false);
  };

  const constrained = Boolean(requires?.length);
  const scoped = Boolean(scope?.active);

  return (
    <Command shouldFilter={false} className={cn("overflow-visible bg-transparent", className)}>
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="group flex min-h-10 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {value !== undefined ? (
                <Chosen key={value} id={value} load={load} renderValue={renderValue} />
              ) : (
                <span className="truncate text-muted-foreground">{placeholder ?? `Pick a ${noun}…`}</span>
              )}
            </div>
            {value !== undefined && !disabled ? (
              <X
                aria-label="Clear"
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  choose(undefined);
                }}
              />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-[max(var(--radix-popover-trigger-width),22rem)] p-0">
          <CommandInput
            placeholder={`Search ${noun}…`}
            value={inputValue}
            onValueChange={(term) => {
              setInputValue(term);
              query(term);
            }}
          />
          {(constrained || scope) && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              {constrained && (
                <>
                  <span>Only</span>
                  <PortConstraintBadges items={[...(requires ?? [])]} />
                </>
              )}
              {scope && (
                <Badge
                  asChild
                  variant={scope.active ? "secondary" : "outline"}
                  className={cn("cursor-pointer text-[10px] font-light", !scope.active && "line-through opacity-70")}
                >
                  <button type="button" aria-pressed={scope.active} onClick={scope.onToggle}>
                    {scope.label}
                  </button>
                </Badge>
              )}
            </div>
          )}
          <CommandList slot="list" className="max-h-none w-full overflow-visible">
            <div ref={listRef} className="max-h-80 overflow-y-auto rounded-md outline-none">
              {error && (
                <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
              {loaded && !error && items.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-xs text-muted-foreground">
                  <span>
                    {scoped
                      ? `No ${noun} here is ${scope!.label.charAt(0).toLowerCase()}${scope!.label.slice(1)}.`
                      : constrained
                        ? `No ${noun} meets what this input requires${inputValue ? ` and matches “${inputValue}”` : ""}.`
                        : `No ${noun} found.`}
                  </span>
                  {scoped && (
                    <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={scope!.onToggle}>
                      Show all
                    </button>
                  )}
                </div>
              )}
              {items.length > 0 && (
                <CommandGroup>
                  {items.map((item) => {
                    const id = keyOf(item);
                    return (
                      <CommandItem
                        key={id}
                        value={id}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onSelect={() => choose(id === value ? undefined : id)}
                        className="gap-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">{renderRow(item)}</div>
                        <CheckIcon className={cn("h-4 w-4 shrink-0", id === value ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                  {loadingMore ? "Loading more…" : ""}
                </div>
              )}
            </div>
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
  );
};
