import { useDialog } from "@/core/dialogs/registry";
import { ListSearchField } from "@/core/forms/ListSearchField";
import { useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useInviteToCallMutation } from "@/lovekit/api/graphql";
import { useForm } from "react-hook-form";

type Values = { users: string[] };

/**
 * Ask people into a call. What they get is an invitation ringing in their
 * app, on every device they have it open on; nothing goes to a phone, and
 * anyone in the organization can join without one from "Join calls".
 */
export const InviteToCallDialog = ({ call }: { call: { id: string; title: string } }) => {
  const { closeDialog } = useDialog();
  const searchUsers = useStructureOptions("@lok/user");
  const [invite, { loading }] = useInviteToCallMutation();
  const form = useForm<Values>({ defaultValues: { users: [] } });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(({ users }) => {
          if (users.length === 0) {
            form.setError("users", { message: "Pick at least one person" });
            return;
          }
          return invite({ variables: { input: { call: call.id, users } } })
            .then(() => {
              toast.success(users.length === 1 ? "Invitation sent" : `${users.length} invitations sent`);
              closeDialog();
            })
            .catch((error) => toast.error(error instanceof Error ? error.message : "Could not invite"));
        })}
        className="flex flex-col gap-3"
      >
        <DialogHeader>
          <DialogTitle>Invite to “{call.title}”</DialogTitle>
          <DialogDescription>
            Their app rings with a Join button, on every device they have it open on. Everyone in the organization can
            also join from Join calls on their home page.
          </DialogDescription>
        </DialogHeader>
        {searchUsers ? (
          <ListSearchField name="users" label="People" search={searchUsers} placeholder="Pick people" />
        ) : (
          <p className="text-sm text-muted-foreground">The people of the organization are not available right now.</p>
        )}
        <DialogFooter>
          <Button type="submit" disabled={loading || !searchUsers}>
            Invite
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
