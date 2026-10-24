import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { isPackaged: false } }));
vi.mock("electron-store", () => ({ default: class {} }));

const { applyGpuChecks, dawnTogglesFor, parseGpuChecks } = await import("./GpuChecks");

describe("parseGpuChecks", () => {
  it("falls back to all checks for anything it does not know", () => {
    expect(parseGpuChecks(undefined)).toBe("all");
    expect(parseGpuChecks("off")).toBe("all");
    expect(parseGpuChecks(true)).toBe("all");
    expect(parseGpuChecks("no-bounds")).toBe("no-bounds");
    expect(parseGpuChecks("none")).toBe("none");
  });
});

describe("dawnTogglesFor", () => {
  it("adds toggles as checks are dropped", () => {
    expect(dawnTogglesFor("all")).toEqual([]);
    expect(dawnTogglesFor("no-bounds")).toEqual(["disable_robustness"]);
    expect(dawnTogglesFor("none")).toEqual(["disable_robustness", "skip_validation"]);
  });
});

describe("applyGpuChecks", () => {
  const run = (stored: unknown) => {
    const appendSwitch = vi.fn();
    const active = applyGpuChecks({ get: () => stored } as never, { appendSwitch });
    return { active, appendSwitch };
  };

  it("appends no switch while all checks are on", () => {
    const { active, appendSwitch } = run(undefined);
    expect(active).toBe("all");
    expect(appendSwitch).not.toHaveBeenCalled();
  });

  it("appends one enable-dawn-features switch with every toggle", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { active, appendSwitch } = run("none");
    expect(active).toBe("none");
    expect(appendSwitch).toHaveBeenCalledOnce();
    expect(appendSwitch).toHaveBeenCalledWith("enable-dawn-features", "disable_robustness,skip_validation");
  });
});
