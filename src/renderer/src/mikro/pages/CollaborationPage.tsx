import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { MikroCollaboration } from "@/core/linkers";
import { reportErrorAs } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { PageAction } from "@/core/ui/page-action";
import { Share2, X } from "lucide-react";
import {
  CollaborationItemFragment,
  useGetCollaborationQuery,
  useRemoveFromCollaborationMutation,
} from "../api/graphql";

const Item = ({ collaboration, item, removable }: { collaboration: string; item: CollaborationItemFragment; removable: boolean }) => {
  const [remove, { loading }] = useRemoveFromCollaborationMutation({ refetchQueries: ["GetCollaborations"] });
  if (!item.identifier) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border px-2 py-1">
      <div className="min-w-0 flex-1">
        <StructureDisplay
          identifier={item.identifier}
          id={item.objectId}
          variant="inline"
          link
          fallback={<span className="text-sm">{item.identifier} {item.objectId}</span>}
        />
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

const Page = asDetailQueryRoute(useGetCollaborationQuery, ({ data }) => {
  const { openDialog } = useDialog();
  const collaboration = data.collaboration;
  const put = collaboration.items.filter((item) => !item.brought);
  const brought = collaboration.items.filter((item) => item.brought);

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
            In this collaboration <Badge variant="outline">{put.length}</Badge>
          </div>
          {put.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Nothing yet: use &ldquo;Add to Collaboration&rdquo; on a scene, a dataset or any other object.
            </div>
          )}
          {put.map((item) => (
            <Item key={item.id} collaboration={collaboration.id} item={item} removable />
          ))}
        </section>
        {brought.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              Along with them, to be seen <Badge variant="outline">{brought.length}</Badge>
            </div>
            {brought.map((item) => (
              <Item key={item.id} collaboration={collaboration.id} item={item} removable={false} />
            ))}
          </section>
        )}
      </div>
    </MikroCollaboration.ModelPage>
  );
});

export default Page;
