import { Field } from "formik";
import React from "react";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";

interface Props {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
}

export const NumberInputField = wrapped((props: Props) => {
  return (
    <Field name={props.name}>
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
            placeholder={props.placeholder}
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
  );
});
