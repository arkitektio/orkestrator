import { useDialog } from "@/core/dialogs/registry";
import { GraphQLListSearchField } from "@/core/forms/GraphQLListSearchField";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import {
  useApproveMembershipRequestMutation,
  useDeclineMembershipRequestMutation,
  useRoleOptionsLazyQuery,
} from "@/lok/api/graphql";
import { useForm } from "react-hook-form";

type AnswerForm = {
  roles: string[];
};

/**
 * Answers someone's request to join the organization this profile acts in:
 * approve it with the roles they should get, or decline it.
 */
export const AnswerMembershipRequestDialog = (props: {
  id: string;
  username: string;
  reason?: string | null;
}) => {
  const [approve] = useApproveMembershipRequestMutation({
    // The request leaves the list and its user joins the members.
    refetchQueries: ["MembershipRequests", "Organization"],
  });
  const [decline, { loading: declining }] = useDeclineMembershipRequestMutation({
    refetchQueries: ["MembershipRequests"],
  });
  const [search] = useRoleOptionsLazyQuery();
  const { closeDialog } = useDialog();

  const form = useForm<AnswerForm>({ defaultValues: { roles: [] } });

  const onApprove = async ({ roles }: AnswerForm) => {
    try {
      await approve({ variables: { input: { id: props.id, roles } } });
      toast.success(`${props.username} is now a member`);
      closeDialog();
    } catch {
      toast.error("Could not approve the request");
    }
  };

  const onDecline = async () => {
    try {
      await decline({ variables: { input: { id: props.id } } });
      toast.success(`Declined ${props.username}'s request`);
      closeDialog();
    } catch {
      toast.error("Could not decline the request");
    }
  };

  const busy = form.formState.isSubmitting || declining;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onApprove)}>
        <DialogHeader>
          <DialogTitle>{props.username} asks to join</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {props.reason && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{props.reason}</p>
          )}
          <GraphQLListSearchField
            name="roles"
            label="Roles"
            description="Roles to give them. Without any they join as a guest."
            searchQuery={search}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void onDecline()}>
            Decline
          </Button>
          <Button type="submit" disabled={busy}>
            {form.formState.isSubmitting ? "Approving…" : "Approve"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
