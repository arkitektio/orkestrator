import React from "react";
import { SliderInputField } from "../../../../components/forms/fields/slide_input";
import { SliderWidgetFragment } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";

const SliderWidget: React.FC<InputWidgetProps<SliderWidgetFragment>> = ({
  port,
  widget,
}) => {
  return (
    <SliderInputField
      name={port.key || "fake"}
      min={widget?.min || 0}
      max={widget?.max || 100}
      label={port.label || port.key}
      description={port.description || ""}
    />
  );
};

export { SliderWidget };
