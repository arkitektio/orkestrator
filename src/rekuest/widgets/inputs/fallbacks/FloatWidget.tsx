import React from "react";
import { FloatInputField } from "../../../../components/forms/fields/float_input";
import { InputWidgetProps } from "../../types";
const FloatWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <FloatInputField
      name={port.key}
      label={port.label || port.key}
      description={port.description || ""}
      validate={(value) =>
        value === undefined
          ? undefined
          : port.nullable
          ? undefined
          : "Please select a integer choice"
      }
    />
  );
};

export { FloatWidget };
