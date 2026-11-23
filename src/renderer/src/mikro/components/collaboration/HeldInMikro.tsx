import { MikroCollaboration } from "@/core/linkers";
import type { Object } from "@/core/types";
import { Badge } from "@/core/ui/badge";
import { useGetCollaborationQuery } from "../../api/graphql";

/**
 * What mikro holds of a lok collaboration (a `pageSections` entry on `@lok/collaboration`,
 * given its key as `id`): how much was put in here, with a link to it. mikro makes its row
 * the first time something is put in, so until then there is nothing to show.
 */
export const HeldInMikro = ({ object }: { identifier: string; object: Object }) => {
  const key = String(object.id);
  const { data, error } = useGetCollaborationQuery({ variables: { id: key } });
  const collaboration = data?.collaboration;

  return (
    <section className="flex flex-col gap-1 rounded-md border px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        Mikro
        {collaboration && <Badge variant="outline">{collaboration.put} put in</Badge>}
        {collaboration && collaboration.broughtCount > 0 && (
          <Badge variant="outline">{collaboration.broughtCount} along with them</Badge>
        )}
      </div>
      {collaboration ? (
        <MikroCollaboration.DetailLink object={collaboration} className="text-sm text-muted-foreground hover:underline">
          See what is in it on Mikro
        </MikroCollaboration.DetailLink>
      ) : (
        <div className="text-sm text-muted-foreground">
          {error ? "Nothing in it on Mikro yet: use Add to Collaboration on a dataset or a scene." : "Loading…"}
        </div>
      )}
    </section>
  );
};
