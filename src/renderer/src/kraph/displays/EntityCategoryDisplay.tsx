import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { useGetEntityCategoryQuery } from "../api/graphql";
import { TermBadge } from "../components/TermBadge";

export const EntityCategoryDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetEntityCategoryQuery({
    variables: { id: props.id },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{data?.entityCategory.label}</h1>
      <TermBadge term={data?.entityCategory.term} className="self-start" />
      <p className="text-muted-foreground">
        {data?.entityCategory.description || "No description available."}
      </p>
      {/* Additional components or content can be added here */}
    </div>
  );
};
