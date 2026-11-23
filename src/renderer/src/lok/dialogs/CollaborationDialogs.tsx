import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";

import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { LokCollaboration } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import {
  CollaborationsDocument,
  useCreateCollaborationMutation,
  useDeleteCollaborationMutation,
  useGetCollaborationQuery,
  useUpdateCollaborationMutation,
} from "../api/graphql";

type CollaborationValues = { name: string; description?: string | null };

/**
 * A new collaboration in the organization: lok names it, and its key is what every service
 * holds what is put in it under. It opens on its page, empty until something is put in.
 */
export const CreateCollaborationDialog = ({ navigateTo = true }: { navigateTo?: boolean }) => {
  const navigate = useNavigate();
  const [create] = useCreateCollaborationMutation({ refetchQueries: [CollaborationsDocument] });
  const form = useForm<CollaborationValues>({ defaultValues: { name: "", description: "" } });

  const { submit, submitting } = useDialogSubmit(
    async (values: CollaborationValues) => {
      const result = await create({
        variables: { input: { name: values.name.trim(), description: values.description?.trim() || null } },
      });
      const made = result.data?.createCollaboration;
      if (!made) throw new Error("lok did not create the collaboration");
      return made;
    },
    {
      errorTitle: "Couldn't create the collaboration",
      onSuccess: (made) => {
        if (navigateTo) navigate(LokCollaboration.linkBuilder(made.id));
      },
    },
  );

  return (
    <Form {...form}>
      <DialogForm onSubmit={form.handleSubmit(submit)}>
        <DialogHeader>
          <DialogTitle>New Collaboration</DialogTitle>
          <DialogDescription>
            An empty collaboration across every service: put objects or a whole workflow in it, then
            share it with guests by link.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="gap-4">
          <StringField label="Name" name="name" placeholder="Shared with the lab" />
          <StringField label="Description" name="description" placeholder="What it is for (optional)" />
        </DialogBody>
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            Create
          </Button>
        </DialogFooter>
      </DialogForm>
    </Form>
  );
};

/** Rename a collaboration, or say what it is for. Its key, and so what is in it, stays. */
export const UpdateCollaborationDialog = ({ collaboration }: { collaboration: string }) => {
  const { data } = useGetCollaborationQuery({ variables: { id: collaboration } });
  const current = data?.collaboration;
  const [update] = useUpdateCollaborationMutation();
  const form = useForm<CollaborationValues>({
    values: current ? { name: current.name, description: current.description ?? "" } : undefined,
  });

  const { submit, submitting } = useDialogSubmit(
    async (values: CollaborationValues) => {
      if (!current) throw new Error("The collaboration is still loading");
      await update({
        variables: {
          input: { id: current.lokId, name: values.name.trim(), description: values.description?.trim() || null },
        },
      });
    },
    { errorTitle: "Couldn't rename the collaboration" },
  );

  return (
    <Form {...form}>
      <DialogForm onSubmit={form.handleSubmit(submit)}>
        <DialogHeader>
          <DialogTitle>Rename {current?.name ?? "collaboration"}</DialogTitle>
          <DialogDescription>Guests see the new name; what is in it stays.</DialogDescription>
        </DialogHeader>
        <DialogBody className="gap-4">
          <StringField label="Name" name="name" />
          <StringField label="Description" name="description" placeholder="What it is for (optional)" />
        </DialogBody>
        <DialogFooter>
          <Button type="submit" disabled={submitting || !current}>
            Save
          </Button>
        </DialogFooter>
      </DialogForm>
    </Form>
  );
};

/**
 * Delete a collaboration in lok: every grant of it goes, so its guests see nothing of it any
 * more (a guest left with none leaves the organization). What services hold under its key is
 * not deleted with it.
 */
export const DeleteCollaborationDialog = ({ collaboration }: { collaboration: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { closeDialog } = useDialog();
  const { data } = useGetCollaborationQuery({ variables: { id: collaboration } });
  const current = data?.collaboration;
  const [remove] = useDeleteCollaborationMutation({
    refetchQueries: [CollaborationsDocument],
    update: (cache) => {
      cache.evict({ id: cache.identify({ __typename: "Collaboration", id: collaboration }) });
      cache.gc();
    },
  });

  const { submit, submitting } = useDialogSubmit(
    async () => {
      if (!current) throw new Error("The collaboration is still loading");
      await remove({ variables: { id: current.lokId } });
    },
    {
      errorTitle: "Couldn't delete the collaboration",
      // Off its page, which is gone; from a list, the list stays.
      onSuccess: () => {
        if (location.pathname === LokCollaboration.linkBuilder(collaboration)) navigate("/lok/collaborations");
      },
    },
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete {current?.name ?? "collaboration"}?</DialogTitle>
        <DialogDescription>
          Everyone it was shared with loses it, and its links stop working. This cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => closeDialog()} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={() => void submit()} disabled={submitting || !current}>
          {submitting ? "Deleting…" : "Delete"}
        </Button>
      </DialogFooter>
    </>
  );
};
