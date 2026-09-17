import { describe, expect, it } from "vitest";

import { smartRegistry } from "../registry";
import { describeStructures } from "./describe";

smartRegistry.register({ identifier: "@t/image", path: "t/images", name: "Image", datum: false });
smartRegistry.register({ identifier: "@t/entity", path: "t/entities", name: "Entity", datum: false });

const of = (identifier: string, id: string) => ({ identifier, object: { id } });

describe("structures in words", () => {
  it("names one thing without counting it", () => {
    expect(describeStructures([of("@t/image", "1")])).toBe("Image");
  });

  it("counts several of a kind", () => {
    expect(describeStructures([of("@t/image", "1"), of("@t/image", "2")])).toBe("2 Images");
    expect(describeStructures([of("@t/entity", "1"), of("@t/entity", "2")])).toBe("2 Entities");
  });

  it("counts each kind of a mixed handful", () => {
    expect(
      describeStructures([of("@t/image", "1"), of("@t/image", "2"), of("@t/entity", "3")]),
    ).toBe("2 Images, 1 Entity");
  });

  it("names a model nobody registered by its identifier, made readable", () => {
    expect(describeStructures([of("@t/instance_mask-view", "1")])).toBe("Instance Mask View");
  });

  it("stops naming kinds after two", () => {
    expect(
      describeStructures([
        of("@t/image", "1"),
        of("@t/entity", "2"),
        of("@t/roi", "3"),
        of("@t/table", "4"),
      ]),
    ).toBe("1 Image, 1 Entity +2 more");
  });
});
