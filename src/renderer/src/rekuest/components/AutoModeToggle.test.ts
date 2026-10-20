// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { TaskPolicy } from "@/rekuest/api/graphql";
import { assignAutoKey, rememberedPolicy } from "./AutoModeToggle";

describe("the remembered auto-mode of a one-click run", () => {
  afterEach(() => window.localStorage.clear());

  it("is what the assign form last chose for the same target, else ASK", () => {
    const key = assignAutoKey({ action: "a1" });
    expect(rememberedPolicy(key)).toBe(TaskPolicy.Ask);
    window.localStorage.setItem("rekuest:auto-mode:" + key, "1");
    expect(rememberedPolicy(key)).toBe(TaskPolicy.Auto);
    expect(rememberedPolicy(assignAutoKey({ implementation: "i1" }))).toBe(TaskPolicy.Ask);
  });
});
