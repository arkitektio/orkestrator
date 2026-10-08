import { useDialog } from "@/core/dialogs/registry";
import { buildAssignInput } from "@/rekuest/assign";
import { GraphQLListSearchField } from "@/core/forms/GraphQLListSearchField";
import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { ArgsContainer } from "@/core/ports/widgets/ArgsContainer";
import { FormActionDescription } from "@/core/ports/engine/ActionDescription";
import { v4 as uuidv4 } from "uuid";
import { useHooksSearchLazyQuery } from "../api/graphql";
import { useAction } from "../hooks/useAction";
import { usePortForm } from "@/core/ports/engine/usePortForm";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { useState } from "react";
import { cn } from "@/core/util/utils";
import { AssignErrorNote } from "../components/AssignErrorNote";



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

  // Why the last submit did not start; the dialog stays open on it.
  const [failure, setFailure] = useState<unknown>(null);
  // The button jiggles once per refusal; cleared when the animation ends so
  // the next refusal plays it again.
  const [refused, setRefused] = useState(false);
  // Counts refusals: keys the reason so it slides in again on a repeat.
  const [refusals, setRefusals] = useState(0);

  const onSubmit = async (data: any) => {
    const reference = uuidv4()

    setFailure(null);
    try {
      await assign(buildAssignInput({
        action: props.id,
        args: data,
        reference: reference,
        hooks: [],
      }));
    } catch (error) {
      setFailure(error);
      setRefused(true);
      setRefusals((count) => count + 1);
      return;
    }
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
              options={{ layout: "stack" }}
              path={[]}
            />

            <DialogFooter className="sm:items-center">
              {/* To the left of the button that was pressed. */}
              <AssignErrorNote key={refusals} error={failure} variant="line" className="animate-refuse-reason sm:mr-auto" />
              <Button
                type="submit"
                // Red while it jiggles, then back to the plain button.
                variant={refused ? "destructive" : "outline"}
                disabled={isSubmitting}
                className={cn("shrink-0", refused && "animate-refuse-shake")}
                onAnimationEnd={() => setRefused(false)}
              >
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
