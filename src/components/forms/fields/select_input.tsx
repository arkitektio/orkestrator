import { Field, FieldProps } from "formik";
import { Maybe } from "graphql/jsutils/Maybe";
import React from "react";
import Select, { Options } from "react-select";
import { Alert } from "../Alert";

export interface SelectOption {
  [key: string]: any | null;
}

type IsMulti = boolean;

interface CustomSelectProps extends FieldProps {
  options: Options<SelectOption>;
  isMulti?: boolean;
  getOptionLabel?: (option: any) => string;
  getOptionValue?: (option: any) => any;
}

export const SelectField: React.FC<CustomSelectProps> = ({
  options,
  field,
  meta,
  form,
  isMulti,
  getOptionLabel = (o) => o.label,
  getOptionValue = (o) => o.value,
}) => {
  function onChange(option: SelectOption | SelectOption[]) {
    form.setFieldValue(
      field.name,
      option
        ? isMulti
          ? (option as SelectOption[]).map(getOptionValue)
          : getOptionValue(option)
        : []
    );
  }

  let initialValue = meta?.initialValue || field.value;

  const defaultValue = options
    ? isMulti
      ? options.filter((option: any) => {
          if (!initialValue) return false;
          return initialValue.indexOf(getOptionValue(option)) >= 0;
        })
      : options.find((option: any) => {
          console.log(options);
          return getOptionValue(option) == initialValue;
        })
    : isMulti
    ? []
    : ("" as any);

  console.log(defaultValue, initialValue, field, meta);
  return (
    <>
      <Select
        name={field.name}
        value={options.filter(
          (o) => field.value.indexOf(getOptionValue(o)) >= 0
        )}
        defaultValue={defaultValue}
        onChange={onChange}
        options={options}
        isMulti={isMulti}
        getOptionLabel={getOptionLabel}
        getOptionValue={getOptionValue}
      />
      {meta?.error && <Alert prepend="Error" message={meta.error} />}
    </>
  );
};

interface Props<T extends SelectOption = { value: string; label: string }> {
  name: string;
  label?: string;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  description?: string;
  options: Array<Maybe<T>>;
  isMulti?: boolean;
  getOptionLabel?: (option: T) => string;
  getOptionValue?: (option: T) => any;
}

export function SelectInputField<
  T extends SelectOption = { value: string; label: string }
>(props: Props<T>): any {
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
      <div
        className={props.className || "w-full mt-2 mb-2 relative text-black"}
      >
        <Field
          isMulti={props.isMulti ? true : false}
          id={props.name}
          name={props.name}
          component={SelectField}
          className="mb-2"
          options={props.options}
          getOptionLabel={props.getOptionLabel}
          getOptionValue={props.getOptionValue}
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
}
