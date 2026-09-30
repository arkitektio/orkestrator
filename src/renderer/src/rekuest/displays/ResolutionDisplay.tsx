import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { GitMerge } from "lucide-react";
import { useGetResolutionQuery } from "../api/graphql";

/** `@rekuest/resolution` elsewhere: its name and how many dependencies it binds. */
export const ResolutionDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetResolutionQuery({ variables: { id: props.id } });
  const resolution = data?.resolution;
  if (!resolution) return <DisplayLinePlaceholder {...props} icon={GitMerge} />;

  return (
    <DisplayLine
      {...props}
      icon={GitMerge}
      title={resolution.name}
      meta={[countOf(resolution.resolvedDependencies.length, "dependency", "dependencies")]}
    />
  );
};
