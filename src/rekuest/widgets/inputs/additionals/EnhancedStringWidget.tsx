import React from "react";
import { ParagraphInputField } from "../../../../components/forms/fields/paragraph_input";
import { TextInputField } from "../../../../components/forms/fields/text_input";
import { StringWidgetFragment } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";

export const EnhancedStringWidget: React.FC<
  InputWidgetProps<StringWidgetFragment>
> = ({ port, widget, options }) => {
  if (!port.key) return <> Failure Key not specified </>;

  if (widget?.asParagraph) {
    return (
      <ParagraphInputField
        name={port.key}
        validate={(value) =>
          value
            ? undefined
            : port.nullable
            ? undefined
            : "Please select a valid test"
        }
        label={port.label || port.key}
        description={port.description || ""}
        placeholder={widget.placeholder || ""}
      />
    );
  }
  return (
    <TextInputField
      name={port.key}
      validate={(value) =>
        value
          ? undefined
          : port.nullable
          ? undefined
          : "Please select a valid test"
      }
      label={port.label || port.key}
      description={port.description || ""}
      placeholder={widget?.placeholder || ""}
    />
  );
};
