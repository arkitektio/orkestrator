// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { openRailSwitcher, useRailSwitcherRequests } from "./railSwitcher";

describe("railSwitcher", () => {
  it("delivers two consecutive requests, not one", () => {
    // A boolean would swallow the second "open it": the user can close the menu
    // themselves, and nobody tells this module when they do — so the menu has
    // to see a NEW value every time, which is why this is a counter.
    const { result } = renderHook(() => useRailSwitcherRequests());
    const before = result.current;

    act(() => openRailSwitcher());
    const once = result.current;
    act(() => openRailSwitcher());

    expect(once).not.toBe(before);
    expect(result.current).not.toBe(once);
  });

  it("stops notifying an unmounted listener", () => {
    const { result, unmount } = renderHook(() => useRailSwitcherRequests());
    const last = result.current;
    unmount();

    act(() => openRailSwitcher());

    expect(result.current).toBe(last);
  });
});
