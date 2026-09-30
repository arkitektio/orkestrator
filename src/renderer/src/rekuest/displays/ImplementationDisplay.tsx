import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Cpu } from "lucide-react";
import { useHoverImplementationQuery } from "../api/graphql";

/** `@rekuest/implementation` elsewhere: the action it implements, on which agent. */
export const ImplementationDisplay = (props: DisplayWidgetProps) => {
  const { data } = useHoverImplementationQuery({ variables: { id: props.id } });
  const implementation = data?.implementation;
  if (!implementation) return <DisplayLinePlaceholder {...props} icon={Cpu} />;

  return (
    <DisplayLine
      {...props}
      icon={Cpu}
      title={implementation.action.name}
      meta={[
        implementation.agent.name,
        implementation.agent.connected ? "online" : "offline",
        implementation.interface,
      ]}
    />
  );
};
