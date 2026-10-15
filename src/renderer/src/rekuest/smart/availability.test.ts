// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AgentKind } from "@/rekuest/api/graphql";
import { actionAvailability, canTakeWork, needsAgentChoice } from "./actions";

describe("row availability", () => {
  it("an action can run when the server says an agent for it is connected", () => {
    expect(actionAvailability({ assignable: true })).toBeNull();
    expect(actionAvailability({ assignable: false })).toEqual({ reason: "No agent for it is online" });
  });

  it("an implementation's agent can take work when it is live or a webhook", () => {
    expect(canTakeWork({ kind: AgentKind.Websocket, active: true })).toBe(true);
    expect(canTakeWork({ kind: AgentKind.Webhook, active: false })).toBe(true);
    expect(canTakeWork({ kind: AgentKind.Websocket, active: false })).toBe(false);
  });

  it("only a stateful action more than one agent could take asks which", () => {
    expect(needsAgentChoice({ stateful: true, liveImplementations: 2 })).toBe(true);
    expect(needsAgentChoice({ stateful: true, liveImplementations: 1 })).toBe(false);
    expect(needsAgentChoice({ stateful: false, liveImplementations: 3 })).toBe(false);
  });
});
