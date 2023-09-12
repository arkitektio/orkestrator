import { Field, FieldProps } from "formik";
import DatePicker from "react-datepicker";
import { Alert } from "../Alert";

import "react-datepicker/dist/react-datepicker.css";
import { VscClose } from "react-icons/vsc";
import { wrapped } from "./Wrapper";
import { CommonFieldProps } from "./types";

export type DateInputFieldProps = CommonFieldProps<Date> & {};

export const DateField = (props: DateInputFieldProps) => {
  return (
    <Field {...props}>
      {({ field, form, meta }: FieldProps) => (
        <div className="w-full mt-2 mb-2 relative z-100">
          <div className="relative flex flex-row">
            <DatePicker
              className="w-full text-center outline-none text-black bg-white rounded-md shadow-lg"
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
};

export const DateInputField = wrapped(DateField);
