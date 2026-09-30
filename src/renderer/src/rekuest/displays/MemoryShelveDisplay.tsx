import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Archive } from "lucide-react";
import { useMemoryShelveQuery } from "../api/graphql";

/** `@rekuest/memoryshelve` elsewhere: its agent and how much it holds. */
export const MemoryShelveDisplay = (props: DisplayWidgetProps) => {
  const { data } = useMemoryShelveQuery({ variables: { id: props.id } });
  const shelve = data?.memoryShelve;
  if (!shelve) return <DisplayLinePlaceholder {...props} icon={Archive} />;

  return (
    <DisplayLine
      {...props}
      icon={Archive}
      title={shelve.name}
      meta={[countOf(shelve.drawers.length, "drawer"), shelve.agent.name]}
    />
  );
};
