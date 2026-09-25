// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { defineModule } from "@/core/lib/module-host/define";
import { registerModule, resetModuleHost, useModuleHostVersion } from "@/core/lib/module-host/host";
import { registry as DIALOGS } from "@/core/app/dialog";
import { registry as ACTIONS } from "@/core/app/localactions";
import { MODULE_DISPLAYS, modulePages, pageSectionsFor } from "./registries";

/**
 * A module that is not in the source tree arriving at runtime, as a remote
 * one will: everything it contributes appears in the host's registries, and
 * disappears again when it is unregistered.
 */
const Display = () => <span>transaction</span>;
const Dialog = () => <span>categorize</span>;
const Receipts = () => <span>receipts</span>;

const bankk = defineModule({
  manifest: {
    schema: 1,
    namespace: "bankk",
    service: "io.jhnnsrs.bankk",
    version: "0.1.0",
    label: "Bankk",
    models: [{ identifier: "@bankk/transaction", name: "Transaction", datum: true, path: "transactions/:id" }],
  },
  serviceKey: "bankk",
  builtins: {
    page: async () => ({ default: () => null }),
    displays: { "@bankk/transaction": Display },
    dialogs: { bankkcategorize: Dialog },
    actions: {
      "bankk-categorize": {
        title: "Categorize",
        description: "Categorize this transaction",
        conditions: [{ type: "identifier", identifier: "@bankk/transaction" }],
        execute: async () => {},
      },
    },
    pageSections: [
      {
        id: "bankk.receipts",
        title: "Receipts",
        placement: "main",
        match: { identifiers: ["@dokuments/document"] },
        Component: Receipts,
      },
    ],
  },
});

afterEach(() => resetModuleHost());

describe("a module registered at runtime", () => {
  it("joins every registry, and leaves them again", () => {
    const result = registerModule(bankk);
    expect(result.ok).toBe(true);

    expect("@bankk/transaction" in MODULE_DISPLAYS).toBe(true);
    expect("bankkcategorize" in DIALOGS).toBe(true);
    expect("bankk-categorize" in ACTIONS).toBe(true);
    expect(modulePages().map((page) => page.namespace)).toEqual(["bankk"]);
    expect(pageSectionsFor("@dokuments/document", { placement: "main", slot: null }, false).map((s) => s.id)).toEqual([
      "bankk.receipts",
    ]);

    if (result.ok) result.unregister();
    expect("@bankk/transaction" in MODULE_DISPLAYS).toBe(false);
    expect("bankkcategorize" in DIALOGS).toBe(false);
    expect(modulePages()).toEqual([]);
  });

  it("re-renders what is already on screen", () => {
    // What PageSections, AppRoutes and the palette do: subscribe, then derive.
    const { result } = renderHook(() => {
      useModuleHostVersion();
      return pageSectionsFor("@dokuments/document", { placement: "main", slot: null }, false).length;
    });
    expect(result.current).toBe(0);

    let unregister = () => {};
    act(() => {
      const registered = registerModule(bankk);
      if (registered.ok) unregister = registered.unregister;
    });
    expect(result.current).toBe(1);

    act(() => unregister());
    expect(result.current).toBe(0);
  });
});
