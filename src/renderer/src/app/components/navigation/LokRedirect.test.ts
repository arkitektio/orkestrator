import { describe, expect, it } from "vitest";
import { lokToTeam } from "./LokRedirect";

describe("lokToTeam", () => {
  it("moves a deep link and keeps its search", () => {
    expect(lokToTeam("/lok/users/5", "?x=1")).toBe("/team/users/5?x=1");
  });

  it("moves the module root", () => {
    expect(lokToTeam("/lok")).toBe("/team");
  });

  it("leaves a lookalike segment alone", () => {
    expect(lokToTeam("/lokal/x")).toBe("/lokal/x");
  });
});
