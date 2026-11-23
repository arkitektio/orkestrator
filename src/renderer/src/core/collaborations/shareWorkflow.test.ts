import { describe, expect, it, vi } from "vitest";

import {
  orderShares,
  readShareWorkflowArgs,
  shareTotals,
  shareWorkflowNamespace,
  shareWorkflowOperation,
  type ServiceShare,
  type WorkflowShare,
} from "./shareWorkflow";

const share = (partial: Partial<WorkflowShare> = {}): WorkflowShare => ({
  collaboration: "k",
  dryRun: true,
  added: [],
  covered: 0,
  skipped: [],
  unknown: [],
  ...partial,
});

describe("shareWorkflowNamespace", () => {
  it("reads the namespace of a <namespace>.shareWorkflow operation only", () => {
    expect(shareWorkflowNamespace("mikro.shareWorkflow")).toBe("mikro");
    expect(shareWorkflowNamespace("lok.shareCollaboration")).toBeUndefined();
    expect(shareWorkflowNamespace(".shareWorkflow")).toBeUndefined();
  });
});

describe("readShareWorkflowArgs", () => {
  it("needs a collaboration and a root task, and dry-runs unless told otherwise", () => {
    expect(readShareWorkflowArgs({ collaboration: "k", rootTask: "7" })).toEqual({
      collaboration: "k",
      rootTask: "7",
      dryRun: true,
      name: null,
    });
    expect(readShareWorkflowArgs({ collaboration: "k", rootTask: "7", dryRun: false, name: "Lab" }).dryRun).toBe(false);
    expect(() => readShareWorkflowArgs({ rootTask: "7" })).toThrow();
    expect(() => readShareWorkflowArgs({ collaboration: "k" })).toThrow();
  });
});

describe("shareWorkflowOperation", () => {
  it("sends the input to the service and answers its report with nulls for missing identifiers", async () => {
    const mutate = vi.fn().mockResolvedValue({
      data: {
        shareWorkflow: {
          collaboration: "k",
          dryRun: true,
          added: [{ identifier: "@mikro/image", object: "1" }],
          covered: 2,
          skipped: [{ object: "3", whole: "4" }],
          unknown: ["@mikro/thing"],
        },
      },
    });
    const operation = shareWorkflowOperation("mikro", {} as never);
    const report = await operation.run({ mutate } as never, { collaboration: "k", rootTask: "7", dryRun: true });
    expect(mutate.mock.calls[0][0].variables).toEqual({
      input: { collaboration: "k", rootTask: "7", dryRun: true, name: null },
    });
    expect(report).toEqual({
      collaboration: "k",
      dryRun: true,
      added: [{ identifier: "@mikro/image", object: "1" }],
      covered: 2,
      skipped: [{ identifier: null, object: "3", wholeIdentifier: null, whole: "4" }],
      unknown: ["@mikro/thing"],
    });
  });
});

describe("combined report", () => {
  const shares: ServiceShare[] = [
    { namespace: "fluss", label: "Fluss", status: "done", share: share() },
    {
      namespace: "mikro",
      label: "Mikro",
      status: "done",
      share: share({ added: [{ identifier: "@mikro/image", object: "1" }, { identifier: "@mikro/image", object: "2" }], covered: 3 }),
    },
    { namespace: "kuvert", label: "Kuvert", status: "failed", error: new Error("no") },
    { namespace: "bank", label: "Bank", status: "unavailable" },
    {
      namespace: "elektro",
      label: "Elektro",
      status: "done",
      share: share({ skipped: [{ identifier: null, object: "5", wholeIdentifier: null, whole: "6" }], unknown: ["@elektro/x"] }),
    },
  ];

  it("totals what the services that answered did", () => {
    expect(shareTotals(shares)).toEqual({ added: 2, covered: 3, skipped: 1, unknown: 1, failed: 1, unavailable: 1 });
  });

  it("puts the services with most to say first and the ones that did not answer last", () => {
    expect(orderShares(shares).map((entry) => entry.namespace)).toEqual(["mikro", "elektro", "fluss", "bank", "kuvert"]);
  });
});
