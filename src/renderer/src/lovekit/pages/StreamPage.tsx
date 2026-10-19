import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { LovekitAgent, LovekitStream } from "@/core/linkers";
import { InfoList } from "@/core/ui/info-list";
import { useGetStreamQuery } from "../api/graphql";
import { AgentApp, AgentUser, LiveDot, streamKindLabel } from "../components/agent";
import { StreamVideo } from "../components/StreamVideo";
import { LOVEKIT_HELP } from "../help";

export default asDetailQueryRoute(
  // Polled: whether it is live is LiveKit's, not something lovekit announces.
  (options: Parameters<typeof useGetStreamQuery>[0]) => useGetStreamQuery({ ...options, pollInterval: 15_000 }),
  ({ data }) => {
    const stream = data.stream;
    return (
      <LovekitStream.ModelPage
        help={LOVEKIT_HELP.stream}
        title={stream.title}
        object={stream}
        pageActions={<LovekitStream.ObjectButton alwaysShow object={stream} />}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Info">
              <div className="flex flex-col gap-3 p-3">
                <InfoList
                  rows={[
                    ["Live", <span className="flex items-center gap-1.5"><LiveDot live={stream.live} />{stream.live ? "Live" : "Offline"}</span>],
                    ["Kind", streamKindLabel(stream.kind)],
                    ["Key", <code className="text-xs">{stream.key}</code>],
                    [
                      "Agent",
                      <LovekitAgent.DetailLink object={stream.agent} className="hover:text-primary">
                        <AgentApp agent={stream.agent} />
                      </LovekitAgent.DetailLink>,
                    ],
                    ["Runs for", <AgentUser agent={stream.agent} />],
                  ]}
                />
                {stream.description && <p className="text-sm text-muted-foreground">{stream.description}</p>}
              </div>
            </Sidebars.Tab>
            <Sidebars.Tab label="Knowledge">
              <LovekitStream.Knowledge object={stream} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className="flex h-full w-full items-center justify-center bg-black">
          <StreamVideo stream={stream} />
        </div>
      </LovekitStream.ModelPage>
    );
  },
);
