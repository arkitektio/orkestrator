import { describe, expect, it } from "vitest";
import { describeAttempt, describeFailure, describeServiceStatus } from "./describe";

describe("connection sentences", () => {
  it("says why an address said no", () => {
    expect(describeFailure({ kind: "timeout", timeoutMs: 5000 })).toBe("didn't answer within 5 s");
    expect(describeFailure({ kind: "unreachable" })).toBe("couldn't be reached");
    expect(describeFailure({ kind: "status", status: 502 })).toBe("answered with an error (502)");
  });

  it("names the route of a mesh attempt", () => {
    expect(describeAttempt({ host: "mikro.lab.ts.net", route: "mesh", state: "trying", at: 0 })).toBe(
      "Trying mikro.lab.ts.net through the mesh…",
    );
  });

  it("never shows a status enum", () => {
    expect(describeServiceStatus("checking")).toBe("Checking its addresses…");
    expect(describeServiceStatus("ready", true)).toBe("Connected — checking again…");
  });
});
