import { Field } from "formik";
import React from "react";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";

interface Props {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  rows?: number;
}

export const ParagraphInputField = wrapped((props: Props) => {
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
          <textarea
            className="w-full border border-grey-light rounded px-3 py-3 relative focus:shadow text-black"
            id={props.name}
            name={props.name}
            placeholder={props.placeholder}
            rows={props.rows || 3}
            {...field}
          ></textarea>
          {meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </div>
      )}
    </Field>
  );
});
