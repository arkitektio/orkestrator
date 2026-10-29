import { RekuestAgent, RekuestMemoryShelve, RekuestSpace, RekuestState } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Badge } from "@/core/ui/badge";
import { CopyButton } from "@/core/ui/copy-button";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import type { ReactNode } from "react";
import { AgentKind, type AgentFragment } from "../api/graphql";
import { CopyAgentPythonButton } from "../components/copy-agent-python";

const KIND_LABEL: Record<AgentKind, string> = {
  [AgentKind.Websocket]: "Websocket",
  [AgentKind.Webhook]: "Webhook",
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <div className="text-xs font-semibold">{title}</div>
    {children}
  </div>
);

/** One of the agent's own sub-pages, as a quiet link. */
const SubpageLink = ({
  agent,
  subroute,
  children,
}: {
  agent: AgentFragment;
  subroute: string;
  children: ReactNode;
}) => (
  <RekuestAgent.DetailLink
    object={agent}
    subroute={subroute}
    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
  >
    {children}
  </RekuestAgent.DetailLink>
);

/** A muted label and its value, aligned with every other row in the rail. */
const Row = ({ label, children, title }: { label: string; children: ReactNode; title?: string }) => (
  <div className="flex min-w-0 items-baseline gap-2" title={title}>
    <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className="min-w-0 truncate text-xs">{children}</span>
  </div>
);

/**
 * What the agent IS: who declared it, whether it is reachable, which app and
 * client it runs as, whose it is and what it holds. All from the page's own
 * query, so it costs nothing to show — the agent page's counterpart of the
 * dataset page's `DatasetFacts`.
 *
 * A fragment's worth of sections with no container of its own: the caller
 * decides the column, the padding and what sits beside it. A row with nothing
 * to say is left out rather than shown empty.
 */
export const AgentFacts = ({ agent }: { agent: AgentFragment }) => {
  const release = agent.client.release;
  const deviceId = agent.client.device?.deviceId;
  const space = agent.placements.at(0)?.space;
  const renamed = agent.declaredName && agent.declaredName !== agent.name;
  const holds = agent.states.length > 0 || agent.memoryShelve || space;

  return (
    <>
      <div className="flex flex-col gap-1">
        {/* `break-all` like the dataset name: an agent name is often one long
            token (an app identifier), which word-wrap would not break. */}
        <h2 className="break-all text-lg font-semibold">{agent.name}</h2>
        {renamed && (
          <div className="text-xs text-muted-foreground">
            Declared as <span className="font-mono">{agent.declaredName}</span>
          </div>
        )}
        {agent.description && (
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        )}
      </div>

      <Section title="Status">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              agent.connected ? "bg-green-500" : "bg-red-500",
            )}
          />
          <span className="font-medium">{agent.connected ? "Online" : "Offline"}</span>
          {agent.lastSeen && (
            <span className="text-muted-foreground">
              seen <Timestamp date={agent.lastSeen} relative />
            </span>
          )}
        </div>
        {(agent.blocked || agent.pinned || agent.active !== agent.connected) && (
          <div className="flex flex-wrap gap-1 pt-1">
            {agent.blocked && (
              <Badge variant="destructive" className="text-[10px]">
                Blocked
              </Badge>
            )}
            {agent.pinned && (
              <Badge variant="outline" className="text-[10px]">
                Pinned
              </Badge>
            )}
            {agent.active !== agent.connected && (
              <Badge
                variant="outline"
                className="text-[10px]"
                title="Marked active but not connected, or the other way round"
              >
                Mismatch
              </Badge>
            )}
          </div>
        )}
      </Section>

      <Section title="Runs as">
        {release && (
          <Row label="App">
            <span className="font-mono">{release.app.identifier}</span>
            <span className="text-muted-foreground"> · v{release.version}</span>
          </Row>
        )}
        <Row label="Client">
          <StructureDisplay
            identifier="@lok/client"
            by="clientId"
            id={agent.client.clientId}
            variant="inline"
          />
        </Row>
        {deviceId && (
          <Row label="Device" title={deviceId}>
            <span className="font-mono">{deviceId}</span>
          </Row>
        )}
        <Row label="Kind">{KIND_LABEL[agent.kind] ?? agent.kind}</Row>
        {agent.supervisor && (
          <Row
            label="Supervisor"
            title="Self-declared by the agent; its supervisor checks before acting on it"
          >
            <span className="font-mono">{agent.supervisor}</span>
          </Row>
        )}
      </Section>

      <Section title="Owner">
        <Row label="User">
          <StructureDisplay identifier="@lok/user" id={agent.user.sub} variant="inline" />
        </Row>
        <Row label="Installed">
          <Timestamp date={agent.installedAt} relative />
        </Row>
      </Section>

      <Section title="Provides">
        <Row label="Actions">{agent.implementations.length}</Row>
      </Section>

      {/* The agent's own sub-pages: they stand in for the header links. */}
      <Section title="Pages">
        <Row label="Tasks">
          <SubpageLink agent={agent} subroute="tasks">
            Show tasks
          </SubpageLink>
        </Row>
        <Row label="States">
          <SubpageLink agent={agent} subroute="states">
            Show states
          </SubpageLink>
        </Row>
        <Row label="Bloks">
          <SubpageLink agent={agent} subroute="bloks">
            Show bloks
          </SubpageLink>
        </Row>
        <Row label="Python">
          <CopyAgentPythonButton agent={agent} />
        </Row>
      </Section>

      {holds && (
        <Section title="Holds">
          {agent.states.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.states.map((state) => (
                <RekuestState.DetailLink
                  key={state.id}
                  object={state}
                  className="rounded-full border px-2 py-0.5 text-[10px] hover:bg-accent"
                >
                  {state.definition.name}
                </RekuestState.DetailLink>
              ))}
            </div>
          )}
          {agent.memoryShelve && (
            <Row label="Memory">
              <RekuestMemoryShelve.DetailLink object={agent.memoryShelve} className="hover:underline">
                Memory shelf
              </RekuestMemoryShelve.DetailLink>
            </Row>
          )}
          {space && (
            <Row label="Placed in">
              <RekuestSpace.DetailLink object={space} className="hover:underline">
                {space.name}
              </RekuestSpace.DetailLink>
            </Row>
          )}
        </Section>
      )}

      <Section title="Hash">
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={agent.hash}>
            {agent.hash}
          </span>
          <CopyButton value={agent.hash} title="Copy hash" />
        </div>
      </Section>
    </>
  );
};

export default AgentFacts;
