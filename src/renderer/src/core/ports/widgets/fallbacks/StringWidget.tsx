import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { AssignWidgetFragment, StringAssignWidgetFragment } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";

const asStringWidget = (
  widget: AssignWidgetFragment | null | undefined,
): StringAssignWidgetFragment | null =>
  widget?.__typename === "StringAssignWidget" ? widget : null;

/** STRING fallback; also the renderer for `StringAssignWidget` (placeholder, paragraph). */
export const StringWidget = (props: InputWidgetProps) => {
  const widget = asStringWidget(props.widget);
  const Field = widget?.asParagraph ? ParagraphField : StringField;

  return (
    <Field
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
      placeholder={widget?.placeholder || undefined}
    />
  );
};
