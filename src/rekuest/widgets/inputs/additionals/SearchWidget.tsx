import { Field, FieldProps } from "formik";
import React, { useState } from "react";
import AsyncSelect from "react-select/async";
import { Identifier } from "typescript";
import { Alert } from "../../../../components/forms/Alert";
import { SelectOption } from "../../../../components/forms/fields/select_input";
import { PortKind, SearchWidgetFragment } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";
import { useWidgetRegistry } from "../../widget-context";

export type SearchOptions = [{ label: string; value: string }];

interface SearchSelectProps extends FieldProps {
  isMulti?: boolean;
  isDisabled?: boolean;
  identifier?: Identifier;
  searchFunction: (
    value: string,
    additionalVars: { [key: string]: any }
  ) => Promise<SelectOption[]>;
}

type IsMulti = boolean;

const SearchSelectWidget: React.FC<SearchSelectProps> = ({
  field,
  form,
  isMulti,
  isDisabled,
  searchFunction,
}) => {
  const [error, setError] = useState<string | null>(null);

  const meta = form.getFieldMeta(field.name);

  function onChange(option: any) {
    form.setFieldValue(
      field.name,
      option
        ? isMulti
          ? (option as SelectOption[]).map((item: SelectOption) => item.value)
          : (option as SelectOption).value
        : isMulti
        ? []
        : null
    );
  }

  const loadOptions = (inputValue: string, callback: any) => {
    searchFunction(inputValue, form.values)
      .then((x) => {
        console.log(x);
        callback(x);
      })
      .catch((e) => setError(JSON.stringify(e)));
  };

  const valueString = isMulti ? JSON.stringify(field.value) : field.value;

  return (
    <div className="flex-col">
      <AsyncSelect
        cacheOptions
        loadOptions={loadOptions}
        defaultOptions
        isMulti={isMulti}
        isClearable={true}
        onChange={onChange}
        placeholder={isDisabled ? "Disabled" : "Search..."}
        isDisabled={isDisabled}
      />
      {meta?.error && (
        <>
          <Alert prepend="Error" message={meta.error} />
        </>
      )}
    </div>
  );
};

const SearchWidget: React.FC<InputWidgetProps<SearchWidgetFragment>> = ({
  port,
  widget,
  options,
}) => {
  if (!widget?.ward)
    return (
      <>This port is not usable with this widget {JSON.stringify(widget)}</>
    );
  const ward = useWidgetRegistry().registry?.ward_registry.getWard(widget.ward);

  if (!ward?.search)
    return (
      <div>
        {" "}
        No ward specified for this {widget.ward}. Please register a Ward that
        supports "search"
      </div>
    );

  if (!widget?.query)
    return (
      <div>
        {" "}
        There is no widget query specified for this port. Please specify a
        Widget and a query for this port.
      </div>
    );

  const searchFunction = (
    search: string,
    additionals: { [key: string]: any }
  ) => {
    let query = widget.query;
    if (ward.search)
      try {
        console.log("searching", search, additionals);
        return ward
          .search({
            query: query as string,
            variables: { ...additionals, search: search },
          })
          .then((result) => result.options);
      } catch (e) {
        return Promise.reject("Malformed Query" + e);
      }
  };

  return (
    <Field
      isMulti={port.kind == PortKind.List}
      name={port.key || "fake"}
      component={SearchSelectWidget}
      className="mb-2"
      searchFunction={searchFunction}
      isDisabled={options?.disable}
    />
  );
};

export const ListSearchWidget: React.FC<
  InputWidgetProps<SearchWidgetFragment>
> = ({ port, widget, options }) => {
  if (!widget?.ward)
    return (
      <>This port is not usable with this widget {JSON.stringify(widget)}</>
    );

  const widgetRegistry = useWidgetRegistry();

  const ward = widgetRegistry.registry?.ward_registry.getWard(widget.ward);

  if (!ward?.search)
    return (
      <div>
        {" "}
        No ward specified for this {widget.ward}. Please register a Ward that
        supports "search"
      </div>
    );

  if (!widget?.query)
    return (
      <div>
        {" "}
        There is no widget query specified for this port. Please specify a
        Widget and a query for this port.
      </div>
    );

  const searchFunction = (
    search: string,
    additionals: { [key: string]: any }
  ) => {
    let query = widget.query;
    if (ward.search)
      try {
        console.log("searching", search, additionals);
        return ward
          .search({
            query: query as string,
            variables: { ...additionals, search: search },
          })
          .then((result) => result.options);
      } catch (e) {
        return Promise.reject("Malformed Query" + e);
      }
  };

  return (
    <Field
      isMulti={port.kind == PortKind.List}
      name={port.key || "fake"}
      component={SearchSelectWidget}
      className="mb-2"
      searchFunction={searchFunction}
      isDisabled={options?.disable}
    />
  );
};

export { SearchWidget };
