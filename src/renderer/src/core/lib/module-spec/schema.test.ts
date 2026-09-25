import { describe, expect, it } from "vitest";

import { validateManifest } from "./schema";

// The worked example from the module boundary doc, verbatim.
const bankk = {
  schema: 1,
  namespace: "bankk",
  service: "io.jhnnsrs.bankk",
  version: "0.1.0",
  label: "Bankk",
  icon: "landmark",
  models: [
    { identifier: "@bankk/account", name: "Account", datum: false, path: "accounts/:id" },
    { identifier: "@bankk/transaction", name: "Transaction", datum: true, path: "transactions/:id", describe: true },
    { identifier: "@bankk/category", name: "Category", datum: false, path: "categories/:id" },
  ],
  actions: [
    {
      id: "categorize",
      title: "Categorize",
      icon: "tags",
      conditions: [{ type: "identifier", identifier: "@bankk/transaction" }],
      perform: { kind: "rekuest", action: "bankk.categorize" },
    },
    {
      id: "attach-receipt",
      title: "Attach as receipt",
      icon: "paperclip",
      conditions: [
        { type: "identifier", identifier: "@bankk/transaction" },
        { type: "pidentifier", identifier: "@dokuments/document" },
      ],
      perform: { kind: "request", operation: "attachReceipt" },
    },
  ],
  surfaces: [
    { id: "overview", kind: "page", render: { renderer: "web", url: "/ui/overview" } },
    {
      id: "transaction",
      kind: "display",
      match: { identifier: "@bankk/transaction" },
      render: { renderer: "blok", blok: "bankk.transaction-card" },
    },
    { id: "monthly", kind: "panel", render: { renderer: "web", url: "/ui/panels/monthly" } },
  ],
  search: [{ identifier: "@bankk/transaction", operation: "searchTransactions" }],
  settings: { type: "object", properties: { syncIntervalHours: { type: "integer", default: 6 } } },
};

describe("validateManifest", () => {
  it("accepts the bankk example from the spec", () => {
    expect(validateManifest(bankk)).toMatchObject({ ok: true });
  });

  it("ignores unknown fields and keeps unknown kinds (additive evolution)", () => {
    const result = validateManifest({
      ...bankk,
      futureKey: { anything: true },
      surfaces: [...bankk.surfaces, { id: "x", kind: "hologram", render: { renderer: "quantum" } }],
      actions: [{ ...bankk.actions[0], id: "y", perform: { kind: "teleport" } }],
    });
    expect(result.ok).toBe(true);
  });

  it("refuses another schema major", () => {
    expect(validateManifest({ ...bankk, schema: 2 }).ok).toBe(false);
  });

  it("refuses models outside the module's namespace", () => {
    const result = validateManifest({
      ...bankk,
      models: [{ identifier: "@mikro/image", name: "Image", datum: true, path: "images/:id" }],
    });
    expect(result).toEqual({
      ok: false,
      issues: [{ path: "models.0.identifier", message: "not in namespace bankk" }],
    });
  });

  it("refuses duplicate action ids", () => {
    const result = validateManifest({ ...bankk, actions: [bankk.actions[0], bankk.actions[0]] });
    expect(result.ok).toBe(false);
  });

  it("refuses underscores in the namespace", () => {
    expect(validateManifest({ ...bankk, namespace: "omero_ark" }).ok).toBe(false);
  });
});
