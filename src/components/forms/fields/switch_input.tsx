import { Field, FieldProps } from "formik";
import { BsCheck, BsX } from "react-icons/bs";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";
import { CommonFieldProps } from "./types";

export type SwitchInputFieldProps = CommonFieldProps<boolean> & {
  trueLabel?: string;
  falseLabel?: string;
};

export const SwitchField = (props: SwitchInputFieldProps) => {
  return (
    <Field name={props.name} validate={props.validate} type="checkbox">
      {({
        form,
        field, // { name, value, onChange, onBlur }// also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
        meta,
      }: FieldProps) => (
        <>
          <div
            className={`${
              field.value
                ? "bg-primary-300 text-white"
                : "bg-gray-500 opacity-50 text-white"
            } border flex flex-row mt-2 mb-2 cursor-pointer p-1 shadow border-grey-800 rounded px-2 relative focus:shadow`}
            onClick={() => form.setFieldValue(props.name, !field.value)}
          >
            <div className="my-auto mr-2 cursor-pointer ">
              {field.value ? <BsCheck /> : <BsX />}
            </div>
            {props.trueLabel && props.falseLabel && (
              <label
                className="font-light my-auto cursor-pointer"
                htmlFor={props.name}
              >
                {field.value ? props.trueLabel : props.falseLabel}
              </label>
            )}
          </div>
          {meta && meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </>
      )}
    </Field>
  );
};

export const SwitchInputField = wrapped(SwitchField);
