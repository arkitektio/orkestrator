import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Package } from "lucide-react";
import { useGetStructurePackageQuery } from "../api/graphql";

/** `@rekuest/structurepackage` elsewhere (keyed by its key): what it defines. */
export const StructurePackageDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetStructurePackageQuery({ variables: { id: props.id } });
  const pkg = data?.structurePackage;
  if (!pkg) return <DisplayLinePlaceholder {...props} icon={Package} />;

  return (
    <DisplayLine
      {...props}
      icon={Package}
      title={pkg.key}
      meta={[countOf(pkg.structures.length, "structure"), countOf(pkg.interfaces.length, "interface")]}
    />
  );
};
