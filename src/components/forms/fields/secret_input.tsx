import { Field } from "formik";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";
import { CommonFieldProps } from "./types";

interface Props {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
}

export type TextInputFieldProps = CommonFieldProps<string> & {
  placeholder?: string;
};

export const SecretField = (props: TextInputFieldProps) => {
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
            type="password"
            placeholder={props.placeholder}
            className="w-full border h-10 border-grey-light rounded px-3 relative focus:border-blue focus:shadow disabled:text-gray-400 text-black"
            value={field.value}
            {...field}
            disabled={meta.submitting}
          />
          {meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </>
      )}
    </Field>
  );
};

export const SecretInputField = wrapped(SecretField);
