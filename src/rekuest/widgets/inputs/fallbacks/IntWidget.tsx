import React from "react";
import { IntInputField } from "../../../../components/forms/fields/int_input";
import { InputWidgetProps } from "../../types";
const IntWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <IntInputField
      name={port.key}
      validate={(value) =>
        value === undefined
          ? undefined
          : port.nullable
          ? undefined
          : "Please select a integer choice"
      }
      label={port.label || port.key}
      description={port.description || ""}
    />
  );
};

export { IntWidget };
