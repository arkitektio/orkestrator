import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Link2 } from "lucide-react";
import { useDependencyQuery } from "../api/graphql";

/** `@rekuest/dependency` elsewhere: its key and what it accepts. */
export const DependencyDisplay = (props: DisplayWidgetProps) => {
  const { data } = useDependencyQuery({ variables: { id: props.id } });
  const dependency = data?.dependency;
  if (!dependency) return <DisplayLinePlaceholder {...props} icon={Link2} />;

  return (
    <DisplayLine
      {...props}
      icon={Link2}
      title={dependency.key}
      meta={[dependency.appFilter, dependency.versionFilter, dependency.autoResolvable && "auto-resolves"]}
    />
  );
};
