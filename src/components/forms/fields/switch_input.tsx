import { Field, FieldProps } from "formik";
import React from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsCheck,
  BsPlusCircle,
  BsTrash,
  BsX,
} from "react-icons/bs";
import { Alert } from "../Alert";
interface Props {
  name: string;
  label: string;
  falseLabel?: string;
  description?: string;
  falseDescription?: string;
  placeholder?: string;
}

export const SwitchInputField: React.FC<Props> = (props) => {
  return (
    <div>
      <Field name={props.name} type="checkbox">
        {({
          form,
          field, // { name, value, onChange, onBlur }// also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
          meta,
        }: FieldProps) => (
          <>
            <div>
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
                <div>
                  <label
                    className="font-light my-auto cursor-pointer"
                    htmlFor={props.name}
                  >
                    {field.value
                      ? props.label
                      : props.falseLabel || props.label}
                  </label>
                </div>
              </div>
            </div>
            {meta.touched && meta.error && (
              <Alert prepend="Error" message={meta.error} />
            )}
            {(props.description || props.falseDescription) && (
              <div
                id={`${props.name}-help`}
                className="text-xs text-gray-600 mb-4 font-light"
              >
                {field.value
                  ? props.description
                  : props.falseDescription || props.description}
              </div>
            )}
          </>
        )}
      </Field>
    </div>
  );
};
