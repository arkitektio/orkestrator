import { Combobox } from "@headlessui/react";
import { useField } from "formik";
import Fuse from "fuse.js";
import { useEffect, useState } from "react";
import { useDrop } from "react-dnd";
import { notEmpty } from "../../../floating/utils";
import { Partner } from "../../../rekuest/postman/mater/mater-context";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";
import { CommonFieldProps } from "./types";

export type Option = {
  label: string;
  value: any;
  description?: string;
};
export type CommonProps = {
  name: string;
  disabled?: boolean;
  validate?: (value: any) => undefined | string | Promise<string | undefined>;
};

export type SearchInputProps<T extends Option> = CommonFieldProps<string> & {
  searchFunction: (
    query?: string,
    initialValue?: string[]
  ) => Promise<(T | null | undefined)[]>;
};

export type ListSearchInputProps<T extends Option> = CommonFieldProps<
  string[]
> & {
  searchFunction: (
    query?: string,
    initialValue?: string[]
  ) => Promise<(T | null | undefined)[]>;
};

export type FuseInputProps<T extends Option> = CommonFieldProps<string> & {
  options: T[];
};

export type ListFuseInputProps<T extends Option> = CommonFieldProps<
  string[]
> & {
  options: T[];
};

export type GraphQlSearchInputProps<T extends Option> =
  CommonFieldProps<string> & {
    searchFunction: (options: GraphQlSearchProps) => GraphQlSearchResult<T>;
  };

export type ListGraphQlSearchInputProps<T extends Option> = CommonFieldProps<
  string[]
