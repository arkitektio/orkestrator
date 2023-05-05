import React from "react";
import { SwitchInputField } from "../../../../components/forms/fields/switch_input";
import { InputWidgetProps } from "../../types";

const BoolWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <SwitchInputField
      name={port.key}
      validate={(value) =>
        value != undefined
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

export { BoolWidget };
