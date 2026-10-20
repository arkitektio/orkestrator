import { describe, expect, it } from "vitest";

import { windowRoleFrom } from "./windowRole";

describe("windowRoleFrom", () => {
  it("is quick only for the quick bar's query", () => {
    expect(windowRoleFrom("?role=quick")).toBe("quick");
    expect(windowRoleFrom("?foo=1&role=quick")).toBe("quick");
  });

  it("is popout for a window opened beside the main one", () => {
    expect(windowRoleFrom("?role=popout")).toBe("popout");
  });

  it("is app otherwise", () => {
    expect(windowRoleFrom("")).toBe("app");
    expect(windowRoleFrom("?role=other")).toBe("app");
  });
});
