import { DisplayWidgetProps } from "@/lib/display/registry";
import { KraphStructure } from "@/linkers";
import { useGetStructureQuery } from "../api/graphql";

export const StructureDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetStructureQuery({ variables: { id: props.id } });

  if (!data?.structure) {
    return <div className="text-xs text-muted-foreground">Structure not found</div>;
  }

  const structure = data.structure;

  if (props.context === "command") {
    return (
      <KraphStructure.DetailLink object={structure}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{structure.object}</span>
          <span className="text-xs text-muted-foreground shrink-0">{structure.kind?.label || structure.kind?.identifier}</span>
        </div>
      </KraphStructure.DetailLink>
    );
  }

  return (
    <KraphStructure.DetailLink object={structure}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        <div className="font-semibold text-sm">{structure.object}</div>
        <div className="text-xs text-muted-foreground">{structure.kind?.label || structure.kind?.identifier}</div>
        <div className="text-xs text-muted-foreground font-mono">{structure.identifier}</div>
      </div>
    </KraphStructure.DetailLink>
  );
};
