import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { PenTool } from "lucide-react";
import { useGetAnnotationQuery } from "../api/graphql";

/**
 * `@mikro/annotation` where another surface holds one (a task's result, the
 * Knowledge sidebar): its name, kind and the collection and scene it lives in.
 */
export const AnnotationDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetAnnotationQuery({ variables: { id: props.id } });
  const annotation = data?.annotation;
  if (!annotation) return <DisplayLinePlaceholder {...props} icon={PenTool} />;

  const kind = annotation.kind.toLowerCase().replace("_", " ");
  return (
    <DisplayLine
      {...props}
      icon={PenTool}
      title={annotation.name || `${kind} annotation`}
      meta={[kind, annotation.collection.name, annotation.collection.scene?.name]}
    />
  );
};
