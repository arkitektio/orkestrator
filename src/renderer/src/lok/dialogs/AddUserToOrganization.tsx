import { useDialog } from "@/core/app/dialog";
import { GraphQLListSearchField } from "@/core/components/fields/GraphQLListSearchField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { useAddUserToOrganizationMutation, useMyContextQuery, useRoleOptionsLazyQuery } from "@/lok/api/graphql";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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

  const { closeDialog } = useDialog();

  const dialog = async (data: AddUserInfoForm) => {
    if (!organization) return;
    const { roles } = data;

    // Send notification to each user
    const promises = props.users.map(userId =>
      add({
        variables: {
          input: {
            user: userId,
            organization: organization.id,
            roles: roles,
          },
        },
      })
    );

    try {
      await Promise.all(promises);
      toast.success(`Added ${props.users.length} user${props.users.length > 1 ? 's' : ''} to ${organization.name}`);
      return { data: { success: true } };
    } catch (error) {
      toast.error("Failed to add users");
      throw error;
    } finally {
      closeDialog();
    }
  }

  const form = useForm<AddUserInfoForm>({
    defaultValues: {
      roles: [],
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(dialog)}
      >
        <DialogHeader>
          <DialogTitle>Add to {organization?.name ?? "organization"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="text-sm text-muted-foreground">
            Adding {props.users.length} user{props.users.length > 1 ? 's' : ''}
          </div>

          <GraphQLListSearchField
            name="roles"
            label="Roles"
            description="Select roles for the user"
            searchQuery={search}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

