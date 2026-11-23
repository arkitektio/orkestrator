import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { toast } from "@/core/notify";
import { Badge } from "@/core/ui/badge";
import {
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { CollaborationPicker, useResolveCollaboration, type CollaborationTarget } from "@/core/collaborations/CollaborationPicker";
import { useState } from "react";
import {
  useAddManyToCollaborationMutation,
  useGetCollaborationsWithItemsQuery,
} from "../api/graphql";
import { DerivedDataPicker, useDerivedSelection } from "./collaboration/DerivedDataPicker";
import { collaborationRefs } from "./collaboration/derivedSelection";

/** What is being put in a collaboration: objects of mikro, by structure identifier and id. */
export type CollaborationSubject = { identifier: string; id: string }[];

export type AddToCollaborationFormProps = { objects: CollaborationSubject };

const describe = (objects: CollaborationSubject) =>
  objects.length === 1 ? "this object" : `${objects.length} objects`;

const describeWith = (objects: CollaborationSubject, derived: number) =>
  derived === 0 ? describe(objects) : `${describe(objects)} and ${derived} derived`;

/**
 * Pick the collaboration to put objects in, or name a new one. Collaborations are lok's (one
 * key across every service): a new one is made there, then mikro puts the objects in under
 * its key. What each object needs to be seen (a scene's datasets, a dataset's stores) comes
 * along: mikro puts that in too. What was derived from them (masks, measurements, meshes)
 * goes in only as chosen under "Derived data".
 */
export const AddToCollaborationForm = ({ objects }: AddToCollaborationFormProps) => {
  const { openDialog } = useDialog();
  const [pending, setPending] = useState<string>();
  // mikro's rows of the collaborations (by key, `id: key`): what each already holds.
  const { data } = useGetCollaborationsWithItemsQuery();
  const [addMany] = useAddManyToCollaborationMutation({ refetchQueries: ["GetCollaborations", "GetCollaborationsWithItems", "GetCollaboration", "GetCollaborationItems"] });
  const resolve = useResolveCollaboration();
  const derived = useDerivedSelection(objects);
  const refs = collaborationRefs(objects, derived.picked);
  const derivedCount = refs.length - objects.length;

  const held = new Map((data?.collaborations ?? []).map((collaboration) => [collaboration.id, collaboration]));
  const holdsAll = (key: string) => {
    const items = held.get(key)?.items;
    return !!items && refs.every((object) => items.some((item) => item.identifier === object.identifier && item.objectId === object.id));
  };

  // A failure stays in the dialog; the toast on success is for its Share action.
  const { submit } = useDialogSubmit(
    async (target: CollaborationTarget) => {
      setPending("key" in target ? target.key : "__new__");
      try {
        const collaboration = await resolve(target);
        await addMany({
          variables: {
            input: {
              collaboration: collaboration.key,
              name: collaboration.name,
              objects: refs.map((ref) => ({ identifier: ref.identifier, object: ref.id })),
            },
          },
        });
        return collaboration;
      } finally {
        setPending(undefined);
      }
    },
    {
      errorTitle: "Couldn't add to the collaboration",
      onSuccess: (collaboration) =>
        toast.success(`Put ${describeWith(objects, derivedCount)} in ${collaboration.name}`, {
          action: { label: "Share", onClick: () => openDialog("sharecollaboration", { collaboration: collaboration.key }, { size: "medium" }) },
        }),
    },
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add to Collaboration</DialogTitle>
        <DialogDescription>
          Put {describe(objects)} in a collaboration. What it needs to be seen comes along, and what was
          derived from it as chosen below; whoever the collaboration is shared with sees nothing else.
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <DerivedDataPicker selection={derived} />
        <DialogBody className="gap-1">
          <CollaborationPicker
            onPick={(target) => void submit(target)}
            disabled={pending !== undefined || derived.pending}
            pending={pending}
            decorate={(collaboration) => {
              const row = held.get(collaboration.key);
              return {
                done: holdsAll(collaboration.key),
                badge: row ? (
                  <Badge variant="outline" className="text-[0.625rem]" title="Put in on Mikro">
                    {row.put}
                  </Badge>
                ) : undefined,
              };
            }}
          />
        </DialogBody>
      </div>
    </>
  );
};
