import { Button } from "@/core/ui/button";
import { Form } from "@/core/ui/form";
import { usePortForm } from "@/core/ports/engine/usePortForm";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { ArgsContainer } from "@/core/ports/widgets/ArgsContainer";
import { ArgPortFragment } from "@/rekuest/api/graphql";
import type { BlokArgs } from "./blokArgs";

/**
 * Asks for what a blok is opened for when the link did not say: the same form
 * an action's arguments get, over the blok's args. What is already known is
 * filled in and stays editable.
 */
export const BlokArgsForm = (props: {
  name: string;
  ports: ArgPortFragment[];
  args: BlokArgs;
  onOpen: (args: BlokArgs) => void;
}) => {
  const form = usePortForm({ ports: props.ports, overwrites: props.args });
  const { registry } = useWidgetRegistry();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Open {props.name}</h2>
        <p className="text-sm text-muted-foreground">Choose what to open it for.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => props.onOpen(data))} className="flex flex-col gap-4">
          <ArgsContainer registry={registry} ports={props.ports} groups={[]} path={[]} />
          <Button type="submit" className="self-end">
            Open
          </Button>
        </form>
      </Form>
    </div>
  );
};
