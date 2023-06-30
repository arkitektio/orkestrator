import { Combobox, Transition } from "@headlessui/react";
import { useField } from "formik";
import Fuse from "fuse.js";
import { Fragment, useEffect, useState } from "react";
import { useDrop } from "react-dnd";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
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

export const SearchContainer = ({ children, ...props }: any) => (
  <div
    className="relative w-full cursor-default overflow-hidden h-10 flex gap-1 flex-wrap flex-row rounded-lg bg-white text-left px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm"
    {...props}
  >
    {children}
  </div>
);

export const Wrapper = ({ children, ...props }: any) => (
  <div className="relative w-full h-10">{children}</div>
);

export const SearchContainerButton = ({ children, ...props }: any) => (
  <button
    type="button"
    className="flex-1 border-1 border rounded rounded-md border-gray-800 py-1 px-2  text-sm  text-gray-900 focus:ring-0 truncate overflow-hidden"
    {...props}
  >
    {children}
  </button>
);

export const NoResultsFound = () => (
  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
    No results found
  </div>
);

export const OptionItem = ({ option }: { option: Option }) => (
  <Combobox.Option
    key={option.value}
    value={option.value}
    className={({ active, selected }) =>
      `relative cursor-pointer select-none py-2 px-4  ${
        active ? "bg-primary-400 text-black" : "text-gray-900"
      } ${selected ? "bg-primary-400 font-semibold" : "font-normal"}`
    }
  >
    {option.label}
  </Combobox.Option>
);

export const MultiItem = ({ option }: { option: Option }) => (
  <Combobox.Option
    key={option.value}
    value={option.value}
    className={({ active, selected }) =>
      `relative cursor-default select-none py-2 pl-10 pr-4 ${
        active ? "bg-primary-400 text-black" : "text-gray-900"
      } ${selected ? "font-semibold" : "font-normal"}`
    }
  >
    {({ selected, active }) => (
      <>
        <span
          className={`block truncate ${
            selected ? "font-medium" : "font-normal"
          }`}
        >
          {option.label}
        </span>
        {selected ? (
          <span
            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
              active ? "text-white" : "text-teal-600"
            }`}
          >
            <IoMdCheckmarkCircleOutline
              className="h-5 w-5"
              aria-hidden="true"
            />
          </span>
        ) : null}
      </>
    )}
  </Combobox.Option>
);

export const SearchContainerInput = ({ ...props }: any) => (
  <Combobox.Input
    className="flex-grow focus:outline-none text-black h-full"
    displayValue={(value) => ""}
    {...props}
  />
);

export const DropDown = ({ children, ...props }: any) => (
  <Transition
    as={Fragment}
    leave="transition ease-in duration-100"
    leaveFrom="opacity-100"
    leaveTo="opacity-0"
  >
    <Combobox.Options
      {...props}
      static
      className={
        "absolute mt-1 max-h-60 z-10  w-full overflow-auto rounded-md bg-white text-black py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
      }
    >
      {children}
    </Combobox.Options>
  </Transition>
);

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
    setQuery("");
    displayValue(value).then(() => {});
  };

  return (
    <>
      <Combobox<T["value"]>
        onChange={setValues}
        multiple
        value={field.value || []}
      >
        <Wrapper>
          <SearchContainer ref={drop}>
            {displayOptions &&
              displayOptions
                .filter(notEmpty)
                .map((option) => (
                  <SearchContainerButton
                    onDoubleClick={() =>
                      setValues(
                        field.value
                          ? field.value.filter((p) => p != option.value)
                          : []
                      )
                    }
                  >
                    {option.label}
                  </SearchContainerButton>
                ))}
            <SearchContainerInput
              onChange={(event: any) => setQuery(event.target.value)}
            />
            {isOver && <>Drop here</>}
          </SearchContainer>
          <DropDown>
            {filteredOptions && filteredOptions.length === 0 && query != "" && (
              <NoResultsFound />
            )}

            {filteredOptions &&
              filteredOptions
                .filter(notEmpty)
                .map((option, index) => (
                  <OptionItem option={option} key={index} />
                ))}
          </DropDown>
        </Wrapper>
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
        <Wrapper>
          <SearchContainer>
            {displayOptions && displayOptions.at(0) ? (
              <SearchContainerButton onDoubleClick={() => setValues(undefined)}>
                {displayOptions.at(0)?.label}
              </SearchContainerButton>
            ) : (
              <SearchContainerInput
                onChange={(event: any) => setQuery(event.target.value)}
              />
            )}
          </SearchContainer>
          <DropDown>
            {filteredOptions && filteredOptions.length === 0 && query != "" && (
              <NoResultsFound />
            )}
            {filteredOptions &&
              filteredOptions
                .filter(notEmpty)
                .map((option, index) => (
                  <OptionItem option={option} key={index} />
                ))}
          </DropDown>
        </Wrapper>
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
        <Wrapper>
          <SearchContainer>
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
              <SearchContainerInput
                onChange={(event: any) => setQuery(event.target.value)}
              />
            )}
          </SearchContainer>
          <DropDown>
            {filteredOptions && filteredOptions.length === 0 && query != "" && (
              <NoResultsFound />
            )}
            {filteredOptions &&
              filteredOptions
                .filter(notEmpty)
                .map((option, index) => (
                  <OptionItem option={option} key={index} />
                ))}
          </DropDown>
        </Wrapper>
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
        <Wrapper>
          <SearchContainer>
            {displayOptions && displayOptions.length > 0 ? (
              <SearchContainerButton onDoubleClick={() => setValue(undefined)}>
                {displayOptions.at(0)?.label}
              </SearchContainerButton>
            ) : (
              <SearchContainerInput
                onChange={(event: any) => setQuery(event.target.value)}
              />
            )}
          </SearchContainer>
          <DropDown>
            {filteredOptions && filteredOptions.length === 0 && query == "" && (
              <NoResultsFound />
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
              filteredOptions
                .filter(notEmpty)
                .map((option, index) => (
                  <OptionItem option={option} key={index} />
                ))}
          </DropDown>
        </Wrapper>
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
        <SearchContainer>
          {displayOptions && displayOptions.length > 0 ? (
            <SearchContainerButton onClick={() => setValue(undefined)}>
              {displayOptions.at(0)?.label}
            </SearchContainerButton>
          ) : (
            <Combobox.Input
              onChange={(event) => setQuery(event.target.value)}
              className="flex-grow focus:outline-none"
            />
          )}
        </SearchContainer>
        <Combobox.Options
          className={
            "bg-white text-black p-1 rounded rounded-md border-gray-300 border drop-shadow drop-shadow-lg z-10"
          }
        >
          {filteredOptions && filteredOptions.length === 0 && query == "" && (
            <NoResultsFound />
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
            filteredOptions
              .filter(notEmpty)
              .map((option, index) => (
                <OptionItem option={option} key={index} />
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
