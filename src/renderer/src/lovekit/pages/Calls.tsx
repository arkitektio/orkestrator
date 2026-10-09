import { Explainer } from "@/core/layout/Explainer";
import { ListRender } from "@/core/layout/ListRender";
import { LovekitCall } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";

import { useListCallsQuery } from "../api/graphql";
import { callLink } from "../call/links";
import { useCallState } from "../call/store";
import { LOVEKIT_HELP } from "../help";

/** The organization's calls in progress. */
const CallsPage = () => {
  const active = useCallState((state) => state.call);
  const { data, refetch } = useListCallsQuery({
    variables: { filter: { live: true }, pagination: { limit: 30 } },
    pollInterval: 15_000,
    fetchPolicy: "cache-and-network",
  });

  return (
    <LovekitCall.ListPage help={LOVEKIT_HELP.calls} title="Calls">
      <div className="p-3">
        <Explainer
          title="Calls"
          description="Video calls with your team about an object. Start one from any object's menu with “Call about this”; the ones in progress are listed here."
        />
        <ListRender array={data?.calls} title={<div className="text-lg font-semibold">In progress</div>} refetch={refetch}>
          {(call) => (
            <LovekitCall.Smart key={call.id} object={call}>
              <Link
                to={callLink(call.id, { join: active?.id !== call.id })}
                className="flex h-20 flex-col justify-between rounded-lg border border-border/60 bg-card px-3 py-2 hover:bg-muted/60"
              >
                <span className="truncate font-medium">{call.title}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3" />
                  {call.participantCount} ·{" "}
                  {call.creator ? (
                    <StructureDisplay identifier="@lok/user" id={call.creator.sub} variant="inline" fallback={call.creator.preferredUsername} />
                  ) : (
                    "someone"
                  )}
                </span>
              </Link>
            </LovekitCall.Smart>
          )}
        </ListRender>
      </div>
    </LovekitCall.ListPage>
  );
};

export default CallsPage;
