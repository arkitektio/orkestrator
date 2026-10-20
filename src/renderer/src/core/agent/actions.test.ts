// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const findModel = vi.hoisted(() => vi.fn());
vi.mock("@/core/smart/registry", () => ({ smartRegistry: { findModel } }));

import { DialogDismissedError } from "@/core/dialogs/DialogProvider";
import "./actions";
import { globalRegistry } from "./registry";
import type { AgentUi } from "./types";

const entry = (name: string) => {
  const found = globalRegistry.entries.find((e) => e.name === name);
  if (!found) throw new Error(`${name} is not registered`);
  return found;
};

const run = async (name: string, args: Record<string, unknown>, ui: Partial<AgentUi>) => {
  const outcome: { returned?: unknown; error?: string } = {};
  await entry(name).func({
    args,
    ui: { awaitDialog: vi.fn(), openWindow: vi.fn(), ...ui },
    return: (returns: unknown) => (outcome.returned = returns),
    error: (error: string) => (outcome.error = error),
  });
  return outcome;
};

describe("request_approval", () => {
  it("has the ports kabinet's REQUEST_APPROVAL demands: (release, agent: str) -> approval", () => {
    const { definition } = entry("request_approval");
    expect(definition.args?.map((p) => [p.key, p.kind, p.identifier ?? null])).toEqual([
      ["release", "STRUCTURE", "@kabinet/release"],
      ["agent", "STRING", null],
    ]);
    expect(definition.returns?.map((p) => [p.kind, p.identifier])).toEqual([["STRUCTURE", "@kabinet/approval"]]);
  });

  it("asks in the install dialog, for that deployer, and returns the approval made", async () => {
    const awaitDialog = vi.fn().mockResolvedValue("42");

    const outcome = await run("request_approval", { release: "7", agent: "plugin_engine" }, { awaitDialog });

    expect(awaitDialog).toHaveBeenCalledWith("installrelease", { release: "7", agent: "plugin_engine" });
    expect(outcome).toEqual({ returned: { approval: "42" } });
  });

  it("fails when the person closes the dialog", async () => {
    const awaitDialog = vi.fn().mockRejectedValue(new DialogDismissedError());

    const outcome = await run("request_approval", { release: "7", agent: "plugin_engine" }, { awaitDialog });

    expect(outcome.error).toMatch(/not approved/);
  });
});

describe("open_in_separate_window", () => {
  it("opens the image's page in a window of its own", async () => {
    findModel.mockReturnValue({ path: "mikro/images" });
    const openWindow = vi.fn();

    const outcome = await run("open_in_separate_window", { image: "12" }, { openWindow });

    expect(openWindow).toHaveBeenCalledTimes(1);
    expect(openWindow.mock.calls[0][0]).toContain("12");
    expect(outcome).toEqual({ returned: {} });
  });
});
