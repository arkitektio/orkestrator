import { Field, FieldProps } from "formik";
import React, { useState } from "react";
import { OptionsOrGroups } from "react-select";
import AsyncSelect from "react-select/async";
import AsyncCreatableSelect from "react-select/async-creatable";
import { SelectOption } from "./select_input";

type LazySearchResult = Promise<{
  data?: {
    options?: ({ value: any; label: any } | null)[] | null | undefined;
  };
}>;

type LazySearchOptions = { variables: { search: string } } & any;

export interface SearchProps {
  name: string;
  label?: string;
  description?: string;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  isMulti?: boolean;
  lazySearch?: (options: LazySearchOptions) => LazySearchResult;
}

export type SearchOptions = [{ label: string; value: string }];

interface SearchSelectProps extends FieldProps {
  isMulti?: boolean;
  searchFunction: (options: LazySearchOptions) => LazySearchResult;
}

type IsMulti = boolean;

export const SearchSelectWidget: React.FC<SearchSelectProps> = ({
  field,
  form,
  isMulti,
  searchFunction,
}) => {
  const [error, setError] = useState<string | null>(null);

  function onChange(option: any) {
    form.setFieldValue(
      field.name,
      option
        ? isMulti
          ? (option as SelectOption[]).map((item: SelectOption) => item.value)
          : (option as SelectOption).value
        : []
    );
  }

  const loadOptions = (
    inputValue: string,
    callback: (options: OptionsOrGroups<SelectOption, any>) => void
  ) => {
    searchFunction({ variables: { search: inputValue } })
      .then((res) => {
        if (res.data?.options) {
          let options = res.data.options.map((item: any) => ({
            value: item.value,
            label: item.label,
          }));

          callback && callback(options);
        }
      })
      .catch((e) => setError(JSON.stringify(e)));
  };

  if (error) return <> {error}</>;

  return (
    <>
      <AsyncSelect
        isMulti={isMulti}
        cacheOptions
        loadOptions={loadOptions}
        defaultOptions
        onChange={onChange}
      />
    </>
  );
};

export const CreatableSearchSelectWidget: React.FC<SearchSelectProps> = ({
  field,
  form,
  isMulti,
  searchFunction,
}) => {
  const [error, setError] = useState<string | null>(null);

  function onChange(option: any) {
    form.setFieldValue(
      field.name,
      option
        ? isMulti
          ? (option as SelectOption[]).map((item: SelectOption) => item.value)
          : (option as SelectOption).value
        : []
    );
  }

  const loadOptions = (
    inputValue: string,
    callback: (options: OptionsOrGroups<SelectOption, any>) => void
  ) => {
    if (searchFunction) {
      searchFunction({ variables: { search: inputValue } })
        .then((res) => {
          if (res.data?.options) {
            let options = res.data.options.map((item: any) => ({
              value: item.value,
              label: item.label,
            }));

            callback && callback(options);
          }
        })
        .catch((e) => setError(JSON.stringify(e)));
    }

    callback && callback([]);
  };

  if (error) return <> {error}</>;

  return (
    <>
      <AsyncCreatableSelect
        isMulti={isMulti}
        cacheOptions
        loadOptions={loadOptions}
        defaultOptions
        onChange={onChange}
      />
    </>
  );
};

export const SearchSelectInput = (props: SearchProps) => {
  return (
    <>
      {props.label && (
        <label
          className={props.labelClassName || "font-light"}
          htmlFor={props.name}
        >
          {props.label}
        </label>
      )}
      <div className="w-full mt-2 mb-2 relative">
        <Field
          isMulti={props.isMulti}
          name={props.name}
          component={SearchSelectWidget}
          className="mb-2"
          searchFunction={props.lazySearch}
        />
      </div>
      {props.description && (
        <div
          id={`${props.name}-help`}
          className={
            props.descriptionClassName ||
            "font-light text-xs mb-4 mt-2 text-gray-600"
          }
        >
          {props.description}
        </div>
      )}
    </>
  );
};

export const CreateableSearchSelect = (props: SearchProps) => {
  return (
    <>
      {props.label && (
        <label
          className={props.labelClassName || "font-light"}
          htmlFor={props.name}
        >
          {props.label}
        </label>
      )}
      <div className={props.className || "w-full mt-2 mb-2 relative"}>
        <Field
          isMulti={props.isMulti}
          name={props.name}
          component={CreatableSearchSelectWidget}
          className="mb-2"
          searchFunction={props.lazySearch}
        />
      </div>
      {props.description && (
        <div
          id={`${props.name}-help`}
          className={
            props.descriptionClassName ||
            "font-light text-xs mb-4 mt-2 text-gray-600"
          }
        >
          {props.description}
        </div>
      )}
    </>
  );
};
