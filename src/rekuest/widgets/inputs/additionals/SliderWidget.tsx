import { Field } from "formik";
import React from "react";
import { SliderWidgetFragment } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";

const SliderWidget: React.FC<InputWidgetProps<SliderWidgetFragment>> = ({
  port,
  widget,
}) => {
  return (
    <Field name={port.key || "undefined"}>
      {({
        field, // { name, value, onChange, onBlur } // also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
        meta,
      }: any) => (
        <>
          <div className="flex w-full">
            <input
              type="range"
              className="flex-grow mr-1"
              min={widget?.min || 0}
              max={widget?.max || 3}
              {...field}
            />
            {field.value}
          </div>

          {meta.touched && meta.error && (
            <div className="error">{meta.error}</div>
          )}
        </>
      )}
    </Field>
  );
};

export { SliderWidget };
