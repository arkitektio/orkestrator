import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { MikroCollaboration } from "@/core/linkers";
import { reportErrorAs } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { SmartLink } from "@/core/smart/builder";
import { smartRegistry } from "@/core/smart/registry";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { PageAction } from "@/core/ui/page-action";
import { Share2, X } from "lucide-react";
import { useState } from "react";
import {
  CollaborationItemFragment,
  useCollaborationItemNamesQuery,
  useGetCollaborationItemsQuery,
  useGetCollaborationQuery,
  useRemoveFromCollaborationMutation,
} from "../api/graphql";
import { isNameable, itemName, itemNamesFrom, itemNameVariables } from "../components/collaboration/itemNames";

/** Items a page of one section brings, and "Show more" adds. */
const PAGE = 50;

const Item = ({
  collaboration,
  item,
  name,
  removable,
}: {
  collaboration: string;
  item: CollaborationItemFragment;
  /** From the page's one name lookup; a kind it does not cover keeps its display widget. */
  name: string | undefined;
  removable: boolean;
}) => {
  // The pages re-read what is left: the counts come back on the mutation's answer.
  const [remove, { loading }] = useRemoveFromCollaborationMutation({
    refetchQueries: ["GetCollaborations", "GetCollaborationItems"],
  });
  if (!item.identifier) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border px-2 py-1">
      <div className="min-w-0 flex-1">
        {isNameable(item.identifier) ? (
          <SmartLink identifier={item.identifier} object={item.objectId} className="flex min-w-0 items-baseline gap-2 text-sm hover:underline">
            <span className="truncate">{name ?? `${item.objectId}`}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{smartRegistry.getDisplayName(item.identifier)}</span>
          </SmartLink>
        ) : (
          <StructureDisplay
            identifier={item.identifier}
            id={item.objectId}
            variant="inline"
            link
            fallback={<span className="text-sm">{item.identifier} {item.objectId}</span>}
          />
        )}
      </div>
      {removable && (
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          title="Take it out, with what it brought that nothing else needs"
          onClick={() =>
            remove({ variables: { input: { collaboration, identifier: item.identifier!, object: item.objectId } } })
              .catch(reportErrorAs("Couldn't take it out of the collaboration"))
          }
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

/** One page of a section, its rows named by one lookup. */
const ItemPage = ({
  collaboration,
  brought,
  index,
}: {
  collaboration: string;
  brought: boolean;
  index: number;
}) => {
  const { data } = useGetCollaborationItemsQuery({
    variables: { id: collaboration, brought, offset: index * PAGE, limit: PAGE },
  });
  const items = data?.collaboration.items ?? [];
  const nameable = items.filter((item) => isNameable(item.identifier));
  const { data: names } = useCollaborationItemNamesQuery({
    variables: itemNameVariables(nameable),
    skip: nameable.length === 0,
  });
  const named = itemNamesFrom(names);
  return (
    <>
      {items.map((item) => (
        <Item key={item.id} collaboration={collaboration} item={item} name={itemName(named, item)} removable={!brought} />
      ))}
    </>
  );
};

/** What is in it, a page at a time: the count is the server's, so it says how many pages there are. */
const ItemSection = ({ collaboration, brought, count }: { collaboration: string; brought: boolean; count: number }) => {
  const [pages, setPages] = useState(1);
  const shown = Math.min(count, pages * PAGE);
  return (
    <>
      {Array.from({ length: Math.ceil(shown / PAGE) }, (_, index) => (
        <ItemPage key={index} collaboration={collaboration} brought={brought} index={index} />
      ))}
      {count > shown && (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setPages((current) => current + 1)}>
          Show more ({count - shown} left)
        </Button>
      )}
    </>
  );
};

const Page = asDetailQueryRoute(useGetCollaborationQuery, ({ data }) => {
  const { openDialog } = useDialog();
  const collaboration = data.collaboration;

  return (
    <MikroCollaboration.ModelPage
      title={collaboration.name}
      object={collaboration}
      pageActions={
        <PageAction
          alwaysShow
          size="sm"
          icon={<Share2 className="h-4 w-4" />}
          onClick={() => openDialog("sharecollaboration", { collaboration: collaboration.id }, { size: "medium" })}
        >
          Share
        </PageAction>
      }
    >
      <div className="flex flex-col gap-4 p-3">
        <div className="flex flex-col gap-1">
          <div className="text-xl font-semibold">{collaboration.name}</div>
          {collaboration.description && <div className="text-sm text-muted-foreground">{collaboration.description}</div>}
        </div>
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            In this collaboration <Badge variant="outline">{collaboration.put}</Badge>
          </div>
          {collaboration.put === 0 && (
            <div className="text-sm text-muted-foreground">
              Nothing yet: use &ldquo;Add to Collaboration&rdquo; on a scene, a dataset or any other object.
            </div>
          )}
          <ItemSection collaboration={collaboration.id} brought={false} count={collaboration.put} />
        </section>
        {collaboration.broughtCount > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              Along with them, to be seen <Badge variant="outline">{collaboration.broughtCount}</Badge>
            </div>
            <ItemSection collaboration={collaboration.id} brought count={collaboration.broughtCount} />
          </section>
        )}
      </div>
    </MikroCollaboration.ModelPage>
  );
});

export default Page;
