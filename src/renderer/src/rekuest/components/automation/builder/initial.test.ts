// @vitest-environment jsdom
// (the generated rekuest API module reads `window` on import)
import { describe, expect, it } from "vitest";
import { SignalKind, TaskPolicy } from "@/rekuest/api/graphql";
import { initialFromSchedule, initialFromTrigger } from "./initial";

describe("editing a rule starts from its policy", () => {
  it("carries a schedule's and a trigger's policy into the builder", () => {
    const schedule = initialFromSchedule({
      name: "Nightly",
      enabled: true,
      policy: TaskPolicy.Auto,
      cron: "0 2 * * *",
      timezone: "UTC",
      ephemeralRuns: false,
      action: { id: "a" },
    });
    expect(schedule.policy).toBe(TaskPolicy.Auto);

    const trigger = initialFromTrigger({
      name: "On image",
      enabled: true,
      policy: TaskPolicy.Ask,
      identifier: "@mikro/image",
      kind: SignalKind.Created,
      port: "image",
      action: { id: "b" },
    });
    expect(trigger.policy).toBe(TaskPolicy.Ask);
  });
});
