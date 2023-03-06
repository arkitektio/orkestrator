import { Field, FieldProps } from "formik";
import React, { useState } from "react";
import { OptionsOrGroups } from "react-select";
import AsyncSelect from "react-select/async";
import AsyncCreatableSelect from "react-select/async-creatable";
import { ProvisionPulse } from "../../../rekuest/components/generic/StatusPulse";
import { SelectOption } from "./select_input";
import { wrapped } from "./Wrapper";

export type Option = {
  label: string;
  value: string;
  description?: string;
};

type LazySearchResult = Promise<{
  data?: {
    options?: (Option | null)[] | null | undefined;
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
  disabled?: boolean;
  lazySearch?: (options: LazySearchOptions) => LazySearchResult;
}

export interface CreateableSearchProps extends SearchProps {
  createFunction: (value: string) => Promise<Option>;
}

export type SearchOptions = [{ label: string; value: string }];

interface SearchSelectProps extends FieldProps {
  isMulti?: boolean;
  disabled?: boolean;
  searchFunction: (options: LazySearchOptions) => LazySearchResult;
}

interface CreatableSearchSelectProps extends FieldProps {
  isMulti?: boolean;
  disabled?: boolean;
  searchFunction: (options: LazySearchOptions) => LazySearchResult;
  createFunction: (value: string) => Promise<Option>;
}

type IsMulti = boolean;

export const SearchSelectWidget: React.FC<SearchSelectProps> = ({
  field,
  form,
  isMulti,
  meta,
  searchFunction,
  disabled,
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

  let initialValue = meta?.initialValue || field.value;

  const defaultValue = isMulti
    ? initialValue?.map((x: any) => ({ value: x, label: x }))
    : { value: initialValue, label: initialValue };

  console.log(defaultValue);

  return (
    <>
      <AsyncSelect
        isMulti={isMulti}
        cacheOptions
        loadOptions={loadOptions}
        defaultOptions
        defaultValue={defaultValue}
        onChange={onChange}
        isDisabled={form.isSubmitting || disabled}
      />
    </>
  );
};

export const CreatableSearchSelectWidget: React.FC<
  CreatableSearchSelectProps
> = ({ field, form, isMulti, searchFunction, createFunction, meta }) => {
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

  let initialValue = meta?.initialValue || field.value;

  const defaultValue = isMulti
    ? initialValue?.map((x: any) => ({ value: x, label: x }))
    : { value: initialValue, label: initialValue };

  return (
    <>
      <AsyncCreatableSelect
        isMulti={isMulti}
        cacheOptions
        loadOptions={loadOptions}
        defaultValue={defaultValue}
        defaultOptions
        onChange={onChange}
        onCreateOption={(inputValue) => {
          createFunction(inputValue).then((res) => {
            console.log(res);
            onChange(res);
          });
        }}
      />
    </>
  );
};

export const SearchSelectInput = wrapped((props: SearchProps) => {
  return (
    <Field
      isMulti={props.isMulti}
      name={props.name}
      component={SearchSelectWidget}
      className="mb-2"
      searchFunction={props.lazySearch}
      disabled={props.disabled}
    />
  );
});

export const CreateableSearchSelectInput = wrapped(
  (props: CreateableSearchProps) => {
    return (
      <>
        <Field
          isMulti={props.isMulti}
          name={props.name}
          component={CreatableSearchSelectWidget}
          className="mb-2"
          searchFunction={props.lazySearch}
          createFunction={props.createFunction}
        />
      </>
    );
  }
);

export const CreateableSearchSelect = wrapped((props: SearchProps) => {
  return (
    <>
      <Field
        isMulti={props.isMulti}
        name={props.name}
        component={CreatableSearchSelectWidget}
        className="mb-2"
        searchFunction={props.lazySearch}
      />
    </>
  );
});
