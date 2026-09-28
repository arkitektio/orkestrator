// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBrandTheme, setBrandBase } from "./brandTheme";
import { unwrapHue, useBrandOverride } from "./useBrandOverride";

const settings = { sceneThemeSync: true };

vi.mock("./SettingsContext", () => ({
  useSettings: () => ({ settings, setSettings: () => {} }),
}));

const BASE_HUE = 267.256;
const BASE_CHROMA = 0.20962;

/** The raw written value, which is deliberately UNWRAPPED (may sit outside
 * 0–360) so the transition takes the short arc. */
const hue = () =>
  document.documentElement.style.getPropertyValue("--brand-hue");
/** What that value actually renders as — `oklch()` reads hue modulo 360. */
const renderedHue = () => ((Number(hue()) % 360) + 360) % 360;
const chroma = () =>
  document.documentElement.style.getPropertyValue("--brand-chroma");
const isAnimating = () =>
  document.documentElement.classList.contains("brand-animating");

describe("unwrapHue", () => {
  it("takes the short way round the circle", () => {
    expect(unwrapHue(350, 10)).toBe(370);
    expect(unwrapHue(10, 350)).toBe(-10);
  });

  it("leaves short moves alone", () => {
    expect(unwrapHue(100, 140)).toBe(140);
    expect(unwrapHue(140, 100)).toBe(100);
  });

  it("stays continuous from an already-unwrapped hue", () => {
    // 370 renders as 10; the next hop to 30 must be +20, not -340.
    expect(unwrapHue(370, 30)).toBe(390);
  });

  it("handles the exact antipode deterministically", () => {
    expect(Math.abs(unwrapHue(0, 180))).toBe(180);
  });
});

describe("useBrandOverride", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetBrandTheme();
    document.documentElement.classList.remove("brand-animating");
    setBrandBase({ hue: BASE_HUE, chroma: BASE_CHROMA });
    settings.sceneThemeSync = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies the target and turns the transition on", () => {
    renderHook(() => useBrandOverride({ hue: 30, chroma: 0.2 }));

    expect(renderedHue()).toBeCloseTo(30, 5);
    expect(Number(chroma())).toBeCloseTo(0.2, 5);
    expect(isAnimating()).toBe(true);
  });

  it("reaches the target by the short arc from the user's brand hue", () => {
    // 267° → 30° is +123°, not -237°, so the written value overshoots 360.
    renderHook(() => useBrandOverride({ hue: 30, chroma: 0.2 }));

    expect(Number(hue())).toBeCloseTo(BASE_HUE + 122.744, 3);
  });

  it("restores the user's brand on unmount and releases the transition", () => {
    const { unmount } = renderHook(() => useBrandOverride({ hue: 30, chroma: 0.2 }));
    unmount();

    expect(renderedHue()).toBeCloseTo(BASE_HUE, 5);
    expect(Number(chroma())).toBeCloseTo(BASE_CHROMA, 5);

    // Held until the ease-back has had time to play out.
    expect(isAnimating()).toBe(true);
    vi.runAllTimers();
    expect(isAnimating()).toBe(false);
  });

  it("is inert when the setting is off", () => {
    settings.sceneThemeSync = false;
    renderHook(() => useBrandOverride({ hue: 30, chroma: 0.2 }));

    expect(renderedHue()).toBeCloseTo(BASE_HUE, 5);
    expect(isAnimating()).toBe(false);
  });

  it("leaves the user's brand alone for a null target", () => {
    renderHook(() => useBrandOverride(null));

    expect(renderedHue()).toBeCloseTo(BASE_HUE, 5);
    expect(isAnimating()).toBe(false);
  });

  it("applies an achromatic target's chroma, keeping the current hue", () => {
    // A grey colormap is a grey theme: the app desaturates, it does not fall
    // back to the user's brand color.
    renderHook(() => useBrandOverride({ hue: null, chroma: 0 }));

    expect(Number(chroma())).toBe(0);
    expect(renderedHue()).toBeCloseTo(BASE_HUE, 5);
    expect(isAnimating()).toBe(true);
  });

  it("desaturates in place rather than spinning the hue", () => {
    const { rerender } = renderHook(
      ({ target }: { target: { hue: number | null; chroma: number } }) =>
        useBrandOverride(target),
      { initialProps: { target: { hue: 30, chroma: 0.2 } } },
    );

    const tinted = Number(hue());

    // Selecting a grey layer next: chroma drops, hue must not move.
    rerender({ target: { hue: null, chroma: 0 } });

    expect(Number(hue())).toBe(tinted);
    expect(Number(chroma())).toBe(0);
  });

  it("writes an unwrapped hue so a wrap-around change eases the short way", () => {
    const { rerender, unmount } = renderHook(
      ({ h }: { h: number }) => useBrandOverride({ hue: h, chroma: 0.2 }),
      { initialProps: { h: 350 } },
    );

    expect(renderedHue()).toBeCloseTo(350, 5);
    const applied350 = Number(hue());

    rerender({ h: 10 });
    // 370, not 10 — a numeric transition to 10 would sweep backwards through
    // the whole circle. Both render identically.
    expect(Number(hue()) - applied350).toBeCloseTo(20, 5);
    expect(renderedHue()).toBeCloseTo(10, 5);

    unmount();
  });

  it("hands control back when the target becomes null mid-life", () => {
    const { rerender } = renderHook(
      ({ target }: { target: { hue: number; chroma: number } | null }) =>
        useBrandOverride(target),
      { initialProps: { target: { hue: 30, chroma: 0.2 } as { hue: number; chroma: number } | null } },
    );

    expect(renderedHue()).toBeCloseTo(30, 5);

    rerender({ target: null });
    expect(renderedHue()).toBeCloseTo(BASE_HUE, 5);
  });

  it("does not strip the transition from an incoming scene during handover", () => {
    const first = renderHook(() => useBrandOverride({ hue: 30, chroma: 0.2 }));
    first.unmount();

    // A new scene mounts inside the release window.
    const second = renderHook(() => useBrandOverride({ hue: 200, chroma: 0.2 }));
    vi.runAllTimers();

    expect(isAnimating()).toBe(true);
    expect(renderedHue()).toBeCloseTo(200, 5);
    second.unmount();
  });
});
