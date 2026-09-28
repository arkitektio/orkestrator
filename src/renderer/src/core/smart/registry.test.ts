import { describe, expect, it } from "vitest";

import { SmartRegistry } from "./registry";

describe("SmartRegistry.isDatum", () => {
  it("is false for anything unregistered", () => {
    expect(new SmartRegistry().isDatum("@nowhere/thing")).toBe(false);
  });

  it("reports the registered datum flag", () => {
    const registry = new SmartRegistry();
    registry.register({ identifier: "@mikro/image", path: "mikro/images", datum: true });
    registry.register({ identifier: "@rekuest/action", path: "rekuest/actions", datum: false });

    expect(registry.isDatum("@mikro/image")).toBe(true);
    expect(registry.isDatum("@rekuest/action")).toBe(false);
  });
});
