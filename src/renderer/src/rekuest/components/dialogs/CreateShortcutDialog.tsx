import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { IntField } from "@/core/forms/IntField";
import { StringField } from "@/core/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { ScrollArea } from "@/core/ui/scroll-area";
import { Skeleton } from "@/core/ui/skeleton";
import { FormActionDescription } from "@/core/ports/engine/ActionDescription";
import { ArgsContainer } from "@/core/ports/widgets/ArgsContainer";
import React, { useMemo } from "react";
import * as z from "zod";
import {
  useCreateShortcutMutation,
  useDetailActionQuery,
} from "../../api/graphql";
import { usePortForm } from "@/core/ports/engine/usePortForm";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { RoleGuard } from "@/core/connection/roles";
import { REKUEST_ADMIN } from "../../roles";
import { ShortcutBindingFields } from "./BindShortcutDialog";
import { toBindingInput } from "../../lib/shortcutBinding";

const NO_PORTS: never[] = [];


export const CreateShortcutDialog = (props: {
  id: string;
  args?: { [key: string]: any };
  hidden?: { [key: string]: any };
}) => {
  const { data: actiondata } = useDetailActionQuery({
    variables: {
      id: props.id,
    },
  });

  const { closeDialog } = useDialog();

  const [create] = useCreateShortcutMutation();

  const action = actiondata?.action;

  const [chosenArgs, setChosenArgs] = React.useState<string[]>([]);

  // The form holds every argument; only the chosen ones are mounted, and
  // the port form validates and submits only what is mounted. Toggling one
  // therefore keeps what was typed, here and in the other fields.
  const ports = action?.args ?? NO_PORTS;
  const chosenPorts = useMemo(
    () => ports.filter((arg) => chosenArgs.includes(arg.key)),
    [ports, chosenArgs],
  );
  const overwrites = useMemo(
    () => ({ ...props.args, name: action?.name }),
    [props.args, action?.name],
  );

  const form = usePortForm({
    ports,
    overwrites,
    additionalSchema: z.object({
      toolbox: z.string().optional(),
      name: z.string().nonempty(),
      allowQuick: z.boolean().default(false),
      bindNumber: z.coerce.number().int().min(0).max(9).optional(),
      pin: z.boolean().default(false),
      users: z.array(z.string()).optional(),
      app: z.string().nullable().optional(),
      client: z.string().nullable().optional(),
      device: z.string().nullable().optional(),
    }),
  });

  const { submit: onSubmit } = useDialogSubmit(
    async (data: any) => {
      const { toolbox, name, allowQuick, bindNumber, pin, users, app, client, device, ...rest } = data;

      return create({
        variables: {
          input: {
            name: name,
            action: props.id,
            toolbox: toolbox || null,
            args: rest,
            bindNumber: bindNumber,
            allowQuick: allowQuick,
            // Only an admin sees the fields; the server checks it again.
            bindings: pin ? toBindingInput({ users: users ?? [], app, client, device }) : null,
          },
        },
      });
    },
    { errorTitle: "Couldn't create the shortcut" },
  );

  const isSubmitting = form.formState.isSubmitting;
  const isValid = form.formState.isValid;

  const { registry } = useWidgetRegistry();

  if (!action) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Create Shortcut</DialogTitle>
          <DialogDescription>Loading action…</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      </div>
    );
  }

  const hasArgs = action.args.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Create Shortcut
        </DialogTitle>
        <DialogDescription>
          Save{" "}
          <span className="font-medium text-foreground">{action.name}</span> as
          a shortcut for quick, repeatable assignment.
        </DialogDescription>
      </DialogHeader>

      {action.description && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <FormActionDescription description={action.description} control={form.control} />
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <ScrollArea className="max-h-[55vh] pr-3 -mr-3">
            <div className="flex flex-col gap-6">
              {hasArgs && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-medium">Pre-fill arguments</h3>
                    <p className="text-xs text-muted-foreground">
                      Select which arguments to bake into the shortcut. Anything
                      left out is asked for each time the shortcut runs.
                    </p>
                  </div>
                  <div className="flex flex-row flex-wrap gap-1.5">
                    {action.args.map((arg) => {
                      const selected = chosenArgs.includes(arg.key);
                      return (
                        <Badge
                          key={arg.key}
                          variant={selected ? "default" : "outline"}
                          onClick={() => {
                            setChosenArgs((chosenArgs) =>
                              chosenArgs.includes(arg.key)
                                ? chosenArgs.filter((k) => k !== arg.key)
                                : [...chosenArgs, arg.key],
                            );
                          }}
                          className="cursor-pointer select-none px-2.5 py-1"
                        >
                          {arg.label || arg.key}
                        </Badge>
                      );
                    })}
                  </div>
                  {chosenArgs.length > 0 && (
                    <div className="rounded-md border bg-background/60 p-3">
                      <ArgsContainer
                        registry={registry}
                        groups={action.portGroups || []}
                        ports={chosenPorts}
                        options={{ layout: "stack" }}
                        path={[]}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <StringField
                  name="name"
                  label="Name"
                  description="The name of the shortcut"
                />

                <IntField
                  name="bindNumber"
                  label="Bind a shortcut key"
                  description="A number (0-9) to bind this shortcut to. Press that key to run it instantly."
                />

                <SwitchField
                  name="allowQuick"
                  label="Allow Quick"
                  description="Quick access runs this shortcut without any confirmation"
                />
              </div>

              <RoleGuard require={REKUEST_ADMIN}>
                <div className="flex flex-col gap-4">
                  <SwitchField
                    name="pin"
                    label="Pin it"
                    description="Everyone sees the shortcut; for whoever you pick here it is pinned and cannot be unpinned."
                  />
                  {form.watch("pin") ? <ShortcutBindingFields /> : null}
                </div>
              </RoleGuard>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Shortcut"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
};
