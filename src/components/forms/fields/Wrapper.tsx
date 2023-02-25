import { FunctionComponent } from "react";

export type Extras = { labelClassName?: string; descriptionClassName?: string };

export const wrapped = <
  T extends { label?: string; name: string; description?: string }
>(
  component: (props: T) => React.ReactNode
): FunctionComponent<T & Extras> => {
  return ({ labelClassName, descriptionClassName, ...props }: T & Extras) => {
    return (
      <div>
        <div>
          <label
            className={labelClassName || "font-light"}
            htmlFor={props.name}
          >
            {props.label || props.name}
          </label>
          <div className="w-full mt-2 mb-2 relative">
            {component(props as unknown as T)}
          </div>
          {props.description && (
            <div
              id={`${props.name}-help`}
              className={
                descriptionClassName || "text-xs text-gray-600 mb-4 font-light"
              }
            >
              {props.description}
            </div>
          )}
        </div>
      </div>
    );
  };
};
