import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { FileJson } from "lucide-react";
import { useWiregramQuery } from "../api/graphql";
import { describeWiregram } from "../lib/wiregram";

/** `@rekuest/wiregram` elsewhere: its name, its key and how many rules it owns. */
export const WiregramDisplay = (props: DisplayWidgetProps) => {
  const { data } = useWiregramQuery({ variables: { id: props.id } });
  const wiregram = data?.wiregram;
  if (!wiregram) return <DisplayLinePlaceholder {...props} icon={FileJson} />;

  return (
    <DisplayLine
      {...props}
      icon={FileJson}
      title={wiregram.name}
      meta={[
        wiregram.key,
        describeWiregram({
          schedules: wiregram.schedules.length,
          triggers: wiregram.triggers.length,
        }),
      ]}
    />
  );
};
