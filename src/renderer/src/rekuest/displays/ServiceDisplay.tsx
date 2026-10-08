import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Server } from "lucide-react";
import { useServiceQuery } from "../api/graphql";
import { describeService } from "../lib/service";

/** `@rekuest/service` elsewhere: its name and how much it declares. */
export const ServiceDisplay = (props: DisplayWidgetProps) => {
  const { data } = useServiceQuery({ variables: { id: props.id } });
  const service = data?.service;
  if (!service) return <DisplayLinePlaceholder {...props} icon={Server} />;

  return (
    <DisplayLine
      {...props}
      icon={Server}
      title={service.name}
      meta={[
        describeService({
          signals: service.signals.length,
          structures: service.structures.length,
        }),
      ]}
    />
  );
};
