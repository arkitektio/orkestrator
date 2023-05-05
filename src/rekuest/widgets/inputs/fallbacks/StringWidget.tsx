import React from "react";
import { TextInputField } from "../../../../components/forms/fields/text_input";
import { InputWidgetProps } from "../../types";

const StringWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  if (!port.key) return <> Failure Key not specified </>;

  return (
    <TextInputField
      name={port.key}
      validate={(value) =>
        value
          ? undefined
          : port.nullable
          ? undefined
          : "Please select a valid choice"
      }
      label={port.label || port.key}
      description={port.description || ""}
    />
  );
};

export { StringWidget };
