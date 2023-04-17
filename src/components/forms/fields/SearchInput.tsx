import React, { useEffect, useState } from "react";
import { Combobox } from "@headlessui/react";
import { useField } from "formik";
import { notEmpty } from "../../../floating/utils";
import { wrapped } from "./Wrapper";
import Fuse from "fuse.js";

export type Option = {
  label: string;
  value: any;
  description?: string;
};
export type CommonProps = {
  name: string;
  disabled?: boolean;
};

export type SearchInputProps<T extends Option> = CommonProps & {
  searchFunction: (
    query?: string,
    initialValue?: string[]
  ) => Promise<(T | null | undefined)[]>;
};

export type FuseInputProps<T extends Option> = CommonProps & {
  options: T[];
};

export type GraphQlSearchInputProps<T extends Option> = CommonProps & {
  searchFunction: (options: GraphQlSearchProps) => GraphQlSearchResult<T>;
};

type GraphQlSearchProps = {
  variables: { search?: string; values?: string };
} & any;

type GraphQlSearchResult<T extends Option> = Promise<{
  data?: {
    options?: (T | null)[] | null | undefined;
  };
}>;

export type CreateableProps<T extends Option> = {
  createFunction: (value: string) => Promise<T | null | undefined>;
};

export const ListSearchField = <T extends Option>({
  name,
  searchFunction,
}: SearchInputProps<T>) => {
  const [field, meta, helpers] = useField<T["value"][] | undefined>(name);
  const [query, setQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  const [displayOptions, setDisplayedOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  useEffect(() => {
    searchFunction(query.trim(), undefined).then((x) => {
      console.log(x);
      setFilteredOptions(x);
    });
  }, [query]);

  useEffect(() => {
    let value = field.value || (meta.touched ? undefined : meta.initialValue);
    console.log(value);
    if (!value) {
      setDisplayedOptions([]);
      return;
    }
    searchFunction(undefined, field.value).then((x) => {
      console.log(x);
      setDisplayedOptions(x);
    });
  }, [field.value]);

  const setValues = async (values: T["value"][]) => {
    const value = values;
    helpers.setValue(value);
    setQuery("");
  };

  return (
    <>
      <Combobox<T["value"]> onChange={setValues} multiple>
        <div className="flex flex-row bg-white text-black focus-within:ring-5 focus-within:ring ring-primary-400 rounded ring-offset-1 gap-1 p-1">
          {displayOptions &&
            displayOptions.filter(notEmpty).map((option) => (
              <div
                key={option.value}
                className="group flex-shrink flex flex-row border-gray-400 border border-1 rounded-md"
              >
                <div className="p-1 flex-1">{option.label}</div>
                <button
                  type="button"
                  onClick={() =>
                    setValues(
                      field.value
                        ? field.value.filter((p) => p != option.value)
                        : []
                    )
                  }
                  className="flex-shrink flex flex-row bg-primary-400 hover:bg-primary-600 group-hover:opacity-100 overflow-hidden rounded-r-md"
                >
                  <div className="p-1">x</div>
                </button>
              </div>
            ))}
          <Combobox.Input
            onChange={(event) => setQuery(event.target.value)}
            className="flex-grow focus:outline-none"
          />
        </div>
        <Combobox.Options
          className={"bg-white text-black p-1 rounded rounded-md"}
        >
          {filteredOptions && filteredOptions.length === 0 && query != "" && (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              No results found
            </div>
          )}
          {filteredOptions &&
            filteredOptions.filter(notEmpty).map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                className={({ active, selected }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-primary-400 text-white" : "text-gray-900"
                  } ${selected ? "font-semibold" : ""}`
                }
              >
                {option.label}
              </Combobox.Option>
            ))}
        </Combobox.Options>
      </Combobox>
    </>
  );
};

export const SearchField = <T extends Option>({
  name,
  disabled,
  searchFunction,
}: SearchInputProps<T>) => {
  const [field, meta, helpers] = useField<T["value"]>(name);
  const [reset, setReset] = useState(false);
  const [query, setQuery] = useState("");

  const [filteredOptions, setFilteredOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  const [displayOptions, setDisplayedOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  useEffect(() => {
    searchFunction(query.trim(), undefined).then((x) => {
      console.log(x);
      setFilteredOptions(x);
    });
  }, [query]);

  useEffect(() => {
    let value = field.value || (meta.touched ? undefined : meta.initialValue);
    console.log(value);
    if (!value) {
      setDisplayedOptions([]);
      return;
    }
    searchFunction(undefined, [field.value]).then((x) => {
      console.log(x);
      setDisplayedOptions(x);
    });
  }, [field.value, reset]);

  const setValues = async (value: T["value"]) => {
    console.log(value);
    helpers.setValue(value);
    setReset(!reset);
    setQuery("");
  };

  return (
    <>
      <Combobox<T["value"]> onChange={setValues} value={query}>
        <div className="flex flex-row bg-white text-black focus-within:ring-5 focus-within:ring ring-primary-400 rounded ring-offset-1 gap-1 p-1">
          {displayOptions && displayOptions.at(0) ? (
            <div className="flex-grow text-center flex flex-row border-gray-400 border border-1 rounded-md">
              <button
                type="button"
                className="p-1 flex-grow"
                onClick={() => setValues(undefined)}
              >
                {displayOptions.at(0)?.label}
              </button>
            </div>
          ) : (
            <Combobox.Input
              onChange={(event) => setQuery(event.target.value)}
              className="flex-grow focus:outline-none"
            />
          )}
        </div>
        <Combobox.Options
          className={"bg-white text-black p-1 rounded rounded-md"}
        >
          {filteredOptions && filteredOptions.length === 0 && query != "" && (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              No results found
            </div>
          )}
          {filteredOptions &&
            filteredOptions.filter(notEmpty).map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-primary-400 text-white" : "text-gray-900"
                  }`
                }
              >
                {option.label}
              </Combobox.Option>
            ))}
        </Combobox.Options>
      </Combobox>
    </>
  );
};

