// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  getEffectiveBrand,
  resetBrandTheme,
  setBrandBase,
  setBrandOverride,
  setBrandRemote,
} from "./brandTheme";

const hue = () => document.documentElement.style.getPropertyValue("--brand-hue");
const chroma = () =>
  document.documentElement.style.getPropertyValue("--brand-chroma");

const BASE = { hue: 267.256, chroma: 0.20962 };
const REMOTE = { hue: 40, chroma: 0.3 };

afterEach(() => resetBrandTheme());

describe("brand layering", () => {
  it("uses the local settings brand when nothing else is set", () => {
    setBrandBase(BASE);
    expect(hue()).toBe("267.256");
    expect(chroma()).toBe("0.20962");
  });

  it("lets the remote brand outrank the local settings brand", () => {
    setBrandBase(BASE);
    setBrandRemote(REMOTE);
    expect(hue()).toBe("40");
    expect(chroma()).toBe("0.3");
  });

  it("resolves the remote brand field by field", () => {
    setBrandBase(BASE);
    setBrandRemote({ hue: 40, chroma: undefined });
    expect(hue()).toBe("40");
    expect(chroma()).toBe("0.20962");
  });

  it("lets a scene override outrank the remote brand", () => {
    setBrandBase(BASE);
    setBrandRemote(REMOTE);
    setBrandOverride({ hue: 120, chroma: 0.05 });
    expect(hue()).toBe("120");
    expect(chroma()).toBe("0.05");
  });

  it("falls back to the remote brand — not the base — when a scene closes", () => {
    setBrandBase(BASE);
    setBrandRemote(REMOTE);
    setBrandOverride({ hue: 120, chroma: 0.05 });
    setBrandOverride(null);
    expect(hue()).toBe("40");
    expect(chroma()).toBe("0.3");
  });

  it("hands back to the local brand when the remote one is cleared", () => {
    setBrandBase(BASE);
    setBrandRemote(REMOTE);
    setBrandRemote({ hue: undefined, chroma: undefined });
    expect(hue()).toBe("267.256");
    expect(chroma()).toBe("0.20962");
  });

  it("removes the properties entirely when no source has a value", () => {
    setBrandBase({ hue: undefined, chroma: undefined });
    expect(hue()).toBe("");
    expect(chroma()).toBe("");
  });

  it("reports the effective brand a scene transition measures against", () => {
    setBrandBase(BASE);
    setBrandRemote(REMOTE);
    expect(getEffectiveBrand()).toEqual(REMOTE);
  });
});
