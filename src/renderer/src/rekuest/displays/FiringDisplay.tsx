import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { RotateCcw } from "lucide-react";
import { useFiringQuery } from "../api/graphql";
import { describeFiring } from "../lib/firing";

/** `@rekuest/firing` elsewhere: the trigger, what became of it and on which object. */
export const FiringDisplay = (props: DisplayWidgetProps) => {
  const { data } = useFiringQuery({ variables: { id: props.id } });
  const firing = data?.firing;
  if (!firing) return <DisplayLinePlaceholder {...props} icon={RotateCcw} />;

  return (
    <DisplayLine
      {...props}
      icon={RotateCcw}
      title={firing.trigger.name}
      meta={[
        describeFiring(firing).label,
        `${firing.signal.identifier} #${firing.signal.object}`,
        firing.reason,
      ]}
    />
  );
};
