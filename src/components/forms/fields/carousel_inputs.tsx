import { Field, FieldProps } from "formik";
import { ReactNode } from "react";
import { Alert } from "../Alert";
import { Option } from "./SearchInput";
import { wrapped } from "./Wrapper";

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
      <div className="flex flex-row flex-wrap gap-2 border border-gray-200 rounded-lg text-lg mt-2">
        {options.map((option, index) => (
          <div
            className={`flex-1 px-1 py-1 ${
              field.value == option.value
                ? "bg-blue-300 text-white  rounded"
                : "text-gray-700 rounded hover:bg-blue-500 hover:text-white "
            }`}
            onClick={() => form.setFieldValue(field.name, option.value)}
          >
            {optionBuilder(option, index, options)}
          </div>
        ))}
      </div>
      {meta && meta.touched && meta.error && (
        <Alert prepend="Error" message={meta.error} />
      )}
    </div>
  );
}

interface Props<T extends Option> {
  name: string;
  label: string;

  description?: string;
  options: T[];
  optionBuilder: (option: T, index: number, options: T[]) => ReactNode;
}

export const CarouselInputField = wrapped((props: Props<Option>) => {
  return (
    <Field
      id={props.name}
      name={props.name}
      component={CarouselInputFieldBuilder}
      className="form-control"
      options={props.options}
      optionBuilder={props.optionBuilder}
    />
  );
});
