import React from "react";
import { DateInputField } from "../../../../components/forms/fields/date_input";
import { InputWidgetProps } from "../../types";

const DateWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <DateInputField
      name={port.key}
      label={port.label || port.key}
      description={port.description || ""}
    />
  );
};

export { DateWidget };
