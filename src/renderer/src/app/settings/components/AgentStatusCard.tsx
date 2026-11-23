import { AgentCodeDisplay } from "@/core/agent/AgentCodeDisplay";
import { useAgentEngage } from "@/core/agent/AgentEngageToggle";
import { useAgentState } from "@/core/agent/store";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { Switch } from "@/core/ui/switch";
import type { ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { StatusLabel, type Tone } from "./StatusLabel";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[9rem_1fr] items-baseline gap-3 py-1.5 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0">{children}</dd>
  </div>
);

/** How many of the agent's last errors are listed. */
const ERRORS_SHOWN = 5;

/**
 * Settings → Connection: this app as an agent, the connection other apps reach the person at
 * this window through. Whether it is engaged and connected, why it dropped, and what it runs.
 */
export const AgentStatusCard = () => {
  const agent = useAgentEngage();
  const { assignments, connected, errors, lastCode, lastReason } = useAgentState(
    useShallow((state) => ({
      assignments: state.assignments,
      connected: state.connected,
      errors: state.errors,
      lastCode: state.lastCode,
      lastReason: state.lastReason,
    })),
  );

  if (!agent) {
    return (
      <Card data-testid="agent-status-card">
        <CardHeader>
          <CardTitle>Agent</CardTitle>
          <CardDescription>Only the main window runs the agent.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const status: { tone: Tone; label: string; pulse?: boolean } = !agent.engaged
    ? { tone: "muted", label: "Disengaged" }
    : connected
      ? { tone: "good", label: "Connected" }
      : lastCode !== undefined
        ? { tone: "warn", label: "Disconnected, trying again", pulse: true }
        : { tone: "warn", label: "Connecting", pulse: true };

  return (
    <Card data-testid="agent-status-card">
      <CardHeader>
        <CardTitle>Agent</CardTitle>
        <CardDescription>
          While engaged, apps you run can ask you here: approve a step, open an image. Disengaged,
          they find nobody here and say so instead of waiting.
        </CardDescription>
        <CardAction>
          <Switch
            checked={agent.engaged}
            onCheckedChange={agent.toggle}
            aria-label={agent.engaged ? "Disengage" : "Engage"}
            title={agent.label}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <Row label="Status">
            <StatusLabel tone={status.tone} pulse={status.pulse} className="text-sm">
              <span data-testid="agent-status">{status.label}</span>
            </StatusLabel>
          </Row>
          {agent.engaged && !connected && (lastCode !== undefined || lastReason) && (
            <Row label="Why">
              <span className="flex flex-col">
                {lastReason && <span>{lastReason}</span>}
                {lastCode !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    <AgentCodeDisplay code={lastCode} /> (code {lastCode})
                  </span>
                )}
              </span>
            </Row>
          )}
          <Row label="Running for others">
            {assignments.length === 0
              ? "Nothing"
              : assignments.map((assignment) => assignment.interface).join(", ")}
          </Row>
          {errors.length > 0 && (
            <Row label="Recent errors">
              <ul className="space-y-1">
                {errors.slice(-ERRORS_SHOWN).reverse().map((error, index) => (
                  <li key={index} className="break-words text-xs">
                    {error}
                  </li>
                ))}
              </ul>
            </Row>
          )}
        </dl>
      </CardContent>
    </Card>
  );
};
