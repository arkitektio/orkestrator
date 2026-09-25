// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { validateManifest } from "@/core/lib/module-spec";

const MODULE_FILES = [
  "@/alpaka/module",
  "@/dokuments/module",
  "@/elektro/module",
  "@/fluss/module",
  "@/kabinet/module",
  "@/kraph/module",
  "@/lok/module",
  "@/lovekit/module",
  "@/mikro/module",
  "@/omeroark/module",
  "@/rekuest/module",
];

describe("module manifests", () => {
  it("are valid v1 manifests, builtins described", async () => {
    const { MODULE_DEFINITIONS } = await import("./install");
    for (const { manifest } of MODULE_DEFINITIONS) {
      expect(validateManifest(manifest), manifest.namespace).toMatchObject({ ok: true });
      expect(manifest.surfaces?.some((surface) => surface.kind === "page"), manifest.namespace).toBe(true);
    }
    // The first cold import of every module is slow under a loaded suite.
  }, 60_000);

  it("route every model under the module's own namespace", async () => {
    const { MODULE_DEFINITIONS } = await import("./install");
    for (const { manifest } of MODULE_DEFINITIONS) {
      for (const model of manifest.models ?? []) {
        expect(model.identifier.startsWith(`@${manifest.namespace}/`), model.identifier).toBe(true);
        expect(model.path.endsWith("/:id"), model.identifier).toBe(true);
      }
    }
  }, 60_000);
});

/**
 * Whichever file the app happens to evaluate first, installing the modules
 * and reading every registry must work: no registry may read a module
 * binding while files are still being evaluated. Each case starts cold from
 * a different module's builtins.
 */
describe("evaluation order", () => {
  it.each(MODULE_FILES)("survives %s being evaluated first", async (first) => {
    vi.resetModules();
    await import(/* @vite-ignore */ first);
    await import("./install");
    const registries = await import("../../core/modules/registries");
    const { registry: dialogs } = await import("@/core/dialogs/registry");
    const { registry: actions } = await import("@/core/smart/localactions/registry");
    const { SMART_SECTIONS } = await import("@/core/smart/smartcontext");

    expect(Object.keys(dialogs).length).toBeGreaterThan(40);
    expect(Object.keys(actions).length).toBeGreaterThan(60);
    expect(SMART_SECTIONS.sections.length).toBeGreaterThan(5);
    expect(Object.keys(registries.MODULE_DISPLAYS).length).toBeGreaterThan(20);
    expect(registries.modulePages().length).toBe(MODULE_FILES.length);
  }, 60_000);
});

describe("page sections", () => {
  it("fill the host's slots and places by identifier and datum", async () => {
    await import("./install");
    const { pageSectionsFor } = await import("../../core/modules/registries");
    const ids = (identifier: string, where: Parameters<typeof pageSectionsFor>[1], datum: boolean) =>
      pageSectionsFor(identifier, where, datum).map((section) => section.id);

    // Knowledge is a datum's affair; chat applies to every model.
    expect(ids("@mikro/image", { slot: "knowledge" }, true)).toEqual(["kraph.knowledge"]);
    expect(ids("@rekuest/agent", { slot: "knowledge" }, false)).toEqual([]);
    expect(ids("@rekuest/agent", { slot: "chat" }, false)).toEqual(["alpaka.rooms"]);

    // Contributions to other modules' pages, by identifier and placement.
    expect(ids("@kraph/entitycategory", { placement: "actions", slot: null }, false)).toEqual(["rekuest.enhance"]);
    expect(ids("@kraph/graph", { placement: "actions", slot: null }, false)).toEqual([]);
    expect(ids("@rekuest/task", { placement: "main", slot: null }, false)).toEqual(["fluss.taskflow"]);
    expect(ids("@lok/client", { placement: "main", slot: null }, false)).toEqual(["rekuest.clientfailures"]);
  }, 60_000);
});

describe("the smart menu's module parts", () => {
  it("offers exactly the palette sections to ⌘K, and rekuest's Run-on around both", async () => {
    await import("./install");
    const { SMART_SECTIONS } = await import("@/core/smart/smartcontext");
    const { moduleMenuWrappers } = await import("../../core/modules/registries");
    const palette = SMART_SECTIONS.sections.filter((section) => section.palette).map((section) => section.id);
    expect(palette).toEqual(["local.actions", "rekuest.shortcuts", "rekuest.actions", "kabinet.definitions"]);
    expect(moduleMenuWrappers().map((wrapper) => wrapper.name)).toEqual(["RunOnSubmenu"]);
  }, 60_000);
});
