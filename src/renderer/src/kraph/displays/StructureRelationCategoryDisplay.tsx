import { DisplayWidgetProps } from "@/core/lib/display/registry";
import { KraphStructureRelationCategory } from "@/core/linkers";
import { TermBadge } from "../components/TermBadge";
import { useGetStructureRelationCategoryQuery } from "../api/graphql";

export const StructureRelationCategoryDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetStructureRelationCategoryQuery({ variables: { id: props.id } });

  if (!data?.structureRelationCategory) {
    return <div className="text-xs text-muted-foreground">Not found</div>;
  }

  const cat = data.structureRelationCategory;

  if (props.context === "command") {
    return (
      <KraphStructureRelationCategory.DetailLink object={{ id: props.id }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{cat.label}</span>
          {cat.description && (
            <span className="text-xs text-muted-foreground truncate">{cat.description}</span>
          )}
        </div>
      </KraphStructureRelationCategory.DetailLink>
    );
  }

  return (
    <KraphStructureRelationCategory.DetailLink object={{ id: props.id }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        <div className="font-semibold text-sm">{cat.label}</div>
        <TermBadge term={cat.term} />
        {cat.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">{cat.description}</div>
        )}
      </div>
    </KraphStructureRelationCategory.DetailLink>
  );
};
