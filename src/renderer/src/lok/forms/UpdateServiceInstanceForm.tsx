import { useGraphQLDialog } from "@/app/hooks/useGraphQLDialog";
import { GraphQLListSearchField } from "@/components/fields/GraphQLListSearchField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
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

  const cre = useGraphQLDialog(createServiceInstance);

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
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            return await cre({
              variables: {
                input: data,
              },
            });
          })}
        >
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="col-span-2 flex-col gap-1 flex">
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
            </div>
            <div className="grid cols-2 w-full"></div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="submit">Change</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
