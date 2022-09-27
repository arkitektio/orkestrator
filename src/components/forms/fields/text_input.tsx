import { Field } from "formik";
import React from "react";
import { Alert } from "../Alert";

interface Props {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
}

export const TextInputField: React.FC<Props> = (props) => {
  return (
    <div>
      <label className="font-light" htmlFor={props.name}>
        {props.label}
      </label>
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
              type="text"
              placeholder={props.placeholder}
              className="w-full text-black border h-10 border-grey-light rounded px-3 relative focus:border-blue focus:shadow"
              value={field.value}
              {...field}
            />
            {meta.touched && meta.error && (
              <Alert prepend="Error" message={meta.error} />
            )}
          </div>
        )}
      </Field>
      {props.description && (
        <div
          id={`${props.name}-help`}
          className="text-xs text-gray-600 mb-4 font-light"
        >
          {props.description}
        </div>
      )}
    </div>
  );
};
