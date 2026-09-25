import { useDialog } from "@/core/dialogs/registry";
import { buildAssignInput } from "@/rekuest/assign";
import { Button } from "@/core/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { ArgsContainer } from "@/core/components/ports/ArgsContainer";
import { useWidgetRegistry } from "@/core/lib/ports/WidgetsContext";
import { usePortForm } from "@/core/lib/ports/usePortForm";
import { useDetailActionQuery, PortKind } from "@/rekuest/api/graphql";
import { useOperation } from "@/core/modules/hooks/useOperation";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { submittedDataToRekuestFormat } from "@/core/lib/ports/utils";
import { smartRegistry } from "@/core/providers/smart/registry";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMemo, useState } from "react";

/**
 * Start a "replyer": a rekuest action that answers an alpaka message. Alpaka
 * opens the room and posts the first message (its `alpaka.startRoom`
 * operation); rekuest then assigns the action with that message.
 */
export const ReplyerAssignForm = (props: {
  actionId: string;
  filter: string;
  objects: any[];
  onDone?: (event: any) => void;
  onError?: (error: string) => void;
}) => {
  const { data: actionDetailData } = useDetailActionQuery({
    variables: {
      id: props.actionId,
    },
  });
  const action = actionDetailData?.action;

  const dialog = useDialog();
  const navigate = useNavigate();
  const startRoom = useOperation<{ roomId: string; messageId: string }>("alpaka.startRoom");
  const { assign } = useAssign();
  const { registry } = useWidgetRegistry();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const messageArg = useMemo(() => {
    return action?.args.find(
      (arg) =>
        arg.kind === PortKind.Structure &&
        arg.identifier === "@alpaka/message"
    );
  }, [action]);
  const messageKey = messageArg?.key;

  const hiddenArgs = useMemo(() => {
    if (messageKey) {
      return { [messageKey]: true };
    }
    return {};
  }, [messageKey]);

  const formOverwrites = useMemo(() => {
    if (messageKey) {
      return {
        [messageKey]: {
          __identifier: "@alpaka/message",
          object: "dummy",
        },
      };
    }
    return {};
  }, [messageKey]);

  const form = usePortForm({
    ports: (action?.args || []) as any,
    overwrites: formOverwrites,
  });

  const onSubmit = async (data: any) => {
    if (!messageKey) {
      toast.error("Message argument not found in action ports");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1–3. Alpaka opens the room about the selection and posts the message.
      const { roomId, messageId } = await startRoom({
        title: `Room: ${props.filter}`,
        description: `Auto-created room for replyer ${action?.name}`,
        text: props.filter || "",
        about: props.objects.map((object: { identifier: string; id: string }) => ({
          identifier: object.identifier,
          id: object.id,
        })),
      });

      // 4. Format and submit data to Rekuest
      const formattedFormValues = submittedDataToRekuestFormat(data, action?.args as any);

      const assignArgs: Record<string, any> = {
        ...formattedFormValues,
        [messageKey]: {
          __identifier: "@alpaka/message",
          object: messageId,
        },
      };

      // 5. Trigger the task
      toast.info(`Assigning action ${action?.name}...`);
      await assign(buildAssignInput({
        action: props.actionId,
        args: assignArgs,
      }));
      toast.success("Action assigned successfully");

      props.onDone?.({ kind: "local" });
      dialog.closeDialog();
      const roomPath = smartRegistry.buildModelPath("@alpaka/room", roomId);
      if (roomPath) navigate(roomPath.startsWith("/") ? roomPath : `/${roomPath}`);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "An error occurred";
      toast.error(msg);
      props.onError?.(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = form.formState.isValid;

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Configure Replyer: {action?.name}</DialogTitle>
      </DialogHeader>
      <DialogDescription className="mt-2">
        {action?.description}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 mt-4 text-foreground"
          >
            <ArgsContainer
              registry={registry}
              groups={action?.portGroups || []}
              ports={action?.args || []}
              hidden={hiddenArgs}
              path={[]}
            />

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={dialog.closeDialog} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting ? "Starting..." : "Start & Reply"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogDescription>
    </div>
  );
};
