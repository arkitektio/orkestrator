import { Field } from "formik";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";
import { CommonFieldProps } from "./types";

export type SliderInputField = CommonFieldProps<number> & {
  placeholder?: string;
  max: number;
  min: number;
};

export const SliderField = ({ min, max, ...props }: SliderInputField) => {
  return (
    <Field {...props}>
      {({
        field, // { name, value, onChange, onBlur }// also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
        meta,
      }: {
        field: any;
        meta: any;
      }) => (
        <>
          <div className="flex w-full">
            <input
              type="range"
              className="flex-grow mr-1"
              min={min}
              max={max}
              {...field}
            />
            {field.value}
          </div>
          {meta && meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </>
      )}
    </Field>
  );
};

export const SliderInputField = wrapped(SliderField);
