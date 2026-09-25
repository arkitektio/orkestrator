import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { KraphRelation } from "@/core/linkers";
import { useGetRelationQuery } from "../api/graphql";

export const RelationDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetRelationQuery({ variables: { id: props.id } });

  if (!data?.relation) {
    return <div className="text-xs text-muted-foreground">Relation not found</div>;
  }

  const relation = data.relation;

  if (props.context === "command") {
    return (
      <KraphRelation.DetailLink object={{ id: props.id }}>
        <span className="font-medium text-sm">{relation.category?.label ?? relation.label}</span>
      </KraphRelation.DetailLink>
    );
  }

  return (
    <KraphRelation.DetailLink object={{ id: props.id }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3">
        <div className="font-semibold text-sm">{relation.category?.label ?? relation.label}</div>
      </div>
    </KraphRelation.DetailLink>
  );
};
