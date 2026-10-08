import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Radio } from "lucide-react";
import { useSignalQuery } from "../api/graphql";
import { KIND_LABELS } from "../lib/triggerConditions";

/** `@rekuest/signal` elsewhere: the object, what happened to it and who said so. */
export const SignalDisplay = (props: DisplayWidgetProps) => {
  const { data } = useSignalQuery({ variables: { id: props.id } });
  const signal = data?.signal;
  if (!signal) return <DisplayLinePlaceholder {...props} icon={Radio} />;

  return (
    <DisplayLine
      {...props}
      icon={Radio}
      title={`${signal.identifier} #${signal.object}`}
      meta={[KIND_LABELS[signal.kind], signal.serviceName]}
    />
  );
};
