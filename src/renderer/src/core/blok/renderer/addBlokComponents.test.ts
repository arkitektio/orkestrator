// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as z from "zod";

import { addBlokComponents } from "./catalog";
import { createBlokCatalog, createBlokComponent } from "./runtime";

const part = (name: string) => createBlokComponent({ name, schema: z.object({}) }, () => null);

describe("addBlokComponents", () => {
  it("adds a module's components and takes them back out", () => {
    const catalog = createBlokCatalog("test", [part("Card")]);
    const undo = addBlokComponents([part("MikroScene")], catalog);
    expect([...catalog.components.keys()]).toEqual(["Card", "MikroScene"]);
    undo();
    expect([...catalog.components.keys()]).toEqual(["Card"]);
  });

  it("refuses a name the catalog already holds, adding none of them", () => {
    const catalog = createBlokCatalog("test", [part("Card")]);
    expect(() => addBlokComponents([part("Fresh"), part("Card")], catalog)).toThrow(/Card/);
    expect([...catalog.components.keys()]).toEqual(["Card"]);
  });
});
