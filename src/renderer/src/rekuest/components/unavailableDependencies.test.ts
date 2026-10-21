// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { unavailableDependenciesOf } from "./MaterializedBlokRenderer";

describe("unavailableDependenciesOf", () => {
  it("names unbound dependencies and offline agents", () => {
    const unavailable = unavailableDependenciesOf({
      unboundDependencies: ["lamp"],
      agentMappings: [
        { key: "stage", agent: { id: "1", name: "Stage", connected: false } },
        { key: "camera", agent: { id: "2", name: "Camera", connected: true } },
        { key: "self", agent: { id: "3" } },
      ],
    });
    expect([...unavailable.keys()]).toEqual(["lamp", "stage"]);
    expect(unavailable.get("stage")).toBe("Stage is offline");
  });
});
