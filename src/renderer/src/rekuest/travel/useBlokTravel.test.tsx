// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/rekuest/api/graphql", () => ({ CheckoutAgentDocument: {} }));
vi.mock("@/rekuest/api/hooks", () => ({ useRekuest: () => null }));
vi.mock("@/rekuest/hooks/useLiveState", () => ({
  useAgentLiveState: () => ({ value: null, revision: null }),
}));

import { EMPTY_TRAVEL_STATE, type TravelClock, type TravelSource } from "./travelSource";
import { useTravelController, type BlokTravel } from "./useBlokTravel";

/** An hour ago, on a whole millisecond: far from the live edge. */
const PAST = Math.floor(Date.now()) - 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

/** A source that only keeps a clock, so the controller's own rules are what is tested. */
const makeFake = () => {
  let clock: TravelClock = {
    at: Date.now(),
    playing: false,
    rate: 1,
    phase: "ready",
    prevChangeAt: null,
    nextChangeAt: null,
    missing: [],
    error: null,
  };
  const listeners = new Set<() => void>();
  const set = (next: Partial<TravelClock>) => {
    clock = { ...clock, ...next };
    listeners.forEach((listener) => listener());
  };
  const source = {
    acquire: vi.fn(() => () => {}),
    getSnapshot: () => EMPTY_TRAVEL_STATE,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getClock: () => clock,
    seek: vi.fn((at: number, _immediate?: boolean) => set({ at })),
    step: vi.fn(),
    play: vi.fn(() => set({ playing: true })),
    pause: vi.fn(() => set({ playing: false })),
    setRate: vi.fn((rate: number) => set({ rate })),
    stop: vi.fn(),
  } satisfies TravelSource;
  return { source, set };
};

const mount = (entry: string) => {
  const fake = makeFake();
  const seen: { travel: BlokTravel | null; search: string } = { travel: null, search: "" };
  const Probe = () => {
    seen.travel = useTravelController(fake.source);
    seen.search = useLocation().search;
    return null;
  };
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
    </MemoryRouter>,
  );
  return {
    ...fake,
    travel: () => seen.travel as BlokTravel,
    params: () => new URLSearchParams(seen.search),
  };
};

/** Lets the batched URL write and the renders after it happen. */
const flush = () => act(async () => {});

describe("useTravelController", () => {
  it("is live and closed without a moment in the URL", () => {
    const { travel, source } = mount("/blok");
    expect(travel().open).toBe(false);
    expect(travel().travelling).toBe(false);
    expect(travel().source).toBeNull();
    expect(source.seek).not.toHaveBeenCalled();
  });

  it("opens on the moment the URL holds", async () => {
    const { travel, source } = mount(`/blok?at=${encodeURIComponent(iso(PAST))}`);
    await flush();

    expect(source.seek).toHaveBeenCalledWith(PAST, true);
    expect(travel().open).toBe(true);
    expect(travel().travelling).toBe(true);
    expect(travel().source).toBe(source);
  });

  it("leaves the URL alone while the slider is dragged, and writes it when let go", async () => {
    const { travel, params, source } = mount("/blok?tab=bindings");

    act(() => travel().scrub(PAST));
    await flush();
    expect(travel().travelling).toBe(true);
    expect(source.seek).toHaveBeenLastCalledWith(PAST);
    expect(params().get("at")).toBeNull();

    act(() => travel().commit(PAST - 1000));
    await flush();
    expect(source.seek).toHaveBeenLastCalledWith(PAST - 1000, true);
    expect(params().get("at")).toBe(iso(PAST - 1000));
    expect(params().get("tab")).toBe("bindings");
  });

  it("goes live when the slider is let go at the present", async () => {
    const { travel, params, source } = mount("/blok");

    act(() => travel().scrub(PAST));
    act(() => travel().commit(Date.now()));
    await flush();

    expect(travel().travelling).toBe(false);
    expect(travel().source).toBeNull();
    expect(source.pause).toHaveBeenCalled();
    expect(params().get("at")).toBeNull();
  });

  it("writes nothing while it plays, and where it stands once paused", async () => {
    const { travel, params, set } = mount("/blok");
    act(() => travel().commit(PAST));
    await flush();

    act(() => travel().play());
    act(() => set({ at: PAST + 5000 }));
    await flush();
    expect(params().get("at")).toBe(iso(PAST));

    act(() => travel().pause());
    await flush();
    expect(params().get("at")).toBe(iso(PAST + 5000));
  });

  it("writes the moment a step lands on", async () => {
    const { travel, params, source, set } = mount("/blok");
    act(() => travel().commit(PAST));
    await flush();

    act(() => travel().step(-1));
    expect(source.step).toHaveBeenCalledWith(-1);
    act(() => set({ at: PAST - 30_001 }));
    await flush();
    expect(params().get("at")).toBe(iso(PAST - 30_001));
  });

  it("starts a step back from the present when it was live", () => {
    const { travel, source } = mount("/blok");
    act(() => travel().step(-1));

    expect(source.seek).toHaveBeenCalledTimes(1);
    expect(source.seek.mock.calls[0][1]).toBe(true);
    expect(source.step).toHaveBeenCalledWith(-1);
    expect(travel().travelling).toBe(true);
  });

  it("takes only its own parameter out of the URL when going live", async () => {
    const { travel, params } = mount("/blok?tab=bindings");
    act(() => travel().commit(PAST));
    await flush();

    act(() => travel().goLive());
    await flush();
    expect(params().get("at")).toBeNull();
    expect(params().get("tab")).toBe("bindings");
    // The bar stays: it now says LIVE, and is where to go back from again.
    expect(travel().open).toBe(true);
    expect(travel().travelling).toBe(false);
  });

  it("goes live when the bar is closed: a past nobody can see is a trap", async () => {
    const { travel, params } = mount("/blok");
    act(() => travel().toggle());
    expect(travel().open).toBe(true);
    act(() => travel().commit(PAST));
    await flush();

    act(() => travel().toggle());
    await flush();
    expect(travel().open).toBe(false);
    expect(travel().travelling).toBe(false);
    expect(params().get("at")).toBeNull();
  });
});
