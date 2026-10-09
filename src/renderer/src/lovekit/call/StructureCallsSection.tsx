import { Button } from "@/core/ui/button";
import { Spinner } from "@/core/ui/spinner";
import { TooltipButton } from "@/core/ui/tooltip-button";
import type { Identifier, Object } from "@/core/types";
import { useListCallsQuery } from "@/lovekit/api/graphql";
import { PanelBottom, Phone, Users } from "lucide-react";

import { useCallState } from "./store";
import { toStructureInput } from "./structureInput";
import { useOpenCall } from "./useOpenCall";
import { useStartCall } from "./useStartCall";

/**
 * The live calls about the object of any model page, in the host's Chat
 * sidebar beside the text conversations (a `chat` slot section). Each row
 * joins; without one there is a button to start the call.
 */
export const StructureCallsSection = ({ identifier, object }: { identifier: Identifier; object: Object }) => {
  const about = toStructureInput({ identifier, id: object.id });
  const active = useCallState((state) => state.call);
  const openCall = useOpenCall();
  const { start, starting, error } = useStartCall();
  const { data, loading } = useListCallsQuery({
    variables: { filter: { about: about ?? { identifier, object: -1 }, live: true } },
    skip: !about,
    pollInterval: 15_000,
    fetchPolicy: "cache-and-network",
  });

  // A structure without a numeric id cannot be called about.
  if (!about) return null;
  const calls = data?.calls ?? [];

  return (
    <div className="flex flex-col gap-2 p-2" data-testid="structure-calls">
      {calls.map((call) => {
        const inIt = active?.id === call.id;
        return (
          <div key={call.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5 text-xs">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{call.title}</span>
            <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
              <Users className="size-3" />
              {call.participantCount}
            </span>
            <Button size="xs" onClick={() => openCall(call, { join: !inIt })}>
              {inIt ? "Open" : "Join"}
            </Button>
            <TooltipButton
              size="icon-xs"
              variant="ghost"
              tooltip={inIt ? "Open to the side" : "Join to the side"}
              aria-label={inIt ? "Open the call to the side" : "Join the call to the side"}
              onClick={() => openCall(call, { join: !inIt, target: "side" })}
            >
              <PanelBottom />
            </TooltipButton>
          </div>
        );
      })}
      {calls.length === 0 && (
        <Button
          variant="outline"
          size="sm"
          className="justify-start"
          disabled={starting}
          onClick={() => void start([{ identifier, id: object.id }])}
          data-testid="start-call"
        >
          {starting || loading ? <Spinner className="size-3" /> : <Phone />}
          Start a call about this
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
