import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { GraphQLListSearchField } from "@/core/forms/GraphQLListSearchField";
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
import { useForm } from "react-hook-form";
import {
  ServiceInstanceFragment,
  UpdateServiceInstanceMutationVariables,
  useGroupOptionsLazyQuery,
  useUpdateServiceInstanceMutation,
  useUserOptionsLazyQuery,
} from "../api/graphql";

export const UpdateServiceInstanceForm = (props: {
  instance: Partial<ServiceInstanceFragment>;
}) => {
  const [createServiceInstance] = useUpdateServiceInstanceMutation();

  const cre = useGraphQLDialog(createServiceInstance, {
    errorTitle: "Couldn't update the service instance",
  });

  const [userSearch] = useUserOptionsLazyQuery();
  const [groupSearch] = useGroupOptionsLazyQuery();

  const form = useForm<UpdateServiceInstanceMutationVariables["input"]>({
    defaultValues: {
      id: props.instance.id,
      allowedUsers: props.instance.allowedUsers?.map((u) => u.id) ?? [],
      deniedUsers: props.instance.deniedUsers?.map((u) => u.id) ?? [],
      allowedGroups: props.instance.allowedGroups?.map((u) => u.id) ?? [],
      deniedGroups: props.instance.deniedGroups?.map((u) => u.id) ?? [],
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Service instance access</DialogTitle>
        <DialogDescription>Who may use this service instance.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <DialogForm
          onSubmit={form.handleSubmit(async (data) => {
            return await cre({
              variables: {
                input: data,
              },
            });
          })}
        >
          <DialogBody>
            <GraphQLListSearchField
              label="Allowed Users"
              name="allowedUsers"
              searchQuery={userSearch}
              description="Users that are allowed to access this service instance."
            />
            <GraphQLListSearchField
              label="Denied Users"
              name="deniedUsers"
              searchQuery={userSearch}
              description="Users that are denied to access this service instance."
            />
            <GraphQLListSearchField
              label="Allowed Groups"
              name="allowedGroups"
              searchQuery={groupSearch}
              description="Groups that are allowed to access this service instance."
            />
            <GraphQLListSearchField
              label="Denied Groups"
              name="deniedGroups"
              searchQuery={groupSearch}
              description="Groups that are denied to access this service instance."
            />
          </DialogBody>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </DialogForm>
      </Form>
    </>
  );
};
