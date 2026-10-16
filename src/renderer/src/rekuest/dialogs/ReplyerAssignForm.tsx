import { useOperation } from "@/core/modules/hooks/useOperation";
import { smartRegistry } from "@/core/smart/registry";
import { PortKind, useDetailActionQuery } from "@/rekuest/api/graphql";
import { assignErrorMessage } from "@/rekuest/lib/assignError";
import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AssignForm } from "../forms/assign/AssignForm";

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
  // The same query the form runs: answered from the cache.
  const { data } = useDetailActionQuery({ variables: { id: props.actionId } });
  const action = data?.action;

  const navigate = useNavigate();
  const startRoom = useOperation<{ roomId: string; messageId: string }>("alpaka.startRoom");
  // The room `prepareArgs` opened, for the navigation once the assign starts.
  const roomRef = useRef<string | null>(null);

  const messageKey = useMemo(
    () =>
      action?.args.find(
        (arg) => arg.kind === PortKind.Structure && arg.identifier === "@alpaka/message",
      )?.key,
    [action],
  );

  // The message does not exist yet: a stand-in passes validation, and
  // `prepareArgs` puts the real one in its place.
  const placeholder = useMemo(
    () =>
      messageKey
        ? { [messageKey]: { __identifier: "@alpaka/message", object: "dummy" } }
        : undefined,
    [messageKey],
  );

  const prepareArgs = async (args: Record<string, unknown>) => {
    if (!messageKey) {
      throw new Error("Message argument not found in action ports");
    }
    // Alpaka opens the room about the selection and posts the message.
    const { roomId, messageId } = await startRoom({
      title: `Room: ${props.filter}`,
      description: `Auto-created room for replyer ${action?.name}`,
      text: props.filter || "",
      about: props.objects.map((object: { identifier: string; id: string }) => ({
        identifier: object.identifier,
        id: object.id,
      })),
    });
    roomRef.current = roomId;
    return {
      ...args,
      [messageKey]: { __identifier: "@alpaka/message", object: messageId },
    };
  };

  return (
    <AssignForm
      target={{ action: props.actionId }}
      args={placeholder}
      hidden={placeholder}
      prefillLatest={false}
      submitLabel="Start & Reply"
      prepareArgs={prepareArgs}
      onError={(error) => props.onError?.(assignErrorMessage(error))}
      onAssigned={() => {
        props.onDone?.({ kind: "local" });
        const roomPath = roomRef.current
          ? smartRegistry.buildModelPath("@alpaka/room", roomRef.current)
          : null;
        if (roomPath) navigate(roomPath.startsWith("/") ? roomPath : `/${roomPath}`);
      }}
    />
  );
};
