import { describe, expect, it } from "vitest";

import { breadcrumbText } from "./breadcrumbText";

describe("breadcrumbText", () => {
  it("takes a string as it is", () => {
    expect(breadcrumbText("Datasets")).toBe("Datasets");
  });

  it("unwraps the library's default span", () => {
    // What `use-react-router-breadcrumbs` actually returns for a path segment.
    expect(breadcrumbText(<span>Datasets</span>)).toBe("Datasets");
  });

  it("has no text for a component crumb or an empty one", () => {
    const Name = () => <b>loading</b>;
    expect(breadcrumbText(<Name />)).toBeUndefined();
    expect(breadcrumbText("")).toBeUndefined();
    expect(breadcrumbText(undefined)).toBeUndefined();
  });
});
