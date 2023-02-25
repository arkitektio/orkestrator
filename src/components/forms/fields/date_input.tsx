import { Field, FieldProps } from "formik";
import React from "react";
import DatePicker from "react-datepicker";
import { Alert } from "../Alert";

import "react-datepicker/dist/react-datepicker.css";
import { VscClose } from "react-icons/vsc";
import { wrapped } from "./Wrapper";
interface Props {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
}

export const DateInputField = wrapped((props: Props) => {
  return (
    <Field name={props.name}>
      {({ field, form, meta }: FieldProps) => (
        <div className="w-full mt-2 mb-2 relative z-100">
          <div className="relative flex flex-row">
            <DatePicker
              className="w-full text-center outline-none"
              dateFormat="MMMM d, yyyy h:mm aa"
              showTimeSelect
              selected={field.value && new Date(field.value)}
              onChange={(date: Date) => form.setFieldValue(field.name, date)}
            />
            {field.value && (
              <button
                className="absolute right-1 text-gray-500 mt-1"
                onClick={() => form.setFieldValue(field.name, null)}
              >
                <VscClose />
              </button>
            )}
          </div>
          {meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </div>
      )}
    </Field>
  );
});
