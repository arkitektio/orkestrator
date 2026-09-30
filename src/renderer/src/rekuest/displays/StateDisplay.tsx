import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Database } from "lucide-react";
import { useGetStateQuery } from "../api/graphql";

/** `@rekuest/state` elsewhere: its definition's name, fields and last update. */
export const StateDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetStateQuery({ variables: { id: props.id } });
  const state = data?.state;
  if (!state) return <DisplayLinePlaceholder {...props} icon={Database} />;

  return (
    <DisplayLine
      {...props}
      icon={Database}
      title={state.definition.name}
      meta={[
        countOf(state.definition.ports.length, "field"),
        state.interface,
        `updated ${new Date(state.updatedAt).toLocaleString()}`,
      ]}
    />
  );
};
