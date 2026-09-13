import { useDialog } from "@/app/dialog";
import { buildAssignInput } from "@/rekuest/assign";
import { GraphQLListSearchField } from "@/components/fields/GraphQLListSearchField";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ArgsContainer } from "@/components/widgets/ArgsContainer";
import { FormActionDescription } from "@/lib/rekuest/ActionDescription";
import { v4 as uuidv4 } from "uuid";
import { useHooksSearchLazyQuery } from "../api/graphql";
import { useAction } from "../hooks/useAction";
import { usePortForm } from "../hooks/usePortForm";
import { useWidgetRegistry } from "../widgets/WidgetsContext";



export const SelectHooks = (_props: {}) => {
  const [search, _] = useHooksSearchLazyQuery();

  return <GraphQLListSearchField name="hooks" searchQuery={search} />;
};

export const ActionAssignForm = (props: {
  id: string;
  args?: { [key: string]: any };
  hidden?: { [key: string]: any };
}) => {
  const { assign, action } = useAction({
    id: props.id,
  });

  const dialog = useDialog();

  const form = usePortForm({
    ports: action?.args || [],
    overwrites: props.args,
  });

  const onSubmit = async (data: any) => {
    console.log("Submitting");

    const reference = uuidv4()



    await assign(buildAssignInput({
      action: props.id,
      args: data,
      reference: reference,
      hooks: [],
    }));
    dialog.closeDialog();
  };

  // Subscribing to `isValid` makes react-hook-form run the whole-form
  // resolver on every keystroke; submit-time errors are reported per field.
  const isSubmitting = form.formState.isSubmitting;

  const { registry } = useWidgetRegistry();

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{action?.name}</DialogTitle>
      </DialogHeader>
      <DialogDescription className="mt2">
        {action?.description && (
          <FormActionDescription
            description={action?.description}
            control={form.control}
          />
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 mt-4"
          >
            {action?.args.length == 0 && (
              <div className="text-muted"> No Arguments needed</div>
            )}
            <ArgsContainer
              registry={registry}
              groups={action?.portGroups || []}
              ports={action?.args || []}
              hidden={props.args}
              path={[]}
            />

            <DialogFooter>
              <Button type="submit" variant={"outline"} disabled={isSubmitting}>
                {" "}
                Do {isSubmitting && "ing"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogDescription>
    </div>
  );
};
