import { describe, expect, it } from "vitest";

import { AGENT_SPEC_VERSION, FromAgentMessage, Register } from "./message";

// takt parses every agent→backend frame as an envelope whose `id` is required; a frame
// without one closes the socket with 3003 before the agent ever registers.
describe("agent→backend frames", () => {
  it("carry an id: register, heartbeat answer, session init and events", () => {
    const frames = [
      Register.parse({ type: "REGISTER", token: "t", session_id: "s", force: false }),
      FromAgentMessage.parse({ type: "HEARTBEAT_ANSWER" }),
      FromAgentMessage.parse({ type: "SESSION_INIT", session_id: "s" }),
      FromAgentMessage.parse({ type: "STARTED", task: "9" }),
    ];
    for (const frame of frames) {
      expect(typeof frame.id).toBe("string");
      expect(frame.id).not.toBe("");
    }
  });

  // takt closes a REGISTER that names no spec_version with 4006.
  it("register names the spec it runs", () => {
    const frame = Register.parse({ type: "REGISTER", token: "t" });
    expect(frame.spec_version).toBe(AGENT_SPEC_VERSION);
    expect(JSON.parse(JSON.stringify(frame)).spec_version).toBe(AGENT_SPEC_VERSION);
  });

  it("keeps an id it is given", () => {
    expect(FromAgentMessage.parse({ type: "HEARTBEAT_ANSWER", id: "h1" }).id).toBe("h1");
  });
});
