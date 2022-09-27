import { Field } from "formik";
import React from "react";
import { Alert } from "../../../../components/forms/Alert";
import { InputWidgetProps } from "../../types";
const IntWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <div>
      <label className="font-light">{port.label || port.key}</label>
      <Field name={port.key}>
        {({
          field, // { name, value, onChange, onBlur }// also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
          meta,
        }: {
          field: any;
          meta: any;
        }) => (
          <div className="w-full mt-2 mb-2 relative">
            <input
              type="number"
              className="w-full border h-10 border-grey-light rounded px-3 relative focus:border-blue focus:shadow"
              value={field.value}
              {...field}
            />
            {meta.touched && meta.error && (
              <Alert prepend="Error" message={meta.error} />
            )}
          </div>
        )}
      </Field>
      {port.description && (
        <div
          id={`${port.key}-help`}
          className="text-xs text-gray-600 mb-4 font-light"
        >
          {port.description}
        </div>
      )}
    </div>
  );
};

export { IntWidget };
