import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Shapes } from "lucide-react";
import { useGetStructureQuery } from "../api/graphql";

/**
 * `@rekuest/structure` elsewhere (keyed by its identifier): the package it
 * belongs to and how many actions take or return it.
 */
export const StructureDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetStructureQuery({ variables: { id: props.id } });
  const structure = data?.structure;
  if (!structure) return <DisplayLinePlaceholder {...props} icon={Shapes} />;

  return (
    <DisplayLine
      {...props}
      icon={Shapes}
      title={structure.key}
      meta={[
        structure.package.key,
        countOf(structure.inputUsages.length, "input"),
        countOf(structure.outputUsages.length, "output"),
      ]}
    />
  );
};
