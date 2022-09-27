import { components, GroupProps } from "react-select";

import AsyncSelect from "react-select/async";
export interface FilterOption {
  group: string;
  value: string;
  label: string;
}

export interface GroupedOption {
  label: string;
  options: FilterOption;
}

const groupStyles = {
  borderRadius: "5px",
  background: "#f2fcff",
};

const Group = (props: GroupProps<FilterOption, false>) => (
  <div style={groupStyles}>
    <components.Group {...props} />
  </div>
);

export interface SearchFilterProps {
  onChange?: (filters: { [model: string]: string[] }) => void;
  query: (baseOptions: any) => any;
  placeholder?: string;
  additionalValues?: { [params: string]: any };
}

export const SearchFilter: React.FC<SearchFilterProps> = (props) => {
  const { data, refetch } = props.query({});

  const promiseOptions = (inputValue: string) => {
    return new Promise<unknown>((resolve) => {
      refetch({ value: inputValue, ...props.additionalValues }).then(
        (res: any) => {
          if (res.data) {
            let result = Object.keys(res.data).map((key) => ({
              label: key,
              options: (res.data as any)[key].map((o: any) => ({
                ...o,
                group: key,
              })),
            }));
            resolve(result);
          }
        }
      );
    });
  };

  const onChange = (options: any[]) => {
    let valueObject: {
      [model: string]: string[];
    } = options.reduce((o, x) => {
      if (x.group in o) {
        return {
          ...o,
          [x.group]: [...(o as any)[x.group], x.value],
        };
      } else {
        return {
          ...o,
          [x.group]: [x.value],
        };
      }
    }, {});

    props.onChange && props.onChange(valueObject);
  };

  return (
    <AsyncSelect
      placeholder={props.placeholder || "All Images"}
      cacheOptions
      defaultOptions={true}
      onChange={onChange as any}
      loadOptions={promiseOptions as any}
      components={{ Group }}
      isMulti={true as any}
    />
  );
};
