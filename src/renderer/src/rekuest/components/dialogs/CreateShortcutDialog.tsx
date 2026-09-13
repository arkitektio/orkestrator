import { portHash } from "@/rekuest/widgets/utils";
import { useDialog } from "@/app/dialog";
import { IntField } from "@/components/fields/IntField";
import { StringField } from "@/components/fields/StringField";
import { SwitchField } from "@/components/fields/SwitchField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FormActionDescription } from "@/lib/rekuest/ActionDescription";
import { notEmpty } from "@/lib/utils";
import { EffectWrapper } from "@/rekuest/widgets/EffectWrapper";
import { ArgsContainerProps } from "@/rekuest/widgets/tailwind";
import { Port, PortGroup } from "@/rekuest/widgets/types";
import React, { useMemo } from "react";
import * as z from "zod";
import {
  useCreateShortcutMutation,
  useDetailActionQuery,
} from "../../api/graphql";
import { usePortForm } from "../../hooks/usePortForm";
import { useWidgetRegistry } from "../../widgets/WidgetsContext";

export type FilledGroup = PortGroup & {
  filledPorts: Port[];
};

export { portHash };

export const NanaContainer = () => {
  return (
    <div className="grid @lg:grid-cols-2 @lg:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6 gap-5">
      {" "}
    </div>
  );
};

const ArgsContainer = ({
  ports,
  groups,
  options,
  registry,
  hidden,
  bound,
  path,
}: ArgsContainerProps) => {
  const hash = portHash(ports.filter(notEmpty));

  const filledGroups = useMemo(() => {
    if (!groups || groups.length === 0) {
      groups = [
        {
          key: "default",
          ports: ports.filter(notEmpty).map((p) => p.key),
        },
      ];
    }

    const argGroups: FilledGroup[] = groups.filter(notEmpty).map((g) => ({
      ...g,
      filledPorts: ports
        .filter(notEmpty)
        .filter((x) => g.ports.includes(x?.key)),
    }));

    return argGroups;
  }, [ports, hash]);

  const len = 1;

  const lg_size = len < 2 ? len : 2;
  const xl_size = len < 3 ? len : 3;
  const xxl_size = len < 4 ? len : 4;
  const xxxl_size = len < 5 ? len : 5;
  const xxxxl_size = len < 6 ? len : 6;

  return (
    <div
      className={`grid @lg:grid-cols-${lg_size} @xl:grid-cols-${xl_size} @2xl:grid-cols-${xxl_size}  @3xl:grid-cols-${xxxl_size}   @5xl:grid-cols-${xxxxl_size} gap-5 `}
    >
      {filledGroups.map((group, index) => {
        return (
          <Collapsible key={index} className="@container" defaultOpen={true}>
            {group.key != "default" && (
              <div className="mb-2">
                <CollapsibleTrigger className="text-xs">
                  {group.key}
                </CollapsibleTrigger>
                <p className="text-muted-foreground text-xs">
                  {group.description}
                </p>
              </div>
            )}
            <CollapsibleContent>
              {group.filledPorts.map((port, index) => {
                const Widget = registry.getInputWidgetForPort(port);
                if (hidden && hidden[port.key]) return null;
                if (!port.widget) return null;

                return (
                  <div className="w-full flex flex-row items-center space-x-2">
                    <div className="flex-grow">
                      <EffectWrapper
                        key={index}
                        effects={port.effects || []}
                        port={port}
                        path={[...path, port.key]}
                        registry={registry}
                      >
                        <Widget
                          key={index}
                          port={port}
                          bound={bound}
                          widget={port.widget}
                          options={options}
                          path={[...path, port.key]}
                        />
                      </EffectWrapper>
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

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

  const form = usePortForm({
    ports: action?.args.filter((arg) => chosenArgs.includes(arg.key)) || [],
    overwrites: { ...props.args, name: action?.name },
    additionalSchema: z.object({
      toolbox: z.string().optional(),
      name: z.string().nonempty(),
      allowQuick: z.boolean().default(false),
      bindNumber: z.coerce.number().int().min(0).max(9).optional(),
    }),
  });

  const onSubmit = async (data: any) => {
    console.log("Submitting");

    const { toolbox, name, allowQuick, bindNumber, ...rest } = data;

    await create({
      variables: {
        input: {
          name: name,
          action: props.id,
          toolbox: toolbox || null,
          args: rest,
          bindNumber: bindNumber,
          allowQuick: allowQuick,
        },
      },
    }).then(
      () => {
        closeDialog();
      },
      (err) => {
        console.log(err);
      },
    );
  };

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
                        ports={action.args.filter((arg) =>
                          chosenArgs.includes(arg.key),
                        )}
                        hidden={props.args}
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
