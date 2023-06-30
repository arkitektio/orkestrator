import { Field, FieldProps } from "formik";
import { ReactNode } from "react";
import { Alert } from "../Alert";
import { Option } from "./SearchInput";
import { wrapped } from "./Wrapper";
import { CommonFieldProps } from "./types";

export type OptionType<T> = {
  [key: string]: T;
};

interface CarouselInputFieldProps<T extends Option> extends FieldProps {
  name: string;
  label: string;
  activeClass?: string;
  className?: string;
  options: T[];
  optionBuilder: (option: T, index: number, options: T[]) => ReactNode;
  description?: string;
  placeholder?: string;
}

export function CarouselInputFieldBuilder<T extends Option>({
  options,
  field,
  optionBuilder,
  form,
  meta,
}: CarouselInputFieldProps<T> & FieldProps): ReactNode {
  return (
    <div>
      <div className="flex flex-row   border border-gray-200 rounded-lg text-lg mt-2 overflow-hidden">
        {options.map((option, index) => (
          <button
            type="button"
            className={`flex-1 px-1 py-1 cursor-pointer truncate overflow-hidden text-center ${
              field.value == option.value
                ? "bg-primary-300 text-white "
                : "text-gray-700 hover:bg-primary-200 hover:text-white transition-colors"
            }`}
            title={option.description}
            onClick={() => form.setFieldValue(field.name, option.value)}
          >
            {optionBuilder(option, index, options)}
          </button>
        ))}
      </div>
      {meta && meta.touched && meta.error && (
        <Alert prepend="Error" message={meta.error} />
      )}
    </div>
  );
}

export type Props<T extends Option> = CommonFieldProps<T> & {
  options: T[];
  optionBuilder: (option: T, index: number, options: T[]) => ReactNode;
};

export const CarouselField = (props: Props<Option>) => {
  return (
    <Field
      id={props.name}
      name={props.name}
      component={CarouselInputFieldBuilder}
      className="form-control"
      options={props.options}
      optionBuilder={props.optionBuilder}
      validate={props.validate}
    />
  );
};

export const CarouselInputField = wrapped(CarouselField);
