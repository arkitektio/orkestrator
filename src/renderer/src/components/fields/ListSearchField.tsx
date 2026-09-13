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
  FormMessage
} from "@/components/ui/form";
import { cn, notEmpty } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Badge } from "../ui/badge";
import { FieldProps } from "./types";

export type Option = {
  label: string;
  value: string;
};

export const ListButtonLabel = (props: {
  search: SearchFunction;
  value: string[] | undefined;
  setValue: (value: string[]) => void;
  placeholder?: string;
}) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (props.value == undefined) {
      setOptions([]);
      return;
    }
    if (props.value.length == 0) {
      setOptions([]);
      return;
    }
    props
      .search({ values: props.value })
      .then((res) => {
        setOptions(res.filter(notEmpty));
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [props.value, props.search]);

  const remove = (value: string) => {
    props.setValue(props.value?.filter((v) => v !== value) || []);
  };

  return (
    <div className="gap-2 flex flex-row p-1">
      {options.map((l, index) => (
        <Badge
          key={index}
          onClick={() => remove(l.value)}
          className="cursor-pointer px-1 py-1 bg-slate-300 my-2"
        >
          {l.label}
        </Badge>
      ))}
      {error}
    </div>
  );
};

export type SearchOptions = { search?: string; values?: string[] };

export type SearchFunction = (
  searching: SearchOptions,
) => Promise<(Option | null | undefined)[]>;

export type ListSearchFieldProps = {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  search: SearchFunction;
  commandPlaceholder?: string;
  noOptionFoundPlaceholder?: string;
  createComponent?: React.ReactNode;
  className?: string;
  /** Stored form value for the selected option values (default: the string[] itself). */
  toFieldValue?: (values: string[]) => unknown;
  /** Selected option values for a stored form value (inverse of `toFieldValue`). */
  fromFieldValue?: (fieldValue: unknown) => string[] | undefined;
} & FieldProps;

const identityIn = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? (value as string[]) : undefined;

export const ListSearchField = ({
  name,
  label,
  search,
  createComponent,
  className,
  placeholder = "Please Select",
  commandPlaceholder = "Search...",
  noOptionFoundPlaceholder = "No options found",
  description,
  toFieldValue,
  fromFieldValue = identityIn,
}: ListSearchFieldProps) => {
  const form = useFormContext();
  const store = (values: string[]) => (toFieldValue ? toFieldValue(values) : values);

  const [options, setOptions] = useState<(Option | null | undefined)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = (string: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      search({ search: string })
        .then((res) => {
          setOptions(res || []);
          setOpen(true);
          setError(null);
        })
        .catch((err) => {
          setError(err.message);
          setOptions([]);
        });
    }, 200);
  };

  useEffect(() => {
    search({})
      .then((res) => {
        setOptions(res || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Error");
        setOptions([]);
      });
  }, [name, search]);

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
        const selected = fromFieldValue(field.value);
        return (
        <>
          <FormItem className={cn("flex flex-col dark:text-white", className)}>
            {label != undefined && <FormLabel>{label}</FormLabel>}
            <Command
              shouldFilter={false}
              className="overflow-visible bg-transparent"
            >
              <div className="group rounded-md border border-input text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="w-full relative flex flex-row flex-wrap w-full">
                  {selected && (
                    <ListButtonLabel
                      search={search}
                      value={selected}
                      setValue={(value) => {
                        form.setValue(name, store(value), { shouldValidate: true });
                        setInputValue("");
                        inputRef.current?.focus();
                        setOpen(true);
                      }}
                    />
                  )}
                  <CommandInput
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || commandPlaceholder}
                    onValueChange={(e) => {
                      setInputValue(e);
                      query(e);
                    }}
                    value={inputValue}
                    onBlur={() => setOpen(false)}
                    onFocus={() => {
                      setOpen(true);
                    }}
                    className="flex-grow"
                  />
                </div>
              </div>
              <div className="relative mt-2">
                {open && (
                  <CommandList slot="list" className="w-full">
                    <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
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
                                const current = selected ?? [];
                                const next = current.includes(option.value)
                                  ? current.filter((val) => val !== option.value)
                                  : [...current, option.value];
                                form.setValue(name, store(next), {
                                  shouldValidate: true,
                                });
                                setInputValue("");
                              }}
                            >
                              {option.label}
                              <CheckIcon
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selected?.includes(option.value)
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
                )}
              </div>
            </Command>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        </>
        );
      }}
    />
  );
};
