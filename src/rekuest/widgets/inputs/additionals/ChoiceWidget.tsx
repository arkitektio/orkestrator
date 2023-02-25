import { Field, FieldProps } from "formik";
import React from "react";
import Select from "react-select";
import {
  PortFragment,
  ChoiceWidgetFragment,
  PortKind,
  SliderWidgetFragment,
} from "../../../api/graphql";
import { InputWidgetProps } from "../../types";

export type ISliderProps = {
  port: PortFragment;
  widget?: SliderWidgetFragment;
};

export type SelectOption = { label: string; value: string };

interface EnumSelectWidgetProps extends FieldProps {
  options: { value: any; label: any }[];
  isMulti?: boolean;
}

export const EnumSelectWidget: React.FC<EnumSelectWidgetProps> = ({
  field,
  form,
  isMulti,
  options: selectOptions,
  meta,
}) => {
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

  let initialValue = meta?.initialValue || field.value || [];

  const defaultValue = isMulti
    ? selectOptions.filter((o) => initialValue.includes(o.value))
    : selectOptions.find((option) => {
        return option.value === initialValue;
      });

  return (
    <>
      <Select
        options={selectOptions}
        onChange={onChange}
        value={defaultValue}
        isMulti={isMulti}
      />
    </>
  );
};

const ChoiceWidget: React.FC<InputWidgetProps<ChoiceWidgetFragment>> = ({
  port,
  widget,
}) => {
  return (
    <Field
      isMulti={port.kind == PortKind.List}
      name={port.key || "fake"}
      component={EnumSelectWidget}
      className="mb-2"
      options={widget?.choices || []}
    />
  );
};

export { ChoiceWidget };
