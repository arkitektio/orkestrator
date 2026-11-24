import { describe, expect, it } from "vitest";
import { AgentKind } from "@/rekuest/api/graphql";
import {
  firstReplyerSelection,
  implementationAgentName,
  implementationApp,
  orderedImplementations,
  replyerAssignTarget,
  replyerMatches,
  type ReplyerImplementation,
} from "./replyerTargets";

const implementation = (
  id: string,
  { active = true, app = "llm-agent", name = app, kind = AgentKind.Websocket } = {},
): ReplyerImplementation => ({
  id,
  interface: "reply",
  agent: {
    id: `agent-${id}`,
    name,
    kind,
    active,
    connected: active,
    app: { identifier: app },
    release: { version: "1.2.0" },
    device: { deviceId: `device-${id}` },
  },
});

const replyer = (id: string, implementations: ReplyerImplementation[], stateful = false) => ({
  id,
  name: `Replyer ${id}`,
  stateful,
  implementations,
});

describe("the implementations a replyer offers", () => {
  it("lists the ones that can answer now first", () => {
    const offline = implementation("1", { active: false });
    const live = implementation("2");
    expect(orderedImplementations({ implementations: [offline, live] })).toEqual([live, offline]);
  });

  it("counts a webhook agent as able to answer", () => {
    const hook = implementation("1", { active: false, kind: AgentKind.Webhook });
    expect(firstReplyerSelection([replyer("a", [hook])])).toEqual({ action: "a", implementation: "1" });
  });
});

describe("what the chat picks for the user", () => {
  it("is the first replyer with an implementation that can answer, and that implementation", () => {
    const picked = firstReplyerSelection([
      replyer("a", [implementation("1", { active: false })]),
      replyer("b", [implementation("2", { active: false }), implementation("3")]),
    ]);
    expect(picked).toEqual({ action: "b", implementation: "3" });
  });

  it("is the first replyer, with none named, when none can answer", () => {
    expect(firstReplyerSelection([replyer("a", [implementation("1", { active: false })])])).toEqual({
      action: "a",
    });
  });

  it("is nothing without replyers", () => {
    expect(firstReplyerSelection([])).toBeUndefined();
  });
});

describe("where a reply is sent", () => {
  it("is the implementation picked", () => {
    const action = replyer("a", [implementation("1"), implementation("2")]);
    expect(replyerAssignTarget(action, "2")).toEqual({ implementation: "2" });
  });

  it("goes by action when the picked one is no longer the replyer's", () => {
    const action = replyer("a", [implementation("1")]);
    expect(replyerAssignTarget(action, "gone")).toEqual({ action: "a" });
  });

  it("is for the user to say for a stateful replyer several agents could take", () => {
    const action = replyer("a", [implementation("1"), implementation("2")], true);
    expect(replyerAssignTarget(action, undefined)).toBeNull();
  });
});

describe("how an implementation reads", () => {
  it("names its app and release", () => {
    expect(implementationApp(implementation("1", { app: "ollama" }))).toBe("ollama v1.2.0");
  });

  it("names its agent only when that says more than the app", () => {
    expect(implementationAgentName(implementation("1", { app: "ollama" }))).toBeUndefined();
    expect(implementationAgentName(implementation("1", { app: "ollama", name: "lab pc" }))).toBe("lab pc");
  });

  it("is found by its app or agent as well as the replyer's name", () => {
    const action = replyer("a", [implementation("1", { app: "ollama", name: "lab pc" })]);
    expect(replyerMatches(action, "OLLAMA")).toBe(true);
    expect(replyerMatches(action, "lab")).toBe(true);
    expect(replyerMatches(action, "Replyer a")).toBe(true);
    expect(replyerMatches(action, "nope")).toBe(false);
  });
});
