import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Wrench } from "lucide-react";
import { useToolboxQuery } from "../api/graphql";

/** `@rekuest/toolbox` elsewhere: its name and description. */
export const ToolboxDisplay = (props: DisplayWidgetProps) => {
  const { data } = useToolboxQuery({ variables: { id: props.id } });
  const toolbox = data?.toolbox;
  if (!toolbox) return <DisplayLinePlaceholder {...props} icon={Wrench} />;

  return <DisplayLine {...props} icon={Wrench} title={toolbox.name} meta={[toolbox.description]} />;
};
