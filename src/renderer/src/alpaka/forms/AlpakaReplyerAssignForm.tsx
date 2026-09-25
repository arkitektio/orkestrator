import { useDialog } from "@/app/dialog";
import { buildAssignInput } from "@/rekuest/assign";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ArgsContainer } from "@/components/ports/ArgsContainer";
import { useWidgetRegistry } from "@/lib/ports/WidgetsContext";
import { usePortForm } from "@/lib/ports/usePortForm";
import { useDetailActionQuery, PortKind } from "@/rekuest/api/graphql";
import { useCreateRoomMutation, useSendMessageMutation } from "@/alpaka/api/graphql";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { submittedDataToRekuestFormat } from "@/lib/ports/utils";
import { storeRoomTalkingAbout, toStructureInputs } from "../roomTalkingAbout";
import { useNavigate } from "react-router-dom";
import { AlpakaRoom } from "@/linkers";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const AlpakaReplyerAssignForm = (props: {
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
  const [createRoom] = useCreateRoomMutation();
  const [sendMessage] = useSendMessageMutation();
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
      // 1. Format talking about structures
      const talkingAbout = toStructureInputs(props.objects);

      if (props.objects.length > 0 && talkingAbout.length === 0) {
        throw new Error("None of the selected structures can be attached");
      }

      // 2. Create room
      const roomRes = await createRoom({
        variables: {
          input: {
            title: `Room: ${props.filter}`,
            description: `Auto-created room for replyer ${action?.name}`,
            talkingAbout,
          },
        },
      });

      const roomId = roomRes.data?.createRoom.id;
      if (!roomId) {
        throw new Error("Failed to create room");
      }

      // Store in talkingAbout helper
      if (talkingAbout.length > 0) {
        storeRoomTalkingAbout(roomId, talkingAbout);
      }

      // 3. Send the message
      const msgRes = await sendMessage({
        variables: {
          input: {
            text: props.filter || "",
            room: roomId,
            agentId: "default",
            attachStructures: talkingAbout,
          },
        },
      });

      const sentMessage = msgRes.data?.send;
      if (!sentMessage) {
        throw new Error("Failed to send message to room");
      }

      // 4. Format and submit data to Rekuest
      const formattedFormValues = submittedDataToRekuestFormat(data, action?.args as any);

      const assignArgs: Record<string, any> = {
        ...formattedFormValues,
        [messageKey]: {
          __identifier: "@alpaka/message",
          object: sentMessage.id,
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
      navigate(AlpakaRoom.linkBuilder(roomId));
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
