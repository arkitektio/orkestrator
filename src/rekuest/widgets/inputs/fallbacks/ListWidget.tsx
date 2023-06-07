import { Field } from "formik";
import React from "react";
import { Alert } from "../../../../components/forms/Alert";
import { InputWidgetProps } from "../../types";
import { ListSearchWidget } from "../additionals/SearchWidget";

const ListWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  if (!port.key) return <> Failure Key not specified </>;

  if (port.child?.kind === "STRUCTURE") {
    if (port.child?.assignWidget?.__typename === "SearchWidget") {
      return <ListSearchWidget port={port} widget={port.child.assignWidget} />;
    }
  }

  return (
    <Field
      name={port.key}
      validate={(value: any) => {
        if (value == undefined) {
          if (port.nullable) return "This port cant be empty"
          return undefined;
        }
        if (!Array.isArray(value)) return "Please enter a list";
        return undefined;

      }}
    >
      {({
        field, // { name, value, onChange, onBlur }// also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
        meta,
      }: {
        field: any;
        meta: any;
      }) => (
        <>
          <input
            type="text"
            className="w-full border h-10 border-grey-light rounded px-3 relative focus:border-blue focus:shadow"
            value={field.value}
            {...field}
          />
          {meta.touched && meta.error && (
            <Alert prepend="Error" message={meta.error} />
          )}
        </>
      )}
    </Field>
  );
};

export { ListWidget };
