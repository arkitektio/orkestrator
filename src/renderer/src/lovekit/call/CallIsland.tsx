import { RailIsland, RailIslandName, RailIslandRow } from "@/core/ui/rail/RailIsland";
import { RoomContext } from "@livekit/components-react";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { PanelRight, Phone } from "lucide-react";
import { useEffect, useState } from "react";

import { LeaveButton, MediaToggles } from "./CallControls";
import { useCallState } from "./store";
import { useOpenCall } from "./useOpenCall";

const clock = (since: number, now: number) => {
  const total = Math.max(0, Math.floor((now - since) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/** Ticks once a second while mounted. */
const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
};

/**
 * The call this window is in, as one row in the rail: its title and clock,
 * mute, camera and leave, wherever the user has navigated. Clicking the title
 * returns to the call page; "Open to the side" puts it beside the current one.
 */
export const CallIsland = () => {
  const call = useCallState((state) => state.call);
  const status = useCallState((state) => state.status);
  const room = useCallState((state) => state.room);
  const joinedAt = useCallState((state) => state.joinedAt);
  const openCall = useOpenCall();
  const now = useNow();

  return (
    <RailIsland show={!!call} islandKey="lovekit-call" testId="call-island" maxHeightClassName="max-h-[14vh]">
      {call && (
        <RailIslandRow key={call.id} working={status === "connecting"} testId="call-island-row">
          <button
            type="button"
            className="flex w-full min-w-0 items-center gap-2 text-left"
            onClick={() => openCall(call)}
            title="Open the call"
          >
            <Phone className="size-3.5 shrink-0 text-primary" />
            <RailIslandName name={call.title} working={status === "connected"} />
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {status === "connected" && joinedAt ? clock(joinedAt, now) : status === "error" ? "dropped" : "joining"}
            </span>
          </button>
          <div className="mt-1.5 flex items-center gap-1">
            {room && status === "connected" && (
              <RoomContext.Provider value={room}>
                <MediaToggles size="icon-sm" />
              </RoomContext.Provider>
            )}
            <TooltipButton
              size="icon-sm"
              variant="outline"
              tooltip="Open to the side"
              aria-label="Open the call to the side"
              onClick={() => openCall(call, { target: "side" })}
            >
              <PanelRight />
            </TooltipButton>
            <LeaveButton size="icon-sm" />
          </div>
        </RailIslandRow>
      )}
    </RailIsland>
  );
};
