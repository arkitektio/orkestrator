// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Services are ready when their key is in this set; the real guards read
// connection state, which a unit test does not have.
const ready = new Set<string>();
vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  serviceGuard:
    (key: string) =>
    ({ children, unavailable }: { children: ReactNode; unavailable?: ReactNode }) =>
      ready.has(key) ? <>{children}</> : <>{unavailable ?? null}</>,
}));

import { defineModule } from "@/core/modules/host/define";
import { registerModule, resetModuleHost } from "@/core/modules/host/host";
import { Dialog, DialogContent } from "@/core/ui/dialog";
import { MODULE_DIALOGS } from "./registries";

const module = (namespace: string, label: string, dialogs: Record<string, () => ReactNode>, requires?: string[]) =>
  defineModule({
    manifest: {
      schema: 1,
      namespace,
      service: `io.test.${namespace}`,
      version: "0.1.0",
      label,
      models: [],
      ...(requires ? { requires: { services: requires } } : {}),
    },
    serviceKey: namespace,
    builtins: { page: async () => ({ default: () => null }), dialogs },
  });

const open = (id: string) => {
  const Component = (MODULE_DIALOGS as Record<string, React.ComponentType<object>>)[id];
  return render(
    <Dialog open>
      <DialogContent>
        <Component />
      </DialogContent>
    </Dialog>,
  );
};

/**
 * Dialogs are guarded by the services they need, not by one service for all:
 * rekuest being down used to blank every dialog, including ones that never
 * touch it.
 */
describe("dialog guards", () => {
  afterEach(() => {
    resetModuleHost();
    ready.clear();
  });

  it("opens a module's dialog when only that module's service is ready", () => {
    registerModule(module("ledger", "Ledger", { ledgerlink: () => <span>link a bank</span> }));
    ready.add("ledger"); // rekuest is not
    open("ledgerlink");
    expect(screen.getByText("link a bank")).toBeTruthy();
  });

  it("says which service is missing instead of rendering an empty dialog", () => {
    registerModule(module("ledger", "Ledger", { ledgerlink: () => <span>link a bank</span> }));
    open("ledgerlink");
    expect(screen.queryByText("link a bank")).toBeNull();
    expect(screen.getByText("Ledger is not available")).toBeTruthy();
  });

  it("also waits for the services a module declares it requires", () => {
    registerModule(module("engine", "Engine", {}));
    registerModule(module("store", "Store", { storeinstall: () => <span>install</span> }, ["engine"]));
    ready.add("store");
    open("storeinstall");
    expect(screen.getByText("Engine is not available")).toBeTruthy();

    ready.add("engine");
    open("storeinstall");
    expect(screen.getByText("install")).toBeTruthy();
  });
});
