import { DisplayWidgetProps } from "@/core/lib/display/registry";
import { KraphLink } from "@/core/linkers";
import { useGetLinkQuery } from "../api/graphql";

/**
 * A claim relating two things, named by its word and its kind.
 *
 * Eight kinds, of which only RELATION and the two PARTICIPATES_AS_* are ever
 * drawn as graph edges — so a link with no drawing is ordinary, and the kind is
 * the thing worth showing.
 */
export const LinkDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetLinkQuery({ variables: { id: props.id } });

  if (!data?.link) {
    return <div className="text-xs text-muted-foreground">Link not found</div>;
  }

  const link = data.link;
  const word = link.term?.label ?? link.term?.key ?? link.kind;

  if (props.context === "command") {
    return (
      <KraphLink.DetailLink object={link}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{word}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {link.kind}
          </span>
        </div>
      </KraphLink.DetailLink>
    );
  }

  return (
    <KraphLink.DetailLink object={link}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        <div className="font-semibold text-sm">{word}</div>
        <div className="text-xs text-muted-foreground">{link.kind}</div>
      </div>
    </KraphLink.DetailLink>
  );
};
