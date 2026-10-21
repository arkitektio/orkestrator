import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { usePortForm } from "@/core/ports/engine/usePortForm";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { ArgsContainer } from "@/core/ports/widgets/ArgsContainer";
import { ArgPortFragment } from "@/rekuest/api/graphql";
import { useMemo } from "react";
import type { BlokArgs } from "./blokArgs";

/**
 * Asks for what a blok is opened for when the link did not say: the same form
 * an action's arguments get, over the blok's args. What is already known is
 * filled in and stays editable, except what `hidden` gives (the selection it
 * was opened from), which is shown as prefilled and opened with as it is.
 */
export const BlokArgsForm = (props: {
  name: string;
  ports: ArgPortFragment[];
  args: BlokArgs;
  hidden?: BlokArgs;
  onOpen: (args: BlokArgs) => void;
  /** Back without opening anew (reinstantiating a blok that is already open). */
  onCancel?: () => void;
  layout?: "page" | "dialog";
}) => {
  const { hidden } = props;
  const overwrites = useMemo(() => ({ ...props.args, ...hidden }), [props.args, hidden]);
  const form = usePortForm({ ports: props.ports, overwrites });
  const { registry } = useWidgetRegistry();
  const hiddenKeys = useMemo(
    () => hidden && Object.fromEntries(Object.entries(hidden).map(([key, value]) => [key, value != null])),
    [hidden],
  );
  const dialog = props.layout === "dialog";

  const fields = (
    <ArgsContainer
      registry={registry}
      ports={props.ports}
      groups={[]}
      path={[]}
      hidden={hiddenKeys}
      options={dialog ? { layout: "stack" } : undefined}
    />
  );
  const submit = form.handleSubmit((data) => props.onOpen({ ...data, ...hidden }));

  if (dialog) {
    return (
      <Form {...form}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Open {props.name}</DialogTitle>
            <DialogDescription>It needs a bit more to open.</DialogDescription>
          </DialogHeader>
          {fields}
          <DialogFooter>
            <Button type="submit">Open</Button>
          </DialogFooter>
        </form>
      </Form>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Open {props.name}</h2>
        <p className="text-sm text-muted-foreground">Choose what to open it for.</p>
      </div>
      <Form {...form}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {fields}
          <div className="flex justify-end gap-2">
            {props.onCancel && (
              <Button type="button" variant="ghost" onClick={props.onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit">Open</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
