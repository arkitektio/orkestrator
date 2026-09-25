import { afterEach, describe, expect, it } from "vitest";

import { defineModule, type ModuleBuiltins } from "./define";
import {
  installedModules,
  moduleHostVersion,
  registerModule,
  registerModules,
  resetModuleHost,
} from "./host";

const page = async () => ({ default: () => null });

const module = (namespace: string, builtins: Partial<ModuleBuiltins> = {}) =>
  defineModule({
    manifest: {
      schema: 1,
      namespace,
      service: `io.test.${namespace}`,
      version: "0.1.0",
      label: namespace,
      models: [{ identifier: `@${namespace}/thing`, name: "Thing", datum: true, path: "things/:id" }],
    },
    serviceKey: namespace,
    builtins: { page, ...builtins },
  });

afterEach(() => resetModuleHost());

describe("registerModule", () => {
  it("adds a module and hands back its unregister", () => {
    const before = moduleHostVersion();
    const result = registerModule(module("bankk"));
    expect(result.ok).toBe(true);
    expect(installedModules().map((m) => m.manifest.namespace)).toEqual(["bankk"]);
    expect(moduleHostVersion()).toBe(before + 1);

    if (result.ok) {
      result.unregister();
      result.unregister(); // twice is harmless
    }
    expect(installedModules()).toEqual([]);
    expect(moduleHostVersion()).toBe(before + 2);
  });

  it("refuses an invalid manifest and changes nothing", () => {
    const broken = module("bankk");
    const result = registerModule({ ...broken, manifest: { ...broken.manifest, schema: 2 as 1 } });
    expect(result.ok).toBe(false);
    expect(installedModules()).toEqual([]);
  });

  it("refuses a namespace that is taken", () => {
    registerModule(module("bankk"));
    const result = registerModule(module("bankk"));
    expect(result).toMatchObject({ ok: false, issues: [{ path: "namespace" }] });
  });

  it("refuses builtin ids another module already claims", () => {
    const Dialog = () => null;
    registerModule(module("alpha", { dialogs: { creatething: Dialog } }));
    const result = registerModule(module("beta", { dialogs: { creatething: Dialog } }));
    expect(result).toMatchObject({
      ok: false,
      issues: [{ path: "builtins.dialog", message: 'dialog "creatething" is already claimed by alpha' }],
    });
    expect(installedModules()).toHaveLength(1);
  });
});

describe("registerModules", () => {
  it("throws on the first refusal: a first-party module must register", () => {
    expect(() => registerModules([module("alpha"), module("alpha")])).toThrow(/alpha was refused/);
  });

  it("returns one unregister for all", () => {
    const unregister = registerModules([module("alpha"), module("beta")]);
    expect(installedModules()).toHaveLength(2);
    unregister();
    expect(installedModules()).toEqual([]);
  });
});
