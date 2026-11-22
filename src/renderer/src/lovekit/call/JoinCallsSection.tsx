import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { HomeSection } from "@/core/layout/ModuleHome";
import { Button } from "@/core/ui/button";
import { useListCallsQuery } from "@/lovekit/api/graphql";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { PanelRight, Phone, Users } from "lucide-react";

import { useCallState } from "./store";
import { currentTopic, fromCallStructure } from "./structureInput";
import { useOpenCall } from "./useOpenCall";

/**
 * "Join calls": every call in progress in the organization, on the
 * home page (lovekit's `home` slot section on `@lok/user`). No invitation is
 * needed to get in; an invitation only rings. Nothing while no call is on:
 * a call is started from an object's menu ("Call about this"), not here.
 */
export const JoinCallsSection = () => {
  const active = useCallState((state) => state.call);
  const openCall = useOpenCall();
  const { data } = useListCallsQuery({
    variables: { filter: { live: true }, pagination: { limit: 10 } },
    fetchPolicy: "cache-and-network",
  });
  const calls = data?.calls ?? [];
  if (calls.length === 0) return null;

  return (
    <HomeSection title="Join calls">
      <div className="grid gap-2 xl:grid-cols-2" data-testid="join-calls">
        {calls.map((call) => {
          const subject = currentTopic(call);
          const inIt = active?.id === call.id;
          return (
            <div key={call.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2" data-testid="join-call">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{call.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {call.creator ? (
                    <StructureDisplay identifier="@lok/user" id={call.creator.sub} variant="inline" fallback={call.creator.preferredUsername} />
                  ) : (
                    "Someone"
                  )}
                  {subject && (
                    <>
                      {" · about "}
                      <StructureDisplay {...fromCallStructure(subject)} variant="inline" fallback={subject.identifier} />
                    </>
                  )}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3" />
                {call.participantCount}
              </span>
              <Button size="sm" variant={inIt ? "outline" : "default"} onClick={() => openCall(call, { join: !inIt })}>
                <Phone /> {inIt ? "Open" : "Join"}
              </Button>
              <TooltipButton
                size="icon-sm"
                variant="ghost"
                tooltip={inIt ? "Open to the side" : "Join to the side"}
                aria-label={inIt ? "Open the call to the side" : "Join the call to the side"}
                onClick={() => openCall(call, { join: !inIt, target: "side" })}
              >
                <PanelRight />
              </TooltipButton>
            </div>
          );
        })}
      </div>
    </HomeSection>
  );
};
