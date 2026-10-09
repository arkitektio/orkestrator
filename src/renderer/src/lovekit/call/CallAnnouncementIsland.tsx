import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import { RailIsland, RailIslandName, RailIslandRow } from "@/core/ui/rail/RailIsland";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { PanelRight, Phone, Users, X } from "lucide-react";

import { callAnnouncementStore, useCallAnnouncements } from "./announcements";
import { useCallState } from "./store";
import { currentTopic, fromCallStructure } from "./structureInput";
import { useOpenCall } from "./useOpenCall";

/**
 * "Someone just started a call": one row in the rail per call the
 * organization started while the app was open, with a way in. Everyone may
 * join, so this is an offer and not a ring; it goes when the user joins,
 * puts it away, or the call ends. The store is `CallAnnouncementsWatcher`'s.
 */
export const CallAnnouncementIsland = () => {
  const announced = useCallAnnouncements((state) => state.calls);
  const joined = useCallState((state) => state.call?.id);
  const openCall = useOpenCall();
  // The call this window is in has its own row (`CallIsland`).
  const calls = announced.filter((call) => call.id !== joined);

  return (
    <RailIsland show={calls.length > 0} islandKey="lovekit-call-announcements" testId="call-announcement-island">
      {calls.map((call) => {
        const subject = currentTopic(call);
        return (
          <RailIslandRow key={call.id} working={false} testId="call-announcement">
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <RailIslandName name={call.title} working />
              <span className="flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
                <Users className="size-3" />
                {call.participantCount}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {call.creator ? (
                <StructureDisplay identifier="@lok/user" id={call.creator.sub} variant="inline" fallback={call.creator.preferredUsername} />
              ) : (
                "Someone"
              )}
              {" started a call"}
              {subject && (
                <>
                  {" about "}
                  <StructureDisplay {...fromCallStructure(subject)} variant="inline" fallback={subject.identifier} />
                </>
              )}
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              <Button size="xs" onClick={() => openCall(call, { join: true })}>
                <Phone /> Join
              </Button>
              <TooltipButton
                size="icon-sm"
                variant="outline"
                tooltip="Join to the side"
                aria-label="Join the call to the side"
                onClick={() => openCall(call, { join: true, target: "side" })}
              >
                <PanelRight />
              </TooltipButton>
              <Button
                size="xs"
                variant="ghost"
                className="ml-auto"
                onClick={() => callAnnouncementStore.getState().dismiss(call.id)}
              >
                <X /> Dismiss
              </Button>
            </div>
          </RailIslandRow>
        );
      })}
    </RailIsland>
  );
};
