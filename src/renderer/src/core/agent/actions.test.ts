// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const findModel = vi.hoisted(() => vi.fn());
vi.mock("@/core/smart/registry", () => ({ smartRegistry: { findModel } }));
const requestExport = vi.hoisted(() => vi.fn());
vi.mock("@/core/modules/export/exportRequests", () => ({ requestExport }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/core/notify", () => ({ toast }));

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

describe("upload_file", () => {
  it("asks for a file in mikro's upload dialog, into the folder given, and returns it", async () => {
    const awaitDialog = vi.fn().mockResolvedValue("99");

    const outcome = await run("upload_file", { folder: "3", reason: "The protocol" }, { awaitDialog });

    expect(awaitDialog).toHaveBeenCalledWith("agentuploadfile", { folder: "3", reason: "The protocol" });
    expect(outcome).toEqual({ returned: { file: "99" } });
  });

  it("fails when the person closes the dialog", async () => {
    const awaitDialog = vi.fn().mockRejectedValue(new DialogDismissedError());

    const outcome = await run("upload_file", {}, { awaitDialog });

    expect(outcome.error).toMatch(/No file was uploaded/);
  });
});

describe("download_file", () => {
  it("hands the file to the app's export path", async () => {
    const outcome = await run("download_file", { file: "5" }, {});

    expect(requestExport).toHaveBeenCalledWith([{ identifier: "@mikro/file", id: "5" }]);
    expect(outcome).toEqual({ returned: {} });
  });
});

describe("notify", () => {
  it("shows the message as a toast", async () => {
    const outcome = await run("notify", { title: "Done", message: "All 12 stacks are in" }, {});

    expect(toast).toHaveBeenCalledWith("Done", { description: "All 12 stacks are in" });
    expect(outcome).toEqual({ returned: {} });
  });
});
