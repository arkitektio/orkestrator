import { Field } from "formik";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";
import { CommonFieldProps } from "./types";

export type NumberInputFieldProps = CommonFieldProps<number> & {
  placeholder?: string;
};

export const NumberField = (props: NumberInputFieldProps) => {
  return (
    <Field {...props}>
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
            className="w-full border h-10 border-grey-light rounded px-3 relative focus:border-blue focus:shadow text-black"
            value={field.value}
            onChange={(e) => {
              if (e.target.value === "") {
                field.onChange(props.name)(null);
              } else {
                field.onChange(props.name)(parseInt(e.target.value));
              }
            }}
            {...field}
          />
          {meta && meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </div>
      )}
    </Field>
  );
};

export const NumberInputField = wrapped(NumberField);
