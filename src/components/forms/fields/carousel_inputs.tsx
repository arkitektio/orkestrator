import { Field, FieldProps } from "formik";
import { ReactNode } from "react";
import { Alert } from "../Alert";

export type OptionType<T> = {
  [key: string]: T;
};

interface CarouselInputFieldProps<V extends string = string, T = string>
  extends FieldProps {
  name: string;
  label: string;
  activeClass?: string;
  className?: string;
  options: Record<V, T>;
  optionBuilder: (option: T, index: number, options: Record<V, T>) => ReactNode;
  description?: string;
  placeholder?: string;
}

export function CarouselInputFieldBuilder<
  V extends string = string,
  T = string
>({
  options,
  field,
  optionBuilder,
  form,
  meta,
}: CarouselInputFieldProps<V, T> & FieldProps): ReactNode {
  return (
    <div>
      <div className="flex w-full border border-gray-200 rounded-lg text-lg mt-2">
        {Object.entries(options).map(([value, option], index) => (
          <div
            className={
              "flex-1 " + field.value == value
                ? "bg-blue-500 text-white px-4 py-2 rounded"
                : "text-gray-700 rounded hover:bg-blue-500 hover:text-white px-4 py-2"
            }
            onClick={() => form.setFieldValue(field.name, value)}
          >
            {optionBuilder(option as T, index, options)}
          </div>
        ))}
      </div>
      {meta && meta.touched && meta.error && (
        <Alert prepend="Error" message={meta.error} />
      )}
    </div>
  );
}

interface Props<V extends string = string, T = string> {
  name: string;
  label: string;

  description?: string;
  options: Record<V, T>;
  optionBuilder: (option: T, index: number, options: Record<V, T>) => ReactNode;
}

export function CarouselInputField<V extends string = string, T = string>(
  props: Props<V, T>
): any {
  return (
    <div>
      <div>
        <label className="font-light" htmlFor={props.name}>
          {props.label}
        </label>
        <div className="w-full mt-2 mb-2 relative">
          <Field
            id={props.name}
            name={props.name}
            component={CarouselInputFieldBuilder}
            className="form-control"
            options={props.options}
            optionBuilder={props.optionBuilder}
          />
        </div>
        {props.description && (
          <div
            id={`${props.name}-help`}
            className="text-xs text-gray-600 mb-4 font-light"
          >
            {props.description}
          </div>
        )}
      </div>
    </div>
  );
}
