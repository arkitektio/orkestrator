import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { LovekitCall } from "@/core/linkers";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { useGetCallQuery } from "../api/graphql";
import { CallPanel } from "../call/CallPanel";
import { JOIN_PARAM } from "../call/links";
import { useCallState } from "../call/store";
import { fromCallStructure } from "../call/structureInput";
import { useJoinCall } from "../call/useJoinCall";
import { LOVEKIT_HELP } from "../help";

/**
 * The call's page: the room itself, and what it is about in the sidebar.
 * The host's Chat tab stays on, so the text conversation beside the call is
 * an ordinary room about it.
 */
export default asDetailQueryRoute(useGetCallQuery, ({ data }) => {
  const call = data.call;
  const [params, setParams] = useSearchParams();
  const active = useCallState((state) => state.call);
  const { join } = useJoinCall();
  const joined = useRef(false);

  // `?join=1` connects on arrival (the action, the invite link); once, and
  // the parameter goes so a reload does not rejoin by itself.
  useEffect(() => {
    if (params.get(JOIN_PARAM) !== "1" || joined.current) return;
    joined.current = true;
    if (active?.id !== call.id) void join({ id: call.id, title: call.title });
    const next = new URLSearchParams(params);
    next.delete(JOIN_PARAM);
    setParams(next, { replace: true });
  }, [params, setParams, active?.id, call.id, call.title, join]);

  return (
    <LovekitCall.ModelPage
      help={LOVEKIT_HELP.call}
      title={call.title}
      object={call}
      pageActions={<LovekitCall.ObjectButton alwaysShow object={call} />}
      sidebars={
        <Sidebars sidebarKey="LovekitCall" defaultTab="About">
          <Sidebars.Tab label="About">
            <div className="flex flex-col gap-2 p-2">
              {call.about.map((structure) => (
                <StructureDisplay
                  key={`${structure.identifier}-${structure.object}`}
                  {...fromCallStructure(structure)}
                  variant="card"
                  link
                  fallback={
                    <p className="text-xs text-muted-foreground">
                      {structure.identifier} {structure.object}
                    </p>
                  }
                />
              ))}
              {call.about.length === 0 && <p className="text-xs text-muted-foreground">About nothing in particular.</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Started by {call.creator?.preferredUsername ?? "someone"}.
              </p>
            </div>
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col">
        <CallPanel call={call} />
      </div>
    </LovekitCall.ModelPage>
  );
});
