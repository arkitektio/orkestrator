import React from "react";
import { IntInputField } from "../../../../components/forms/fields/int_input";
import { InputWidgetProps } from "../../types";
const IntWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <IntInputField
      name={port.key}
      label={port.label || port.key}
      description={port.description || ""}
    />
  );
};

export { IntWidget };