export const FuseSearchField = <T extends Option>({
  name,
  disabled,
  options,
}: FuseInputProps<T>) => {
  const [field, meta, helpers] = useField<T["value"]>(name);
  const [reset, setReset] = useState(false);
  const [query, setQuery] = useState("");

  const [fuse, setFuse] = useState<Fuse<T> | undefined>(
    () => new Fuse(options, { keys: ["label"] })
  );

  const [filteredOptions, setFilteredOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  const [displayOptions, setDisplayedOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  useEffect(() => {
    setFilteredOptions(fuse?.search(query.trim()).map((x) => x.item));
  }, [query]);

  useEffect(() => {
    let value = field.value || (meta.touched ? undefined : meta.initialValue);
    console.log(value);
    if (!value) {
      setDisplayedOptions([]);
      return;
    }
    setDisplayedOptions(options?.filter((x) => x.value === value));
  }, [field.value, reset]);

  const setValues = async (value: T["value"]) => {
    console.log(value);
    helpers.setValue(value);
    setReset(!reset);
    setQuery("");
  };

  return (
    <>
      <Combobox<T["value"]> onChange={setValues} value={query}>
        <div className="flex flex-row bg-white text-black focus-within:ring-5 focus-within:ring ring-primary-400 rounded ring-offset-1 gap-1 p-1">
          {displayOptions && displayOptions.at(0) ? (
            <div className="flex-grow text-center flex flex-row border-gray-400 border border-1 rounded-md">
              <button
                type="button"
                className="p-1 flex-grow"
                onClick={() => setValues(undefined)}
              >
                {displayOptions.at(0)?.label}
              </button>
            </div>
          ) : (
            <Combobox.Input
              onChange={(event) => setQuery(event.target.value)}
              className="flex-grow focus:outline-none"
            />
          )}
        </div>
        <Combobox.Options
          className={"bg-white text-black p-1 rounded rounded-md"}
        >
          {filteredOptions && filteredOptions.length === 0 && query != "" && (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              No results found
            </div>
          )}
          {filteredOptions &&
            filteredOptions.filter(notEmpty).map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-primary-400 text-white" : "text-gray-900"
                  }`
                }
              >
                {option.label}
              </Combobox.Option>
            ))}
        </Combobox.Options>
      </Combobox>
    </>
  );
};

export const CreateableSearchField = <T extends Option>({
  name,
  disabled,
  searchFunction,
  createFunction,
}: CreateableProps<T> & SearchInputProps<T>) => {
  const [field, meta, helpers] = useField<T["value"]>(name);
  const [query, setQuery] = useState("");

  const [filteredOptions, setFilteredOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  const [displayOptions, setDisplayedOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  useEffect(() => {
    console.log("Query", query);
    searchFunction(query.trim(), undefined).then((x) => {
      console.log("aa", x);
      setFilteredOptions(x);
    });
  }, [query]);

  useEffect(() => {
    let value = field.value || (meta.touched ? undefined : meta.initialValue);
    if (!value) {
      setDisplayedOptions([]);
      return;
    }
    searchFunction(undefined, value).then((x) => {
      console.log("aa", x);
      setDisplayedOptions(x);
    });
  }, [field.value]);

  const setValue = async (value: T["value"]) => {
    console.log("Setting Value", value);
    helpers.setValue(value);
    setQuery("");
  };

  return (
    <>
      <Combobox<T["value"]> onChange={setValue} value={query}>
        <div className="flex w-full bg-white text-black focus-within:ring-5 focus-within:ring ring-primary-400 rounded ring-offset-1 gap-1 p-1">
          {displayOptions && displayOptions.length > 0 ? (
            <div className="flex-grow text-center flex flex-row border-gray-400 border border-1 rounded-md">
              <button
                type="button"
                className="p-1 flex-grow"
                onClick={() => setValue(undefined)}
              >
                {displayOptions.at(0)?.label}
              </button>
            </div>
          ) : (
            <Combobox.Input
              onChange={(event) => setQuery(event.target.value)}
              className="flex-grow focus:outline-none"
            />
          )}
        </div>
        <Combobox.Options
          className={
            "bg-white text-black p-1 rounded rounded-md border-gray-300 border drop-shadow drop-shadow-lg z-10"
          }
        >
          {filteredOptions && filteredOptions.length === 0 && query == "" && (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700 font-light">
              No results found
            </div>
          )}
          {query.length > 0 &&
            filteredOptions &&
            filteredOptions.length === 0 && (
              <Combobox.Button
                className="relative cursor-default select-none py-2 px-4 text-gray-700 font-semibold hover:"
                onClick={async () => {
                  let result = await createFunction(query);
                  console.log(result);
                  setValue(result?.value);
                }}
              >
                Create "{query}"
              </Combobox.Button>
            )}
          {filteredOptions &&
            filteredOptions.filter(notEmpty).map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-primary-400 text-white" : "text-gray-900"
                  }`
                }
              >
                {option.label}
              </Combobox.Option>
            ))}
        </Combobox.Options>
      </Combobox>
    </>
  );
};

