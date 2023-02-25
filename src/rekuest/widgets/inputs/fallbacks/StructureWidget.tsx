import { Field } from "formik";
import React from "react";
import { Alert } from "../../../../components/forms/Alert";
import { InputWidgetProps } from "../../types";
const StructureWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <Field name={port.key}>
      {({
        field, // { name, value, onChange, onBlur }// also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
        meta,
      }: {
        field: any;
        meta: any;
      }) => (
        <>
          <input
            className="w-full border h-10 border-grey-light rounded px-3 relative focus:border-blue focus:shadow"
            value={field.value}
            {...field}
          />
          {meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </>
      )}
    </Field>
  );
};

export { StructureWidget };
