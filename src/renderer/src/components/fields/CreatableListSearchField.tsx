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
import { PlusIcon } from "lucide-react";
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
          className="cursor-pointer px-1 py-1 bg-muted my-2"
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

export type CreateFunction = (input: string) => Promise<string | number>;


export type ListSearchFieldProps = {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  search: SearchFunction;
  create: CreateFunction;
  commandPlaceholder?: string;
  noOptionFoundPlaceholder?: string;
  createComponent?: React.ReactNode;
  className?: string;
} & FieldProps;

export const CreatableListSearchField = ({
  name,
  label,
  validate,
  search,
  create,
  createComponent,
  className,
  placeholder = "Please Select",
  commandPlaceholder = "Search...",
  noOptionFoundPlaceholder = "No options found",
  description,
}: ListSearchFieldProps) => {
  const form = useFormContext();

  const [options, setOptions] = useState<(Option | null | undefined)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const query = (string: string) => {
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


  const createValue = (input: string) => {
    create(input).then((value) => {
      search({ values: [value.toString()] })
      const currentValues = Array.isArray(form.getValues(name))
        ? form.getValues(name)
        : [];
      return form.setValue(name, [...currentValues, value.toString()], {
        shouldValidate: false,
      });
    });
  };

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
      rules={{ validate: validate }}
      render={({ field }) => (
        <>
          <FormItem className={cn("flex flex-col text-foreground", className)}>
            {label != undefined && <FormLabel>{label}</FormLabel>}
            <Command
              shouldFilter={false}
              className="overflow-visible bg-transparent"
            >
              <div className="group rounded-md border border-input text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="w-full relative flex flex-row flex-wrap w-full">
                  {field.value && (
                    <ListButtonLabel
                      search={search}
                      value={field.value}
                      setValue={(value) => {
                        form.setValue(name, value, { shouldValidate: true });
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
                                if (
                                  field.value &&
                                  Array.isArray(field.value) &&
                                  field.value.includes(option.value)
                                ) {
                                  form.setValue(
                                    name,
                                    field.value.filter(
                                      (val) => val !== option.value,
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
                                      option.value,
                                    ],
                                    {
                                      shouldValidate: false,
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
                                    field.value.includes(option.value)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </div>
                    {inputValue && inputValue.length > 1 && <CommandItem onSelect={() => createValue(inputValue)}>
                      <PlusIcon className="mr-2"></PlusIcon> Create <pre className="ml-2 inline font-light p-1 bg-muted rounded">{inputValue}</pre>{" "}
                    </CommandItem>}
                  </CommandList>
                )}
              </div>
            </Command>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        </>
      )}
    />
  );
};
