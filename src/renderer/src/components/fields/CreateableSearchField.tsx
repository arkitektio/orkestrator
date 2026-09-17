import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
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
import { useDebounce } from "@uidotdev/usehooks";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    props
      .search({ values: [props.value] })
      .then((res) => {
        setOption(res[0]);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [props.value, props.search]);

  return (
    <>
      {option?.label}
      {error}
    </>
  );
};

export type SearchOptions = { search?: string; values?: (string | number)[] };

export type SearchFunction = (
  searching: SearchOptions,
) => Promise<(Option | null | undefined)[]>;

// Should create a new option following the input and should return the value (will then cause a new search)
export type CreateFunction = (input: string) => Promise<string | number>;

export type CreatableSearchFieldProps = {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  commandPlaceholder?: string;
  noOptionFoundPlaceholder?: string;
  search: SearchFunction;
  create: CreateFunction;
} & FieldProps;

export const CreateableSearchField = ({
  name,
  label,
  create,
  validate,
  search,

  placeholder = "Please Select",
  commandPlaceholder = "Search...",
  noOptionFoundPlaceholder = "No options found",
  description,
}: CreatableSearchFieldProps) => {
  const form = useFormContext();

  const [options, setOptions] = useState<(Option | null | undefined)[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [latestQuery, setLatestQuery] = useState<string>("");
  const debouncedQuery = useDebounce(latestQuery, 200);

  const query = (string: string) => {
    search({ search: string })
      .then((res) => {
        setOptions(res);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      });
  };

  useEffect(() => {
    if (debouncedQuery) {
      query(debouncedQuery);
    }
  }, [debouncedQuery]);

  const createValue = (input: string) => {
    create(input).then((value) => {
      search({ values: [value] })
      return form.setValue(name, value, {
        shouldValidate: false,
      });
    });
  };

  useEffect(() => {
    search({})
      .then((res) => {
        setOptions(res);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [name, search]);

  return (
    <FormField
      control={form.control}
      name={name}
      rules={{ validate }}
      render={({ field }) => (
        <>
          <FormItem className="flex flex-col">
            <FormLabel>{label != undefined ? label : name}</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "justify-between overflow-hidden truncate ellipsis",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {field.value ? (
                      <ButtonLabel search={search} value={field.value} />
                    ) : (
                      <> {error ? error : placeholder}</>
                    )}
                    <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[80%] p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={commandPlaceholder}
                    className="h-9"
                    onValueChange={(e) => {
                      setLatestQuery(e);
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>{noOptionFoundPlaceholder}</CommandEmpty>
                    {error && (
                      <CommandGroup heading="Error">
                        {error && <CommandItem>{error}</CommandItem>}
                      </CommandGroup>
                    )}
                    <CommandGroup>
                      {options.filter(notEmpty).map((option) => (
                        <CommandItem
                          value={option.value}
                          key={option.value}
                          onSelect={() => {
                            form.setValue(name, option.value, {
                              shouldValidate: true,
                            });
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
                    {latestQuery && latestQuery.length > 1 && <CommandItem onSelect={() => createValue(latestQuery)}>
                      <PlusIcon className="mr-2"></PlusIcon> Create <pre className="ml-2 inline font-light p-1 bg-muted rounded">{latestQuery}</pre>{" "}
                    </CommandItem>}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        </>
      )}
    />
  );
};
