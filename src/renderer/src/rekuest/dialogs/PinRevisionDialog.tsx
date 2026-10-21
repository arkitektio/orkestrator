import { DialogError } from "@/core/dialogs/DialogError";
import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/core/ui/radio-group";
import Timestamp from "@/core/ui/timestamp";
import {
  useBlokRevisionsQuery,
  useMaterializedBlokQuery,
  usePinMaterializedBlokMutation,
} from "@/rekuest/api/graphql";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const LATEST = "latest";

const Choices = (props: { materializedBlokId: string; blokId: string; pinned: string | null }) => {
  const { closeDialog } = useDialog();
  const { data, error, refetch } = useBlokRevisionsQuery({ variables: { id: props.blokId, limit: 20, offset: 0 } });
  const [choice, setChoice] = useState(props.pinned ?? LATEST);
  const [pin] = usePinMaterializedBlokMutation();
  const { submit, submitting } = useDialogSubmit(
    () => pin({ variables: { input: { id: props.materializedBlokId, revision: choice === LATEST ? null : choice } } }),
    { errorTitle: "Couldn't change the revision" },
  );

  if (error) return <QueryError error={error} onRetry={() => void refetch()} />;
  const blok = data?.blok;
  if (!blok) return <Loader2 className="m-6 size-5 animate-spin text-muted-foreground" />;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <RadioGroup value={choice} onValueChange={setChoice} className="max-h-96 gap-0 overflow-y-auto">
        <label className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
          <RadioGroupItem value={LATEST} />
          <span className="flex-1 text-sm">
            Follow the latest{blok.head ? <span className="text-muted-foreground"> (now rev {blok.head.number})</span> : null}
          </span>
        </label>
        {blok.revisions.map((revision) => (
          <label key={revision.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
            <RadioGroupItem value={revision.id} />
            <span className="font-mono text-xs text-muted-foreground">#{revision.number}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{revision.message || "No message"}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              <Timestamp date={revision.createdAt} relative />
            </span>
          </label>
        ))}
      </RadioGroup>
      <DialogError />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || choice === (props.pinned ?? LATEST)}>
          {choice === LATEST ? "Follow the latest" : "Keep at this revision"}
        </Button>
      </DialogFooter>
    </form>
  );
};

/**
 * Which revision of its blok a materialization shows: the latest, following
 * every save, or one it stays at while the blok changes on.
 */
export const PinRevisionDialog = (props: { id: string }) => {
  const { data, error, refetch } = useMaterializedBlokQuery({ variables: { id: props.id } });

  if (error) return <QueryError error={error} onRetry={() => void refetch()} />;
  const materializedBlok = data?.materializedBlok;
  if (!materializedBlok) return <Loader2 className="m-6 size-5 animate-spin text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Revision of {materializedBlok.name || materializedBlok.blok.name}</DialogTitle>
        <DialogDescription>
          {materializedBlok.blok.provided
            ? "Its blok comes with its app and keeps no revisions: it always shows what the app registered."
            : "Follow the blok's latest revision, or keep this one at an earlier revision while the blok changes on."}
        </DialogDescription>
      </DialogHeader>
      {!materializedBlok.blok.provided && (
        <Choices
          materializedBlokId={materializedBlok.id}
          blokId={materializedBlok.blok.id}
          pinned={materializedBlok.pinnedRevision?.id ?? null}
        />
      )}
    </div>
  );
};
