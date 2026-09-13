import {
  PAGE_SIZE,
  queryDeclaresPagination,
} from "@/components/widgets/custom/SearchWidget";
import { SearchAssignWidgetFragment } from "@/rekuest/api/graphql";
import useWidgetDependencies from "@/rekuest/hooks/useWidgetDependencies";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";
import { CheckIcon } from "@radix-ui/react-icons";

import { Badge } from "@/components/ui/badge";
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
  FormMessage
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, notEmpty } from "@/lib/utils";
import { AlertCircle, ChevronsUpDown, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useLatestRef } from "@/hooks/useLatestRef";

export type Option = {
  label: string;
  value: string;
};

export const ListButtonLabel = (props: {
  search: SearchFunction;
  value: { __value: { object: string; __identifier: string } }[] | undefined;
  setValue: (
    vars: { __value: { object: string; __identifier: string } }[],
  ) => void;
  placeholder?: string;
}) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useLatestRef(props.search);
  const selectedKey = (props.value ?? []).map((x) => x.__value.object).join("|");

  useEffect(() => {
    if (!selectedKey) {
      setOptions([]);
      setError(null);
      return;
    }
    let cancelled = false;
    searchRef
      .current({ values: selectedKey.split("|") })
      .then((res) => {
        if (cancelled) return;
        setOptions(res.filter(notEmpty));
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedKey, searchRef]);

  const remove = (value: string) => {
    props.setValue(
      props.value?.filter((v) => v.__value.object !== value) || [],
    );
  };

  return (
    <div className="flex flex-row flex-wrap items-center gap-1 p-1">
      {options.map((l, index) => (
        <Badge
          key={index}
          variant="secondary"
          onClick={() => remove(l.value)}
          title="Remove"
          className="group/chip cursor-pointer pr-1.5"
        >
          <span className="max-w-40 truncate">{l.label}</span>
          <X className="text-muted-foreground transition-colors group-hover/chip:text-foreground" />
        </Badge>
      ))}
      {error && (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
};

export type SearchOptions = {
  search?: string;
  values?: string[];
  limit?: number;
  offset?: number;
};

export type SearchFunction = (
  searching: SearchOptions,
) => Promise<(Option | null | undefined)[]>;


export const ListSearchWidget = (
  props: InputWidgetProps<SearchAssignWidgetFragment>,
) => {
  const { registry } = useWidgetRegistry();
  const [options, setOptions] = useState<Option[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const wardKey = props.widget?.ward;
  const query = props?.widget?.query || "";

  // getWard falls back to a throwing fakeWard for unknown keys, so resolving
  // with an empty key is safe — the !wardKey check below renders the error
  // instead. Hooks must all run before any early return.
  const theward = useMemo(
    () => registry.getWard(wardKey ?? ""),
    [registry, wardKey],
  );

  const name = pathToName(props.path)

  // The list port wraps a child structure port; the identifier needed for the
  // canonical { object, __identifier } structure value lives on that child.
  const childIdentifier = props.port.children?.at(0)?.identifier ?? "";

  const { values, met } = useWidgetDependencies({
    widget: props.widget,
    path: props.path,
  });

  const search = useCallback(
    async (searching: SearchOptions) => {
      if (!theward.search) throw new Error("Ward does not support search");
      if (!met) throw new Error("Dependencies not met");
      const options = await theward.search({
        query: query,
        variables: { ...searching, ...values },
      });
      return options;
    },
    [theward, query, values, met],
  );

  const form = useFormContext();

  const paginated = useMemo(() => queryDeclaresPagination(query), [query]);

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

  const debouncedFetch = useDebouncedCallback((string: string) => {
    fetchOptions(string, 0);
  });
  const onValueChange = (string: string) => {
    setOpen(true);
    debouncedFetch(string);
  };

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
            // Remove the last selected chip; the field value is an array.
            const current = form.getValues(name);
            if (Array.isArray(current) && current.length > 0) {
              form.setValue(name, current.slice(0, -1), {
                shouldValidate: true,
              });
            }
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [form, name],
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
    <FormField<{ [name: string]: { __value: { object: string; __identifier: string } }[] }>
      control={form.control}
      name={name}
      render={({ field }) => (
        <>
          <FormItem className={cn("flex flex-col dark:text-white")}>
            <FormLabel>{props.port.label || props.port.key}</FormLabel>
            <Command
              shouldFilter={false}
              className="overflow-visible bg-transparent"
            >
              <Popover open={open} onOpenChange={setOpen}>
                <div className="rounded-md border border-input text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  {field.value && field.value.length > 0 && (
                    <ListButtonLabel
                      search={search}
                      value={field.value}
                      setValue={(value) => {
                        form.setValue(name, value, { shouldValidate: true });
                        setInputValue("");
                      }}
                    />
                  )}
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate text-muted-foreground inline">
                        {field.value && field.value.length > 0
                          ? "Add or remove…"
                          : "Search…"}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                </div>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] p-1"
                >
                  <CommandInput
                    onKeyDown={handleKeyDown}
                    placeholder="Search…"
                    onValueChange={(e) => {
                      setInputValue(e);
                      onValueChange(e);
                    }}
                    value={inputValue}
                  />
                  <CommandList slot="list" className="w-full max-h-none overflow-visible">
                    <div
                      ref={listRef}
                      className="max-h-72 overflow-y-auto rounded-md outline-none"
                    >
                      <CommandEmpty>No Options found</CommandEmpty>
                      {error && (
                        <CommandGroup heading="Error">
                          {error && <CommandItem>{error}</CommandItem>}
                        </CommandGroup>
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
                                if (
                                  field.value &&
                                  Array.isArray(field.value) &&
                                  field.value.find(
                                    (val) => val.__value?.object === option.value,
                                  )
                                ) {
                                  form.setValue(
                                    name,
                                    field.value.filter(
                                      (val) => val.__value?.object !== option.value,
                                    ),
                                    {
                                      shouldValidate: true,
                                    },
                                  );
                                  setInputValue("");
                                } else {
                                  form.setValue(
                                    name,
                                    [
                                      ...(field.value &&
                                        Array.isArray(field.value)
                                        ? field.value
                                        : []),
                                      {
                                        __value: {
                                          object: option.value,
                                          __identifier: childIdentifier,
                                        },
                                      },
                                    ],
                                    {
                                      shouldValidate: true,
                                    },
                                  );
                                  setInputValue("");
                                }
                              }}
                            >
                              {option.label}
                              <CheckIcon
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  field.value &&
                                    Array.isArray(field.value) &&
                                    field.value.find(
                                      (val) => val.__value?.object === option.value,
                                    )
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
            <FormDescription>{props.port.description}</FormDescription>
            <FormMessage />
          </FormItem>
        </>
      )}
    />
  );
};

