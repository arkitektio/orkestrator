import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { Separator } from "@/core/ui/separator";
import { useListCallsQuery } from "@/lovekit/api/graphql";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { PanelRight, Phone, Users } from "lucide-react";

import { useCallState } from "./store";
import { currentTopic, fromCallStructure } from "./structureInput";
import { useOpenCall } from "./useOpenCall";

/**
 * "Join calls": every call in progress in the organization, on each
 * member's home page (lovekit's `home` slot section on `@lok/user`). No
 * invitation is needed to get in; an invitation only rings.
 */
export const JoinCallsSection = () => {
  const active = useCallState((state) => state.call);
  const openCall = useOpenCall();
  const { data } = useListCallsQuery({
    variables: { filter: { live: true }, pagination: { limit: 10 } },
    pollInterval: 15_000,
    fetchPolicy: "cache-and-network",
  });
  const calls = data?.calls ?? [];

  return (
    <>
      <div data-testid="join-calls">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Join calls</CardTitle>
          </div>
          <CardDescription>Calls your team has in progress. Anyone in the organization can join.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {calls.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No call right now. Start one from any object’s menu with “Call about this”.
            </p>
          )}
          {calls.map((call) => {
            const subject = currentTopic(call);
            const inIt = active?.id === call.id;
            return (
              <div key={call.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2" data-testid="join-call">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
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
        </CardContent>
      </div>
      <Separator />
    </>
  );
};
