import { describe, expect, it } from "vitest";

import { withDefaults } from "../forms/assign/withDefaults";
import { askPartnerForm } from "./askPartner";

const action = { args: [{ key: "annotation" }, { key: "image" }, { key: "sigma" }] };
const keys = { annotation: { id: "a1" }, image: { id: "lens7" } };
const run = (askPartner?: boolean) => ({
  objects: [{ identifier: "@mikro/annotation", id: "a1" }],
  partners: [{ identifier: "@mikro/arraylens", id: "lens7" }],
  askPartner,
});

describe("askPartnerForm", () => {
  it("fills and hides the objects, and makes the partner a default", () => {
    expect(askPartnerForm(action, run(true), keys)).toEqual({
      args: { annotation: { id: "a1" } },
      hidden: { annotation: { id: "a1" } },
      defaults: { image: { id: "lens7" } },
    });
  });

  it("leaves a run that did not ask the usual way", () => {
    expect(askPartnerForm(action, run(false), keys)).toBeNull();
    expect(askPartnerForm(action, { ...run(true), partners: [] }, { annotation: keys.annotation })).toBeNull();
  });
});

describe("withDefaults", () => {
  it("lets the latest run win over a default, and fills what it left empty", () => {
    expect(withDefaults({ image: { id: "lens3" } }, { image: { id: "lens7" } })).toEqual({ image: { id: "lens3" } });
    expect(withDefaults({ image: null, sigma: 2 }, { image: { id: "lens7" } })).toEqual({ image: { id: "lens7" }, sigma: 2 });
    expect(withDefaults({}, { image: { id: "lens7" } })).toEqual({ image: { id: "lens7" } });
  });

  it("changes nothing without defaults", () => {
    const values = { sigma: null };
    expect(withDefaults(values)).toBe(values);
  });
});
