import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { toast } from "@/core/notify";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Check, Plus, Share2 } from "lucide-react";
import { useState } from "react";
import {
  useAddToCollaborationMutation,
  useCreateCollaborationMutation,
  useGetCollaborationsQuery,
} from "../api/graphql";

/** What is being put in a collaboration: objects of mikro, by structure identifier and id. */
export type CollaborationSubject = { identifier: string; id: string }[];

export type AddToCollaborationFormProps = { objects: CollaborationSubject };

const describe = (objects: CollaborationSubject) =>
  objects.length === 1 ? "this object" : `${objects.length} objects`;

/**
 * Pick the collaboration to put objects in, or name a new one. What each object needs to be
 * seen (a scene's datasets, a dataset's stores) comes along: mikro puts that in too.
 */
export const AddToCollaborationForm = ({ objects }: AddToCollaborationFormProps) => {
  const { openDialog } = useDialog();
  const [name, setName] = useState("");
  const [pending, setPending] = useState<string>();
  const { data, loading } = useGetCollaborationsQuery();
  const [add] = useAddToCollaborationMutation({ refetchQueries: ["GetCollaborations", "GetCollaboration"] });
  const [create] = useCreateCollaborationMutation({ refetchQueries: ["GetCollaborations"] });

  const holdsAll = (items: { identifier?: string | null; objectId: string }[]) =>
    objects.every((object) => items.some((item) => item.identifier === object.identifier && item.objectId === object.id));

  // A failure stays in the dialog; the toast on success is for its Share action.
  const { submit } = useDialogSubmit(
    async (target: { id: string; name: string } | "new") => {
      setPending(target === "new" ? "__new__" : target.id);
      try {
        let collaboration = target;
        if (collaboration === "new") {
          const created = (await create({ variables: { input: { name: name.trim() } } })).data?.createCollaboration;
          if (!created) throw new Error("the collaboration was not created");
          collaboration = created;
        }
        for (const object of objects) {
          await add({ variables: { input: { collaboration: collaboration.id, identifier: object.identifier, object: object.id } } });
        }
        return collaboration;
      } finally {
        setPending(undefined);
      }
    },
    {
      errorTitle: "Couldn't add to the collaboration",
      onSuccess: (collaboration) =>
        toast.success(`Put ${describe(objects)} in ${collaboration.name}`, {
          action: { label: "Share", onClick: () => openDialog("sharecollaboration", { collaboration: collaboration.id }, { size: "medium" }) },
        }),
    },
  );
  const putIn = (collaboration: { id: string; name: string }) => submit(collaboration);
  const createAndPutIn = () => submit("new");

  const collaborations = data?.collaborations ?? [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add to Collaboration</DialogTitle>
        <DialogDescription>
          Put {describe(objects)} in a collaboration. What it needs to be seen comes along; whoever the
          collaboration is shared with sees nothing else.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-2 flex flex-col gap-2">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) void createAndPutIn();
          }}
        >
          <Input placeholder="New collaboration…" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="outline" disabled={!name.trim() || pending !== undefined} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {loading && collaborations.length === 0 && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && collaborations.length === 0 && (
            <div className="text-sm text-muted-foreground">No collaborations yet: name one above.</div>
          )}
          {collaborations.map((collaboration) => {
            const already = holdsAll(collaboration.items);
            return (
              <Button
                key={collaboration.id}
                type="button"
                variant="ghost"
                className="justify-start gap-2"
                disabled={already || pending !== undefined}
                onClick={() => void putIn(collaboration)}
              >
                {already ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                <span className="truncate">{collaboration.name}</span>
                <Badge variant="outline" className="ml-auto text-[0.625rem]">
                  {collaboration.items.filter((item) => !item.brought).length}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );
};
