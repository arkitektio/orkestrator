import { CheckIcon } from "@radix-ui/react-icons";

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
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useLatestRef } from "@/hooks/useLatestRef";
import { cn, notEmpty } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { FieldProps } from "./types";

export type Option = {
  label: string;
  value: string;
};

export const ButtonLabel = (props: {
  search: SearchFunction;
  value: string;
}) => {
  const [option, setOption] = useState<Option | null | undefined>(null);
  const [error, setError] = useState<string | null>(null);

  // Callers frequently pass an inline `search` function; resolving the label
  // must only depend on the value, not on that function's identity.
  const searchRef = useLatestRef(props.search);

  useEffect(() => {
    let cancelled = false;
    searchRef
      .current({ values: [props.value] })
      .then((res) => {
        if (cancelled) return;
        if (res.length === 0) {
          setOption(null);
          setError("No option found for value");
        }
        setOption(res[0] || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [props.value]);

  return (
    <div className="flex flex-row items-center">
      {option?.label && <div className="text-slate-200">{option.label}</div>}
      {error}
    </div>
  );
};

export type SearchOptions = { search?: string; values?: (string | number)[] };

export type SearchFunction = (
  searching: SearchOptions,
) => Promise<(Option | null | undefined)[]>;

export type SearchFieldProps = {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  commandPlaceholder?: string;
  createComponent?: React.ReactNode;
  noOptionFoundPlaceholder?: string;
  search: SearchFunction;
  /**
   * What to store in the form for a chosen option value. Defaults to the
   * option value itself; structure ports store `{ __identifier, object }`.
   */
  toFieldValue?: (optionValue: string) => unknown;
  /** The option key a stored field value corresponds to (inverse of `toFieldValue`). */
  fieldKey?: (fieldValue: unknown) => string | undefined;
  /**
   * Changes when the option source changes (e.g. live agent state), so the
   * initial option list is reloaded even though `search` is held in a ref.
   */
  searchKey?: string | number;
} & FieldProps;

const identityKey = (value: unknown): string | undefined =>
  value == null ? undefined : String(value);

export const SearchField = ({
  name,
  label,
  search,
  createComponent,
  commandPlaceholder = "Search...",
  noOptionFoundPlaceholder = "No options found",
  description,
  toFieldValue,
  fieldKey = identityKey,
  searchKey,
}: SearchFieldProps) => {
  const form = useFormContext();

  const [options, setOptions] = useState<(Option | null | undefined)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // `search` is usually an inline closure (new identity every render). Keep
  // it in a ref so neither the initial load nor the per-keystroke query is
  // re-issued just because the parent rerendered.
  const searchRef = useLatestRef(search);

  // Guards against out-of-order responses: only the latest request may
  // populate the options.
  const requestRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((options: SearchOptions) => {
    const requestId = ++requestRef.current;
    searchRef
      .current(options)
      .then((res) => {
        if (requestRef.current !== requestId) return;
        setOptions(res || []);
        setError(null);
      })
      .catch((err) => {
        if (requestRef.current !== requestId) return;
        setError(err.message || "Error");
        setOptions([]);
      });
  }, []);

  const query = useCallback(
    (string: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        runSearch({ search: string });
      }, 200);
    },
    [runSearch],
  );

  useEffect(() => {
    runSearch({});
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, runSearch, searchKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            form.setValue(name, undefined, {
              shouldValidate: true,
            });
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [],
  );

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const currentKey = fieldKey(field.value);
        return (
        <>
          <FormItem className="flex flex-col dark:text-white">
            {label != undefined && <FormLabel>{label}</FormLabel>}
            <Command
              shouldFilter={false}
              className="overflow-visible bg-transparent"
            >
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverAnchor asChild>
                  <div className="group  text-sm rounded ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <div className="w-full relative h-10">
                      <CommandInput
                        onKeyDown={handleKeyDown}
                        placeholder={commandPlaceholder}
                        onValueChange={(e) => {
                          setInputValue(e);
                          query(e);
                        }}
                        value={inputValue}
                        onBlur={() => setOpen(false)}
                        onFocus={() => setOpen(true)}
                      />
                      {currentKey !== undefined && (
                        <div
                          className={cn(
                            "z-8 absolute w-full h-full cursor-pointer flex flex-row items-center bg-slate-800 top-0 left-0 rounded-md px-2 flex h-10 w-full rounded-md  py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 truncate",
                          )}
                          onClick={() => {
                            setInputValue("");
                            form.setValue(name, undefined, {
                              shouldValidate: true,
                            });
                            setOpen(true);
                            field.onChange(undefined);
                            inputRef.current?.focus();
                          }}
                        >
                          <ButtonLabel search={search} value={currentKey} />
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverAnchor>
                <PopoverContent
                  side="bottom"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                  onInteractOutside={(e) => e.preventDefault()}
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                >
                  <CommandList slot="list" className="w-full max-h-72 overflow-y-auto">
                    <div className="outline-none">
                      <CommandEmpty>{noOptionFoundPlaceholder}</CommandEmpty>
                      {error && (
                        <CommandGroup heading="Error">
                          {error && <CommandItem>{error}</CommandItem>}
                        </CommandGroup>
                      )}
                      {createComponent && (
                        <CommandGroup heading="Created">
                          {createComponent && (
                            <CommandItem>{createComponent}</CommandItem>
                          )}
                        </CommandGroup>
                      )}
                      {options.length > 0 && (
                        <CommandGroup heading="Options">
                          {options?.filter(notEmpty).map((option, index) => (
                            <CommandItem
                              value={option.value}
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onSelect={() => {
                                if (currentKey !== option.value) {
                                  form.setValue(
                                    name,
                                    toFieldValue ? toFieldValue(option.value) : option.value,
                                    { shouldValidate: true },
                                  );
                                  setInputValue("");
                                } else {
                                  form.setValue(name, null, {
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
                                  option.value === currentKey
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </div>
                  </CommandList>
                </PopoverContent>
              </Popover>
            </Command>
            {description && <FormDescription className="max-h-32 overflow-y-scroll">{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        </>
        );
      }}
    />
  );
};
