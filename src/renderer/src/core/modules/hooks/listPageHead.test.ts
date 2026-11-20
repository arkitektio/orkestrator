import { afterEach, describe, expect, it } from "vitest";
import { Grid3x3, Image } from "lucide-react";

import { defineModule } from "@/core/modules/host/define";
import { registerModule, resetModuleHost } from "@/core/modules/host/host";
import { listPageHead } from "./listPageHead";

afterEach(() => resetModuleHost());

const register = () =>
  registerModule(
    defineModule({
      manifest: {
        schema: 1,
        namespace: "zeta",
        service: "io.test.zeta",
        version: "0",
        label: "Zeta",
        models: [
          { identifier: "@zeta/dataset", name: "Dataset", datum: false, path: "datasets/:id", description: "Arrays." },
          { identifier: "@zeta/quiet", name: "Quiet", datum: false, path: "quiets/:id" },
        ],
      },
      serviceKey: "zeta",
      builtins: {
        page: async () => ({ default: () => null }),
        navLinks: [
          { label: "Datasets", route: "/zeta/datasets", icon: Grid3x3 },
          { label: "Images", route: "/zeta/datasets/spec/image", icon: Image },
        ],
      },
    }),
  );

describe("listPageHead", () => {
  it("takes the description from the manifest and the icon and label from the list's nav link", () => {
    register();
    expect(listPageHead("@zeta/dataset", "/zeta/datasets")).toEqual({
      namespace: "zeta",
      icon: Grid3x3,
      label: "Datasets",
      description: "Arrays.",
    });
  });

  it("prefers the nav link of the page itself", () => {
    register();
    expect(listPageHead("@zeta/dataset", "/zeta/datasets/spec/image")).toMatchObject({
      icon: Image,
      label: "Images",
    });
  });

  it("draws nothing for a model without a description, or one no module declares", () => {
    register();
    expect(listPageHead("@zeta/quiet", "/zeta/quiets")).toBeNull();
    expect(listPageHead("@nowhere/thing", "/nowhere/things")).toBeNull();
  });
});
