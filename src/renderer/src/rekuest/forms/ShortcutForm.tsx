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
import { ErrorNote } from "@/core/ui/error-note";
import { Form } from "@/core/ui/form";
import { ActionDescription, FormActionDescription } from "@/core/ports/engine/ActionDescription";
import { RekuestShortcut } from "@/core/linkers";
import { ArgsContainer } from "@/core/ports/widgets/ArgsContainer";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import {
  useCreateShortcutMutation,
  useDetailActionQuery
} from "../api/graphql";
import { usePortForm } from "@/core/ports/engine/usePortForm";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";

const NO_PORTS: never[] = [];

export const ReserveForm = (props: {
  id: string;
  args?: { [key: string]: any };
  hidden?: { [key: string]: any };
}) => {
  const { data: actiondata } = useDetailActionQuery({
    variables: {
      id: props.id,
    },
  });

  const [create] = useCreateShortcutMutation();

  const action = actiondata?.action;

  const [chosenArgs, setChosenArgs] = React.useState<string[]>([]);

  // Every argument is in the form; only the chosen ones are mounted, and
  // only what is mounted is validated and saved.
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
      name: z.string().nonempty(),
      allowQuick: z.boolean().default(false),
    }),
  });

  const navigate = useNavigate();
  // Shown above the button: the form sits in a plain <Dialog>, which stays
  // open to try again.
  const [failure, setFailure] = React.useState<unknown>(null);

  const onSubmit = async (data: any) => {
    const { toolbox, name, allowQuick, ...rest } = data;

    setFailure(null);
    try {
      const res = await create({
        variables: {
          input: {
            name: name,
            action: props.id,
            args: rest,
            allowQuick: allowQuick,
          },
        },
      });
      if (res.data?.createShortcut?.id) {
        navigate(RekuestShortcut.linkBuilder(res.data?.createShortcut?.id));
      }
    } catch (error) {
      setFailure(error);
    }
  };

  const isValid = form.formState.isValid;

  const { registry } = useWidgetRegistry();

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{action?.name}</DialogTitle>
      </DialogHeader>

      <DialogDescription className="mt2">
        {action?.description && (
          <FormActionDescription description={action?.description} control={form.control} />
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 mt-4"
          >
            <div className="w-full flex flex-row items-center space-x-2 mt-2">
              {(action?.args.length ?? 0) > 0 &&
                action?.args.map((arg) => {
                  return (
                    <Badge
                      key={arg.key}
                      onClick={() => {
                        setChosenArgs((chosenArgs) =>
                          chosenArgs.includes(arg.key)
                            ? chosenArgs.filter((k) => k !== arg.key)
                            : [...chosenArgs, arg.key],
                        );
                      }}
                      className="p-2"
                    >
                      <div>{arg.label || arg.key}</div>
                    </Badge>
                  );
                })}
            </div>
            {action?.args.length == 0 && (
              <div className="text-muted"> No Arguments needed</div>
            )}
            <ArgsContainer
              registry={registry}
              groups={action?.portGroups || []}
              ports={chosenPorts}
              options={{ layout: "stack" }}
              path={[]}
            />

            <StringField
              name="name"
              label="Name"
              description="The name of the shortcut"
            />

            <SwitchField
              name="allowQuick"
              label="Allow Quick"
              description="Quick access will allow you to run this shortcut without any confirmation"
            />

            <ErrorNote error={failure} title="Couldn't create the shortcut" />
            <DialogFooter>
              <Button variant={"outline"} disabled={!isValid}>
                {" "}
                Reserve
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogDescription>
    </div>
  );
};

export const ReserveFormDialog = (props: {
  id: string;
  args?: { [key: string]: any };
}) => {
  const { data } = useDetailActionQuery({
    variables: {
      id: props.id,
    },
  });

  if (!data) {
    return <div>Loading...</div>;
  }

  const [, setChosenArgs] = React.useState<string[]>([]);

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{data?.action?.name}</DialogTitle>
      </DialogHeader>

      <DialogDescription className="mt2">
        {data?.action?.description && (
          <ActionDescription
            description={data.action?.description}
            variables={data}
          />
        )}
        {data?.action?.args.length == 0 && (
          <div className="text-muted"> No Arguments needed</div>
        )}

        <div className="text-xs">
          Choose your arguments that you want to preset
        </div>
        <div className="w-full flex flex-row items-center space-x-2 mt-2">
          {data?.action.args.length > 0 &&
            data?.action.args.map((arg) => {
              return (
                <Badge
                  key={arg.key}
                  onClick={() => {
                    setChosenArgs((chosenArgs) =>
                      chosenArgs.includes(arg.key)
                        ? chosenArgs.filter((k) => k !== arg.key)
                        : [...chosenArgs, arg.key],
                    );
                  }}
                  className="p-2"
                >
                  <div>{arg.key}</div>
                  <div>{arg.description}</div>
                </Badge>
              );
            })}
        </div>

        <DialogFooter>
          <Button variant={"outline"}> Reserve</Button>
        </DialogFooter>
      </DialogDescription>
    </div>
  );
};
