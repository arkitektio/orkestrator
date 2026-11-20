// @vitest-environment jsdom
// The graphql module this pulls in reaches `window` at import time.
import { describe, expect, it } from "vitest";
import { restartActionOf } from "./SupervisorRestartButton";

const action = (name: string, ...interfaces: string[]) => ({
  name,
  implementations: interfaces.map((iface, index) => ({ id: String(index), interface: iface, agent: { id: "a", kind: "APP", active: true } })),
});

describe("restartActionOf", () => {
  it("finds the supervisor action that restarts, by name or by interface", () => {
    expect(restartActionOf([action("Stop"), action("Restart Agent")])?.name).toBe("Restart Agent");
    expect(restartActionOf([action("Stop"), action("Cycle", "bounce_agent")])?.name).toBe("Cycle");
  });

  it("finds nothing when the supervisor offers no restart", () => {
    expect(restartActionOf([action("Stop", "stop"), action("Start", "start")])).toBeUndefined();
  });
});
