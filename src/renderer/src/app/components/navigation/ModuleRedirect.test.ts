import { describe, expect, it } from "vitest";
import { MODULE_ALIASES, moveModulePath } from "./ModuleRedirect";

describe("moveModulePath", () => {
  it("moves a deep link and keeps its search", () => {
    expect(moveModulePath("/lok/users/5", "team", "lok", "?x=1")).toBe("/lok/users/5?x=1");
  });

  it("moves the module root", () => {
    expect(moveModulePath("/omero_ark", "omero_ark", "omeroark")).toBe("/omeroark");
  });

  it("leaves a lookalike segment alone", () => {
    expect(moveModulePath("/lokwork/x", "team", "lok")).toBe("/lokwork/x");
  });

  it("points every alias at a namespace without underscores", () => {
    for (const to of Object.values(MODULE_ALIASES)) expect(to).toMatch(/^[a-z][a-z0-9]*$/);
  });
});
