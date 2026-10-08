import { InputWidgetProps } from "@/core/ports/engine/types";
import { ChoiceAssignWidgetFragment } from "@/rekuest/api/graphql";
import { ChoicePortField } from "../fallbacks/EnumWidget";

/**
 * Choices live on the port; the widget only adds its placeholder, which
 * `ChoicePortField` reads through `portPlaceholder`.
 */
export const ChoicesWidget = (props: InputWidgetProps<ChoiceAssignWidgetFragment>) => (
  <ChoicePortField {...props} />
);
