import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { KraphNaturalEventCategory } from "@/core/linkers";
import { TermBadge } from "../components/TermBadge";
import { useGetNaturalEventCategoryQuery } from "../api/graphql";

export const NaturalEventCategoryDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetNaturalEventCategoryQuery({ variables: { id: props.id } });

  if (!data?.naturalEventCategory) {
    return <div className="text-xs text-muted-foreground">Not found</div>;
  }

  const cat = data.naturalEventCategory;

  if (props.context === "command") {
    return (
      <KraphNaturalEventCategory.DetailLink object={{ id: props.id }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{cat.label}</span>
          {cat.description && (
            <span className="text-xs text-muted-foreground truncate">{cat.description}</span>
          )}
        </div>
      </KraphNaturalEventCategory.DetailLink>
    );
  }

  return (
    <KraphNaturalEventCategory.DetailLink object={{ id: props.id }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        <div className="font-semibold text-sm">{cat.label}</div>
        <TermBadge term={cat.term} />
        {cat.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">{cat.description}</div>
        )}
        {cat.inputs?.length > 0 && (
          <div className="text-xs text-muted-foreground">{cat.inputs.length} input roles</div>
        )}
      </div>
    </KraphNaturalEventCategory.DetailLink>
  );
};
