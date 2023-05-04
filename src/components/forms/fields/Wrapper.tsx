import { FunctionComponent } from "react";

export type Extras = {
  label: string;
  description?: string;
  labelClassName?: string;
  descriptionClassName?: string;
};

export const wrapped = <T extends { name: string }>(
  component: (props: T) => React.ReactNode
): FunctionComponent<T & Extras> => {
  return ({
    labelClassName,
    descriptionClassName,
    label,
    description,
    ...props
  }: T & Extras) => {
    return (
      <div>
        <div>
          <label
            className={labelClassName || "font-light"}
            htmlFor={props.name}
          >
            {label || props.name}
          </label>
          <div className="w-full mt-2 mb-2 relative">
            {component(props as unknown as T)}
          </div>
          {description && (
            <div
              id={`${props.name}-help`}
              className={
                descriptionClassName || "text-xs text-back-400 mb-4 font-light"
              }
            >
              {description}
            </div>
          )}
        </div>
      </div>
    );
  };
};
