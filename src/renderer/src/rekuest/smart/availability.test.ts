// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AgentKind } from "@/rekuest/api/graphql";
import { directAssignTarget } from "@/rekuest/assign";
import { actionAvailability, canTakeWork, needsAgentChoice } from "./actions";

const on = (id: string, active: boolean) => ({ id, agent: { kind: AgentKind.Websocket, active } });

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

  it("a stateful action runs on the one implementation that can take it, a stateless one by action", () => {
    expect(directAssignTarget({ id: "a", stateful: false, implementations: [on("i1", true)] })).toEqual({ action: "a" });
    // One live out of several registered: that one, nobody is asked.
    expect(directAssignTarget({ id: "a", stateful: true, implementations: [on("i1", false), on("i2", true)] })).toEqual({
      implementation: "i2",
    });
  });

  it("a stateful action none or several could take has no direct target: the caller asks which", () => {
    expect(directAssignTarget({ id: "a", stateful: true, implementations: [on("i1", true), on("i2", true)] })).toBeNull();
    expect(directAssignTarget({ id: "a", stateful: true, implementations: [on("i1", false)] })).toBeNull();
  });
});
