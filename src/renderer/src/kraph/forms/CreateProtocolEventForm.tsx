import { useGraphQlFormDialog } from "@/core/dialogs/FormDialog";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { Separator } from "@/core/ui/separator";
import { useForm } from "react-hook-form";
import {
  ProtocolEventCategoryFragment,
  useAssertProtocolEventExistsMutation,
} from "../api/graphql";

type EventRole = ProtocolEventCategoryFragment["inputs"][number];

// Note: the backend no longer exposes tag/ontology-based role descriptors for
// searching entities (the old `useSearchEntitiesForRoleLazyQuery` /
// `ReagentRoleDefinitionFragment` / `VariableDefinitionFragment` concepts have
// been removed from the schema in favor of a unified `EventRole` with a
// `RoleMappingInput` on submit). Role inputs are entered as raw entity ids
// below rather than through the previous smart searchable pickers.
export const EventRoleInput = ({ role }: { role: EventRole }) => {
  return (
    <div key={role.key} className="col-span-2 flex-col gap-1 flex">
      <StringField
        name={"map." + role.role}
        label={role.role}
        description={
          role.descriptor?.defaultCategoryKey
            ? `Entity id for role "${role.role}" (expected category: ${role.descriptor.defaultCategoryKey})`
            : `Entity id for role "${role.role}"`
        }
      />
    </div>
  );
};

export default (props: {
  protocolEventCategory: ProtocolEventCategoryFragment;
  rolemap: { [key: string]: any };
}) => {
  const [add] = useAssertProtocolEventExistsMutation();

  const dialog = useGraphQlFormDialog(add);

  const form = useForm<{
    map: { [key: string]: string };
  }>({
    defaultValues: {
      map: {
        ...props.rolemap,
      },
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            dialog({
              variables: {
                input: {
                  term:
                    props.protocolEventCategory.term?.key ??
                    props.protocolEventCategory.key,
                  inputs: props.protocolEventCategory.inputs.map((role) => ({
                    entityId: data.map[role.role],
                    role: role.role,
                  })),
                  outputs: props.protocolEventCategory.outputs.map((role) => ({
                    entityId: data.map[role.role],
                    role: role.role,
                  })),
                },
              },
            });
          })}
        >
          <h1 className="text-xl">{props.protocolEventCategory.label}</h1>

          <p className="py-6">{props.protocolEventCategory.description}</p>

          <div className="grid grid-cols-2 gap-2">
            {props.protocolEventCategory.inputs.map((role) => (
              <EventRoleInput key={role.key} role={role} />
            ))}
            {props.protocolEventCategory.outputs.map((role) => (
              <EventRoleInput key={role.key} role={role} />
            ))}
          </div>
          <Separator className="my-4" />

          <DialogFooter className="mt-2">
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