> & {
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
  validate,
  accepts,
}: ListSearchInputProps<T>) => {
  const [field, meta, helpers] = useField<T["value"][] | undefined>({
    name: name,
    validate: validate,
  });
  const [query, setQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  const [displayOptions, setDisplayedOptions] = useState<
    (T | null | undefined)[] | undefined
  >([]);

  useEffect(() => {
    if (query) {
      searchFunction(query.trim(), undefined).then((x) => {
        console.log(x);
        setFilteredOptions(x);
      });
    }
  }, [query]);

  const displayValue = (value: any | undefined) => {
    console.log(value);
    if (!value || value.length === 0) {
      setDisplayedOptions([]);
      return Promise.resolve();
    }
    return searchFunction(undefined, value).then((x) => {
      console.log(x);
      setDisplayedOptions(x);
    });
  };

  const [{ isOver, canDrop, type }, drop] = useDrop(() => {
    return {
      accept: (accepts || []).concat(),
      drop: (partners: Partner[], monitor) => {
        console.log("dropped", partners);

        setValues(partners.map((p) => p.object));

        return {};
      },
      collect: (monitor) => {
        let type = monitor.getItemType() as Partner | null;
        let settype = type;
        return {
          isOver: !!monitor.isOver(),
          type: settype,
          canDrop: !!monitor.canDrop(),
        };
      },
    };
  });

  useEffect(() => {
    console.log("initial value", meta.initialValue);
    if (meta.initialValue) {
      displayValue(meta.initialValue);
    }
  }, []);

  const setValues = async (value: T["value"]) => {
    console.log("setting", value);
    helpers.setValue(value);
    displayValue(value).then(() => {
      setQuery("");
    });
  };

  return (
    <>
      <Combobox<T["value"]>
        onChange={setValues}
        multiple
        value={field.value || []}
      >
        <div
          className="flex flex-row bg-white text-black focus-within:ring-5 focus-within:ring ring-primary-400 rounded ring-offset-1 gap-1 p-1"
          ref={drop}
        >
          {displayOptions &&
            displayOptions.filter(notEmpty).map((option) => (
              <button
                type="button"
                className="p-1 flex-grow border-1 border-gray-300 rounded-md border"
                onDoubleClick={() =>
                  setValues(
                    field.value
                      ? field.value.filter((p) => p != option.value)
                      : []
                  )
                }
              >
                {option.label}
              </button>
            ))}
          <Combobox.Input
            onChange={(event) => setQuery(event.target.value)}
            className="flex-grow focus:outline-none"
          />
          {isOver && <>Drop here</>}
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
                  } ${selected ? "font-semibold" : "font-normal"}`
                }
              >
                {option.label}
              </Combobox.Option>
            ))}
        </Combobox.Options>
      </Combobox>
      {meta && meta.touched && meta.error && (
        <Alert prepend="Error" message={meta.error} />
      )}
    </>
  );
};

export const SearchField = <T extends Option>({
  name,
  searchFunction,
  validate,
}: SearchInputProps<T>) => {
  const [field, meta, helpers] = useField<T["value"]>({
    name: name,
    validate: validate,
  });
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

  const displayValue = (value: any | undefined) => {
    console.log(value);
    if (!value) {
      setDisplayedOptions([]);
      return Promise.resolve();
    }
    return searchFunction(undefined, [value]).then((x) => {
      console.log(x);
      setDisplayedOptions(x);
    });
  };

  useEffect(() => {
    console.log("initial value", meta.initialValue);
    if (meta.initialValue) {
      displayValue(meta.initialValue);
    }
  }, []);

  const setValues = async (value: T["value"]) => {
    console.log("setting", value);
    helpers.setValue(value);
    displayValue(value).then(() => {
      setQuery("");
    });
  };

  return (
    <>
      <Combobox<T["value"]>
        onChange={setValues}
        value={displayOptions?.at(0)?.value}
      >
        <div className="flex flex-row bg-white text-black focus-within:ring-5 focus-within:ring ring-primary-400 rounded ring-offset-1 gap-1 p-1">
          {displayOptions && displayOptions.at(0) ? (
            <div className="flex-grow text-center flex flex-row border-gray-400 border border-1 rounded-md">
              <button
                type="button"
                className="p-1 flex-grow"
                onDoubleClick={() => setValues(undefined)}
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
      {meta && meta.touched && meta.error && (
        <Alert prepend="Error" message={meta.error} />
      )}
    </>
  );
};

export const FuseSearchField = <T extends Option>({
  name,
  options,
  validate,
}: FuseInputProps<T>) => {
  const [field, meta, helpers] = useField<T["value"]>({
    name: name,
    validate: validate,
  });
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
  }, [field.value]);

  const setValues = async (value: T["value"]) => {
    console.log("settin", value);
    helpers.setValue(value);
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
                onDoubleClick={() => setValues(undefined)}
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
      {meta && meta.touched && meta.error && (
        <Alert prepend="Error" message={meta.error} />
      )}
    </>
  );
};

export const CreateableSearchField = <T extends Option>({
  name,
  searchFunction,
  createFunction,
  validate,
}: CreateableProps<T> & SearchInputProps<T>) => {
  const [field, meta, helpers] = useField<T["value"]>({
    name: name,
    validate: validate,
  });
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
  }, [field.value, meta.touched]);

  const setValue = async (value: T["value"]) => {
    console.log("Setting Value", value);
    helpers.setValue(value);
    helpers.setTouched(true);
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
                onDoubleClick={() => setValue(undefined)}
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
                className="relative cursor-default select-none py-2 px-4 text-gray-700 font-semibold"
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
      {meta && meta.touched && meta.error && (
        <Alert prepend="Error" message={meta.error} />
      )}
    </>
  );
};

export const CreateableListSearchField = <T extends Option>({
  name,
  searchFunction,
  createFunction,
  validate,
}: CreateableProps<T> & ListSearchInputProps<T>) => {
  const [field, meta, helpers] = useField<T["value"]>({
    name: name,
    validate: validate,
  });
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
  }, [field.value, meta.touched]);

  const setValue = async (value: T["value"]) => {
    console.log("Setting Value", value);
    helpers.setValue(value);
    helpers.setTouched(true);
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
      {meta && meta.touched && meta.error && (
        <Alert prepend="Error" message={meta.error} />
      )}
    </>
  );
};

export const ListSearchInput = wrapped(
  (props: ListSearchInputProps<Option>) => <ListSearchField {...props} />
);

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
  (props: ListSearchInputProps<Option> & CreateableProps<Option>) => (
    <CreateableListSearchField {...props} />
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
  ({ searchFunction, ...props }: ListGraphQlSearchInputProps<Option>) => {
    const downSearch = async (query: string | undefined, values?: string[]) => {
      let result = await searchFunction({
        variables: { search: query, values: values },
      });
      console.log(result);
      return result?.data?.options || [];
    };

    return <ListSearchField {...props} searchFunction={downSearch} />;
  }
);

export const GraphQLCreatableListSearchInput = wrapped(
  ({
    searchFunction,
    ...props
  }: ListGraphQlSearchInputProps<Option> & CreateableProps<Option>) => {
    const downSearch = async (query: string | undefined, values?: string[]) => {
      let result = await searchFunction({
        variables: { search: query, values: values },
      });
      return result?.data?.options || [];
    };

    return <CreateableListSearchField {...props} searchFunction={downSearch} />;
  }
);
