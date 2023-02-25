import { Field } from "formik";
import React from "react";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";

interface Props {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const TextInputField = wrapped((props: Props) => {
  return (
    <Field name={props.name}>
      {({
        field, // { name, value, onChange, onBlur }// also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
        meta,
      }: {
        field: any;
        meta: any;
      }) => (
        <>
          <input
            type="text"
            placeholder={props.placeholder}
            className="w-full border h-10 border-grey-light rounded px-3 relative focus:border-blue focus:shadow disabled:text-gray-400"
            value={field.value}
            {...field}
            disabled={meta.submitting || props.disabled}
          />
          {meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </>
      )}
    </Field>
  );
});
