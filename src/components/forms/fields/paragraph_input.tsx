import { Field } from "formik";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";
import { CommonFieldProps } from "./types";

export type ParagraphInputFieldProps = CommonFieldProps<string> & {
  placeholder?: string;
  rows?: number;
};

export const ParagraphField = ({
  placeholder,
  rows,
  ...props
}: ParagraphInputFieldProps) => {
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
          <textarea
            className="w-full border border-grey-light rounded px-3 py-3 relative focus:shadow text-black"
            id={props.name}
            name={props.name}
            placeholder={placeholder}
            rows={rows || 3}
            {...field}
          ></textarea>
          {meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </div>
      )}
    </Field>
  );
};

export const ParagraphInputField = wrapped(ParagraphField);
