import { Field } from "formik";
import React from "react";
import { SliderWidgetFragment } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";

const SliderWidget: React.FC<InputWidgetProps<SliderWidgetFragment>> = ({
  port,
  widget,
}) => {
  return (
    <div>
      <label className="font-light" htmlFor={port.key || "name"}>
        {port.label || port.key}
      </label>
      <div className="w-full mt-2 mb-2 relative">
        <Field name={port.key || "undefined"}>
          {({
            field, // { name, value, onChange, onBlur } // also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
            meta,
          }: any) => (
            <div>
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
            </div>
          )}
        </Field>
      </div>
      {port.description && (
        <div
          id={`${port.key}-help`}
          className="font-light text-xs mb-4 mt-2 text-gray-600"
        >
          {port.description}
        </div>
      )}
    </div>
  );
};

export { SliderWidget };
