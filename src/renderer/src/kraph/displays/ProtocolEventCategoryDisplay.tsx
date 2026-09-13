import { DisplayWidgetProps } from "@/lib/display/registry";
import { KraphProtocolEventCategory } from "@/linkers";
import { TermBadge } from "../components/TermBadge";
import { useGetProtocolEventCategoryQuery } from "../api/graphql";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

export const ProtocolEventCategoryDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetProtocolEventCategoryQuery({ variables: { id: props.object } });

  if (!data?.protocolEventCategory) {
    return <div className="text-xs text-muted-foreground">Not found</div>;
  }

  const cat = data.protocolEventCategory;

  if (props.context === "command") {
    return (
      <KraphProtocolEventCategory.DetailLink object={{ id: props.object }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{cat.label}</span>
          {cat.description && (
            <span className="text-xs text-muted-foreground truncate">{cat.description}</span>
          )}
        </div>
      </KraphProtocolEventCategory.DetailLink>
    );
  }

  return (
    <KraphProtocolEventCategory.DetailLink object={{ id: props.object }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        {cat.image && (
          <WithKraphMediaUrl media={cat.image}>
            {(url) => (
              <img src={url} alt={cat.label} loading="lazy" height={80} className="w-full h-20 object-cover rounded" />
            )}
          </WithKraphMediaUrl>
        )}
        <div className="font-semibold text-sm">{cat.label}</div>
        <TermBadge term={cat.term} />
        {cat.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">{cat.description}</div>
        )}
        {cat.inputs?.length > 0 && (
          <div className="text-xs text-muted-foreground">{cat.inputs.length} input roles</div>
        )}
      </div>
    </KraphProtocolEventCategory.DetailLink>
  );
};