export const ListSearchInput = wrapped((props: SearchInputProps<Option>) => (
  <ListSearchField {...props} />
));

export const FuseSearchInput = wrapped((props: FuseInputProps<Option>) => (
  <FuseSearchField {...props} />
));

export const SearchInput = wrapped((props: SearchInputProps<Option>) => (
  <SearchField {...props} />
));

export const CreateableSearchInput = wrapped(
  (props: SearchInputProps<Option> & CreateableProps<Option>) => (
    <CreateableSearchField {...props} />
  )
);

export const CreateableListSearchInput = wrapped(
  (props: SearchInputProps<Option> & CreateableProps<Option>) => (
    <CreateableSearchField {...props} />
  )
);

export const GraphQLSearchInput = wrapped(
  ({ searchFunction, ...props }: GraphQlSearchInputProps<Option>) => {
    const downSearch = async (query: string | undefined, values?: string[]) => {
      let result = await searchFunction({
        variables: { search: query, values: values },
      });
      return result?.data?.options || [];
    };

    return <SearchField {...props} searchFunction={downSearch} />;
  }
);

export const GraphQLListSearchInput = wrapped(
  ({ searchFunction, ...props }: GraphQlSearchInputProps<Option>) => {
    const downSearch = async (query: string | undefined, values?: string[]) => {
      let result = await searchFunction({
        variables: { search: query, values: values },
      });
      return result?.data?.options || [];
    };

    return <ListSearchField {...props} searchFunction={downSearch} />;
  }
);

export const GraphQLCreatableListSearchInput = wrapped(
  ({
    searchFunction,
    ...props
  }: GraphQlSearchInputProps<Option> & CreateableProps<Option>) => {
    const downSearch = async (query: string | undefined, values?: string[]) => {
      let result = await searchFunction({
        variables: { search: query, values: values },
      });
      return result?.data?.options || [];
    };

    return <CreateableSearchField {...props} searchFunction={downSearch} />;
  }
);
