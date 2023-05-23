import React from "react";
import { FloatInputField } from "../../../../components/forms/fields/float_input";
import { InputWidgetProps } from "../../types";
const FloatWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <FloatInputField
      name={port.key}
      label={port.label || port.key}
      description={port.description || ""}
      validate={(value) => {
        console.log("Validating float", value);
        return value != undefined
          ? undefined
          : port.nullable
          ? undefined
          : "Please select a float choice";
      }}
    />
  );
};

export { FloatWidget };
