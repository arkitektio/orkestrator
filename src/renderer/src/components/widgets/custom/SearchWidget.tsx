import { Badge } from "@/components/ui/badge";
import { SearchAssignWidgetFragment } from "@/rekuest/api/graphql";
import useWidgetDependencies from "@/rekuest/hooks/useWidgetDependencies";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";

import { CheckIcon } from "@radix-ui/react-icons";

import { FieldProps } from "@/components/fields/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, notEmpty } from "@/lib/utils";
import { gql } from "@apollo/client";
import type { OperationDefinitionNode } from "graphql";
import { AlertCircle, ChevronsUpDown, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useLatestRef } from "@/hooks/useLatestRef";


export type Option = {
  label: string;
  value: string;
};

export const ButtonLabel = (props: {
  search: SearchFunction;
  value: { object: string; __identifier: string };
}) => {
  const [option, setOption] = useState<Option | null | undefined>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // `search` is rebuilt whenever a dependency value changes; the label only
  // needs re-resolving when the selected object changes.
  const searchRef = useLatestRef(props.search);
  const selected = props.value.object;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchRef
      .current({ values: [selected] })
      .then((res) => {
        if (cancelled) return;
        if (res.length === 0) {
          setOption(null);
          setError("No option found for value");
          return;
        }
        setOption(res[0] || null);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, searchRef]);

  return (
    <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5 text-left">
      {loading && !option && !error && (
        <span className="h-3 w-24 animate-pulse rounded-full bg-muted-foreground/20" />
      )}
      {option?.label && <span className="truncate">{option.label}</span>}
      {error && (
        <span className="flex items-center gap-1 text-xs text-destructive shrink-0">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
};

export type SearchOptions = {
  search?: string;
  values?: (string | number)[];
  limit?: number;
  offset?: number;
};

export type SearchFunction = (
  searching: SearchOptions,
) => Promise<(Option | null | undefined)[]>;

export const PAGE_SIZE = 25;

/** A query opts into pagination by declaring optional $limit / $offset Int variables. */
export const queryDeclaresPagination = (query: string): boolean => {
  try {
    const document = gql(query);
    const operation = document.definitions.find(
      (d): d is OperationDefinitionNode => d.kind === "OperationDefinition",
    );
    const variableNames =
      operation?.variableDefinitions?.map((v) => v.variable.name.value) || [];
    return variableNames.includes("limit") && variableNames.includes("offset");
  } catch {
    return false;
  }
};

export type SearchFieldProps = {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  commandPlaceholder?: string;
  createComponent?: React.ReactNode;
  noOptionFoundPlaceholder?: string;
  search: SearchFunction;
} & FieldProps;


export const SearchWidget = (
  props: InputWidgetProps<SearchAssignWidgetFragment>,
) => {
  const { registry } = useWidgetRegistry();

  const thequery = props?.widget?.query || "";
  const wardKey = props.widget?.ward;

  // getWard falls back to a throwing fakeWard for unknown keys, so resolving
  // with an empty key is safe — the !wardKey check below renders the error
  // instead. Hooks must all run before any early return.
  const theward = useMemo(
    () => registry.getWard(wardKey ?? ""),
    [registry, wardKey],
  );

  const { values, met } = useWidgetDependencies({
    widget: props.widget,
    path: props.path,
  });

  const search = useCallback(
    async (searching: SearchOptions) => {
      if (!theward.search) throw new Error("Ward does not support search");
      if (!met) throw new Error("Dependencies not met");

      const options = await theward.search({
        query: thequery,
        variables: { ...searching, ...values },
      });

      return options;
    },
    [theward, thequery, values, met],
  );

  const form = useFormContext();

  const paginated = useMemo(() => queryDeclaresPagination(thequery), [thequery]);

  const [options, setOptions] = useState<Option[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Pagination bookkeeping lives in refs so a stale closure can never
  // append a page that belongs to a previous search term.
  const requestRef = useRef(0);
  const offsetRef = useRef(0);
  const lastSearchRef = useRef<string | undefined>(undefined);

  const fetchOptions = useCallback(
    (searchTerm: string | undefined, offset: number) => {
      const requestId = ++requestRef.current;
      if (offset === 0) lastSearchRef.current = searchTerm;

      const variables: SearchOptions = paginated
        ? { limit: PAGE_SIZE, offset }
        : {};
      if (searchTerm !== undefined) variables.search = searchTerm;

      search(variables)
        .then((res) => {
          if (requestRef.current !== requestId) return;
          const page = res || [];
          offsetRef.current = offset + page.length;
          const cleaned = page.filter(notEmpty);
          setOptions((prev) => (offset > 0 ? [...prev, ...cleaned] : cleaned));
          setHasMore(paginated && page.length === PAGE_SIZE);
          setError(null);
        })
        .catch((err) => {
          if (requestRef.current !== requestId) return;
          setError(err.message || "Error");
          if (offset === 0) setOptions([]);
          setHasMore(false);
        })
        .finally(() => {
          if (requestRef.current === requestId) setLoadingMore(false);
        });
    },
    [search, paginated],
  );

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchOptions(lastSearchRef.current, offsetRef.current);
  }, [hasMore, loadingMore, fetchOptions]);

  // One request after the user pauses, not one per keystroke.
  const query = useDebouncedCallback((string: string) => {
    fetchOptions(string, 0);
  });

  useEffect(() => {
    fetchOptions(undefined, 0);
  }, [fetchOptions]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!open || !hasMore || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root: listRef.current, rootMargin: "0px 0px 64px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasMore, loadMore]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            form.setValue(pathToName(props.path), undefined, {
              shouldValidate: true,
            });
          }
        }
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [form, props.path],
  );

  if (!wardKey) {
    return (
      <div className="flex items-center gap-2 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Configuration error: no data source configured for this field.
      </div>
    );
  }

  if (!met) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 rounded border border-border px-3 py-2 text-xs text-muted-foreground">
        <span>Waiting for:</span>
        {props.widget?.dependencies?.map((d, i) => (
          <Badge key={i} variant="outline" className="text-[10px]">{d}</Badge>
        ))}
      </div>
    );
  }

  return (
    <FormField
      control={form.control}
      name={pathToName(props.path)}
      render={({ field }) => (
        <>
          <FormItem className="flex flex-col">
            {props.port.label != undefined && <FormLabel>{props.port.label}</FormLabel>}
            <Command
              shouldFilter={false}
              className="overflow-visible bg-transparent"
            >
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="group flex h-10 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {field.value != undefined && field.value != null ? (
                      <ButtonLabel search={search} value={field.value} />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        Search…
                      </span>
                    )}
                    {field.value != undefined && field.value != null ? (
                      <X
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setInputValue("");
                          form.setValue(pathToName(props.path), undefined, {
                            shouldValidate: true,
                          });
                          field.onChange(undefined);
                        }}
                      />
                    ) : (
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                >
                  <CommandInput
                    onKeyDown={handleKeyDown}
                    placeholder="Search a different model…"
                    onValueChange={(e) => {
                      setInputValue(e);
                      query(e);
                    }}
                    value={inputValue}
                  />
                  <CommandList slot="list" className="w-full max-h-none overflow-visible">
                    <div
                      ref={listRef}
                      className="max-h-72 overflow-y-auto rounded-md outline-none"
                    >
                      <CommandEmpty>No options found.</CommandEmpty>
                      {error && (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-destructive border-b border-destructive/20 bg-destructive/5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {error}
                        </div>
                      )}
                      {options.length > 0 && (
                        <CommandGroup heading="Options">
                          {options.map((option, index) => (
                            <CommandItem
                              value={option.value}
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onSelect={() => {
                                if (field.value !== option.value) {
                                  form.setValue(pathToName(props.path), { object: option.value, __identifier: props.port.identifier }, {
                                    shouldValidate: true,
                                  });
                                  setInputValue("");
                                } else {
                                  form.setValue(pathToName(props.path), null, {
                                    shouldValidate: true,
                                  });
                                  setInputValue("");
                                }
                                setOpen(false);
                              }}
                            >
                              {option.label}
                              <CheckIcon
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  option.value === field.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {hasMore && (
                        <div
                          ref={sentinelRef}
                          className="flex items-center justify-center py-2 text-xs text-muted-foreground"
                        >
                          {loadingMore ? "Loading more…" : ""}
                        </div>
                      )}
                    </div>
                  </CommandList>
                </PopoverContent>
              </Popover>
            </Command>
            {props.port.description && <FormDescription>{props.port.description}</FormDescription>}
            <FormMessage />
          </FormItem>
        </>
      )}
    />
  );
};
