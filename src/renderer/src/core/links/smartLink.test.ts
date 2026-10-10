import { describe, expect, it } from "vitest";
import { buildSmartPath, parseSmartPath } from "./smartLink";

const link = { org: "my-lab", hub: "3", identifier: "@mikro/image", id: "42" };

describe("parseSmartPath", () => {
  it("reads an identifier sent as one encoded segment", () => {
    expect(parseSmartPath("/smart/my-lab/3/%40mikro%2Fimage/42")).toEqual(link);
  });

  it("reads an identifier written with literal slashes", () => {
    expect(parseSmartPath("/smart/my-lab/3/@mikro/image/42")).toEqual(link);
  });

  it("decodes each segment after splitting, so an encoded slash stays inside its segment", () => {
    expect(parseSmartPath("/smart/my-lab/3/%40mikro%2Fimage/a%2Fb")?.id).toBe("a/b");
  });

  it("refuses what is not a smartlink", () => {
    expect(parseSmartPath("/smart/my-lab/3/42")).toBeNull();
    expect(parseSmartPath("/smart/my-lab/3/mikro/42")).toBeNull();
    expect(parseSmartPath("/mikro/images/42")).toBeNull();
    expect(parseSmartPath("/smart/my-lab/3/%E0%A4%A/42")).toBeNull();
  });

  it("round-trips through buildSmartPath", () => {
    expect(buildSmartPath(link)).toBe("/smart/my-lab/3/%40mikro%2Fimage/42");
    expect(parseSmartPath(buildSmartPath({ ...link, id: "a/b" }))).toEqual({ ...link, id: "a/b" });
  });
});
