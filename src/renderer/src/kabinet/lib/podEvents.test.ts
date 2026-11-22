import { describe, expect, it } from "vitest";
import { applyPodEvent, EventPod } from "./podEvents";

const pod = (id: string, resource: string | null, status = "RUNNING") =>
  ({ id, resource: resource ? { id: resource, name: resource } : null, status }) as unknown as EventPod;

describe("applyPodEvent", () => {
  const pods = [pod("1", "r"), pod("2", "r")];

  it("adds a pod created on this resource, ignores one created elsewhere", () => {
    expect(applyPodEvent("r", pods, { create: pod("3", "r") }).map((p) => p.id)).toEqual(["1", "2", "3"]);
    expect(applyPodEvent("r", pods, { create: pod("3", "other") })).toBe(pods);
    expect(applyPodEvent("r", pods, { create: pod("3", null) })).toBe(pods);
  });

  it("replaces an updated pod in place", () => {
    const next = applyPodEvent("r", pods, { update: pod("2", "r", "STOPPED") });
    expect(next.map((p) => p.id)).toEqual(["1", "2"]);
    expect(next[1].status).toBe("STOPPED");
  });

  it("follows a pod moved onto or off the resource", () => {
    expect(applyPodEvent("r", pods, { update: pod("2", "other") }).map((p) => p.id)).toEqual(["1"]);
    expect(applyPodEvent("r", pods, { update: pod("9", "r") }).map((p) => p.id)).toEqual(["1", "2", "9"]);
  });

  it("drops a deleted pod, and hands back the same list for another resource's", () => {
    expect(applyPodEvent("r", pods, { delete: "1" }).map((p) => p.id)).toEqual(["2"]);
    expect(applyPodEvent("r", pods, { delete: "9" })).toBe(pods);
    expect(applyPodEvent("r", pods, { update: pod("9", "other") })).toBe(pods);
  });
});
