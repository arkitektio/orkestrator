import { describe, expect, it } from "vitest";
import { manifest as kabinet } from "@/kabinet/manifest";
import { manifest as mikro } from "@/mikro/manifest";
import { manifest as rekuest } from "@/rekuest/manifest";
import { manifest as lok } from "@/lok/manifest";

// Every model's list page opens with the host header (`listPageHead`), which
// reads the model's description; a model without one would get no header.
describe.each([mikro, kabinet, rekuest, lok])("$namespace models", (manifest) => {
  it.each(manifest.models ?? [])("$identifier declares a description", (model) => {
    expect(model.description?.trim()).toBeTruthy();
  });
});
