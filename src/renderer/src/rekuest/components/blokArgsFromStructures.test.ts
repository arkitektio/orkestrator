import { describe, expect, it } from "vitest";
import { PortKind } from "@/rekuest/api/graphql";
import { blokArgsFromStructures } from "./blokArgsFromStructures";

const image = (id: string) => ({ identifier: "@mikro/arraydataset", id });
const room = { identifier: "@alpaka/room", id: "3" };

const imagePort = { key: "image", kind: PortKind.Structure, identifier: "@mikro/arraydataset" };
const imagesPort = {
  key: "images",
  kind: PortKind.List,
  children: [{ kind: PortKind.Structure, identifier: "@mikro/arraydataset" }],
};

describe("a blok opened on the objects shown with it", () => {
  it("takes the one object of an arg's identifier", () => {
    expect(blokArgsFromStructures([imagePort], [room, image("7")])).toEqual({
      image: { __identifier: "@mikro/arraydataset", object: "7" },
    });
  });

  it("leaves an arg out when nothing fits", () => {
    expect(blokArgsFromStructures([imagePort], [room])).toEqual({});
  });

  it("leaves a single arg out when several fit", () => {
    expect(blokArgsFromStructures([imagePort], [image("7"), image("8")])).toEqual({});
  });

  it("gives a list arg every object that fits", () => {
    expect(blokArgsFromStructures([imagesPort], [image("7"), room, image("8")])).toEqual({
      images: [
        { __identifier: "@mikro/arraydataset", object: "7" },
        { __identifier: "@mikro/arraydataset", object: "8" },
      ],
    });
  });

  it("does not guess other kinds", () => {
    expect(blokArgsFromStructures([{ key: "bins", kind: PortKind.Int }], [image("7")])).toEqual({});
  });
});
