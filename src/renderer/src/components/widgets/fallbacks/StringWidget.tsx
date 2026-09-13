import { ParagraphField } from "@/components/fields/ParagraphField";
import { StringField } from "@/components/fields/StringField";
import { AssignWidgetFragment, StringAssignWidgetFragment } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";

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
