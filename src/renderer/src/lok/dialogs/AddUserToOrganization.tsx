import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { GraphQLListSearchField } from "@/core/forms/GraphQLListSearchField";
import { Button } from "@/core/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useAddUserToOrganizationMutation, useMyContextQuery, useRoleOptionsLazyQuery } from "@/lok/api/graphql";
import { useForm } from "react-hook-form";

type AddUserInfoForm = {
  roles: string[];
};

/**
 * Adds users to the organization this profile acts in — the only one it has,
 * so there is no organization to pick.
 */
export const AddUserToOrganizationDialog = (props: { users: string[] }) => {
  const [add] = useAddUserToOrganizationMutation();
  const [search] = useRoleOptionsLazyQuery();
  const { data: context } = useMyContextQuery();
  const organization = context?.mycontext.organization;

  const plural = props.users.length > 1 ? "s" : "";

  // Opened from a selection of users, where the new membership does not show:
  // the toast is the confirmation.
  const { submit, submitting } = useDialogSubmit(
    async ({ roles }: AddUserInfoForm) => {
      if (!organization) throw new Error("The organization is not loaded yet");
      await Promise.all(
        props.users.map((userId) =>
          add({
            variables: {
              input: {
                user: userId,
                organization: organization.id,
                roles: roles,
              },
            },
          }),
        ),
      );
    },
    {
      errorTitle: `Couldn't add the user${plural}`,
      successMessage: `Added ${props.users.length} user${plural} to ${organization?.name ?? "the organization"}`,
    },
  );

  const form = useForm<AddUserInfoForm>({
    defaultValues: {
      roles: [],
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
      >
        <DialogHeader>
          <DialogTitle>Add to {organization?.name ?? "organization"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="text-sm text-muted-foreground">
            Adding {props.users.length} user{plural}
          </div>

          <GraphQLListSearchField
            name="roles"
            label="Roles"
            description="Select roles for the user"
            searchQuery={search}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button type="submit" disabled={submitting || !organization}>
            {submitting ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

