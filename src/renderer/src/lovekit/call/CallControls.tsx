import { useDialog } from "@/core/dialogs/registry";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { useLocalParticipant } from "@livekit/components-react";
import { Mic, MicOff, PhoneOff, UserPlus, Video, VideoOff } from "lucide-react";

import { callStore, useCallState } from "./store";

/** Mic and camera toggles for the room in `RoomContext`. */
export const MediaToggles = ({ size = "icon" }: { size?: "icon" | "icon-sm" }) => {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  return (
    <>
      <TooltipButton
        size={size}
        variant={isMicrophoneEnabled ? "outline" : "destructive"}
        tooltip={isMicrophoneEnabled ? "Mute" : "Unmute"}
        aria-pressed={!isMicrophoneEnabled}
        aria-label={isMicrophoneEnabled ? "Mute" : "Unmute"}
        onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      >
        {isMicrophoneEnabled ? <Mic /> : <MicOff />}
      </TooltipButton>
      <TooltipButton
        size={size}
        variant={isCameraEnabled ? "outline" : "destructive"}
        tooltip={isCameraEnabled ? "Stop camera" : "Start camera"}
        aria-pressed={!isCameraEnabled}
        aria-label={isCameraEnabled ? "Stop camera" : "Start camera"}
        onClick={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
      >
        {isCameraEnabled ? <Video /> : <VideoOff />}
      </TooltipButton>
    </>
  );
};

/** Asks people in: their apps ring with the invitation. */
export const InviteButton = ({ callId, title, size = "icon" }: { callId: string; title: string; size?: "icon" | "icon-sm" }) => {
  const { openDialog } = useDialog();
  return (
    <TooltipButton
      size={size}
      variant="outline"
      tooltip="Invite people"
      aria-label="Invite people"
      onClick={() => openDialog("invitetocall", { call: { id: callId, title } }, { size: "medium" })}
    >
      <UserPlus />
    </TooltipButton>
  );
};

export const LeaveButton = ({ size = "icon" }: { size?: "icon" | "icon-sm" }) => (
  <TooltipButton
    size={size}
    variant="destructive"
    tooltip="Leave call"
    aria-label="Leave call"
    onClick={() => callStore.getState().leave()}
  >
    <PhoneOff />
  </TooltipButton>
);

/** The call's buttons, in its dock (`CallDock`): mic, camera, invite, leave. */
export const CallControls = () => {
  const call = useCallState((state) => state.call);
  if (!call) return null;
  return (
    <div className="flex items-center justify-center gap-2" data-testid="call-controls">
      <MediaToggles />
      <InviteButton callId={call.id} title={call.title} />
      <LeaveButton />
    </div>
  );
};
