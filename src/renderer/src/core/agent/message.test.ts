import { describe, expect, it } from "vitest";

import { FromAgentMessage, Register } from "./message";

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

  it("keeps an id it is given", () => {
    expect(FromAgentMessage.parse({ type: "HEARTBEAT_ANSWER", id: "h1" }).id).toBe("h1");
  });
});
