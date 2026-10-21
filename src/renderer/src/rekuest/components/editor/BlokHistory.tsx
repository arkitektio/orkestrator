import { RekuestTask } from "@/core/linkers";
import { reportErrorAs } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { useBlokRevisionsQuery, useRevertBlokMutation, type BlokRevisionListItemFragment } from "@/rekuest/api/graphql";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const PAGE = 20;

const RevisionRow = (props: {
  revision: BlokRevisionListItemFragment;
  current: boolean;
  /** Restoring would throw away unsaved changes: ask once more. */
  dirty: boolean;
  restoring: boolean;
  onRestore: () => void;
}) => {
  const { revision, current } = props;
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="group flex flex-col gap-1 py-2">
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 font-mono text-xs text-muted-foreground">#{revision.number}</span>
        <span className={cn("min-w-0 flex-1 truncate text-sm", !revision.message && "text-muted-foreground")}>
          {revision.message || "No message"}
        </span>
        {current && (
          <Badge variant="secondary" className="shrink-0">
            current
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-6 text-xs text-muted-foreground">
        {revision.author && <StructureDisplay identifier="@lok/user" id={revision.author.sub} variant="inline" />}
        <Timestamp date={revision.createdAt} relative />
        {revision.task && (
          <RekuestTask.DetailLink object={revision.task} className="underline-offset-2 hover:underline">
            by a task
          </RekuestTask.DetailLink>
        )}
      </div>
      {!current && (
        <div className="flex gap-2 pl-6 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {confirming ? (
            <>
              <Button size="sm" variant="destructive" disabled={props.restoring} onClick={props.onRestore}>
                Discard my changes and restore
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={props.restoring}
              onClick={() => (props.dirty ? setConfirming(true) : props.onRestore())}
            >
              Restore
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * A custom blok's history, newest first. Restoring an earlier revision makes
 * its content the head again, as a revision of its own: history only grows.
 * Shared by the editor (which reloads from the new head) and the blok page.
 */
export const BlokHistory = (props: {
  blokId: string;
  /** The editor holds unsaved changes a restore would replace. */
  dirty?: boolean;
  onRestored?: () => void;
}) => {
  const { data, loading, fetchMore } = useBlokRevisionsQuery({
    variables: { id: props.blokId, limit: PAGE, offset: 0 },
  });
  const [revert, { loading: restoring }] = useRevertBlokMutation({
    refetchQueries: ["BlokRevisions", "BlokEditor", "GetBlok"],
    awaitRefetchQueries: true,
  });
  const [exhausted, setExhausted] = useState(false);

  const blok = data?.blok;
  if (!blok) return loading ? <Loader2 className="m-3 size-4 animate-spin text-muted-foreground" /> : null;
  if (blok.provided) {
    return <p className="p-3 text-sm text-muted-foreground">It changes with its app's registrations, so it keeps no history here.</p>;
  }

  const restore = (revision: BlokRevisionListItemFragment) => {
    if (!blok.head) return;
    revert({ variables: { input: { blok: blok.id, to: revision.id, base: blok.head.id } } })
      .then(() => props.onRestored?.())
      .catch(reportErrorAs("Couldn't restore the revision"));
  };

  const loadMore = () =>
    fetchMore({
      variables: { offset: blok.revisions.length },
      updateQuery: (previous, { fetchMoreResult }) => {
        if (fetchMoreResult.blok.revisions.length < PAGE) setExhausted(true);
        return {
          ...previous,
          blok: { ...previous.blok, revisions: [...previous.blok.revisions, ...fetchMoreResult.blok.revisions] },
        };
      },
    }).catch(reportErrorAs("Couldn't load more revisions"));

  return (
    <div className="flex flex-col p-3">
      <div className="flex flex-col divide-y divide-border">
        {blok.revisions.map((revision) => (
          <RevisionRow
            key={revision.id}
            revision={revision}
            current={revision.id === blok.head?.id}
            dirty={props.dirty ?? false}
            restoring={restoring}
            onRestore={() => restore(revision)}
          />
        ))}
      </div>
      {!exhausted && blok.revisions.length >= PAGE && blok.revisions.length % PAGE === 0 && (
        <Button size="sm" variant="ghost" className="mt-2 self-start" onClick={() => void loadMore()}>
          Load more
        </Button>
      )}
    </div>
  );
};
