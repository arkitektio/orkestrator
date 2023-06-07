import React from "react";
import { SwitchInputField } from "../../../../components/forms/fields/switch_input";
import { InputWidgetProps } from "../../types";

const BoolWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <SwitchInputField
      name={port.key}
      validate={(value) => {
        if (value == undefined) {
          if (port.nullable) return "This port cant be empty"
          return undefined;
        }
        if (typeof value != "boolean") return "Please enter a boolean";
        return undefined;
      }
      }
      label={port.label || port.key}
      description={port.description || ""}
    />
  );
};

export { BoolWidget };
