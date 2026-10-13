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
    revision: null,
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
    seek: vi.fn((at: number, _immediate?: boolean) => set({ at, revision: null })),
    // Stands on the revision at once, in the session asked for (or one of its own).
    seekRevision: vi.fn((agentId: string, position?: { revision: number; sessionId?: string | null }, _immediate?: boolean) =>
      set({
        revision: {
          agentId,
          sessionId: position?.sessionId ?? "session-1",
          revision: position?.revision ?? 7,
          last: 20,
          hasPrev: true,
          hasNext: true,
          changes: [],
        },
      }),
    ),
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

  it("opens on the revision the URL holds, in its session", async () => {
    const { travel, source } = mount("/blok?rev=12&agent=7&session=abc");
    await flush();

    expect(source.seekRevision).toHaveBeenCalledWith("7", { revision: 12, sessionId: "abc" });
    expect(source.seek).not.toHaveBeenCalled();
    expect(travel().mode).toBe("revisions");
    expect(travel().revisionAgent).toBe("7");
    expect(travel().travelling).toBe(true);
    expect(travel().open).toBe(true);
  });

  it("switches to revisions where it stands, and writes the revision instead of the moment", async () => {
    const { travel, params, source } = mount("/blok?tab=bindings");
    act(() => travel().commit(PAST));
    await flush();

    act(() => travel().setMode("revisions", "7"));
    await flush();
    expect(source.seekRevision).toHaveBeenCalledWith("7");
    expect(travel().mode).toBe("revisions");
    expect(params().get("rev")).toBe("7");
    expect(params().get("agent")).toBe("7");
    expect(params().get("session")).toBe("session-1");
    expect(params().get("at")).toBeNull();
    expect(params().get("tab")).toBe("bindings");
    // Reading its own write back moves nothing.
    expect(source.seekRevision).toHaveBeenCalledTimes(1);
  });

  it("writes nothing for a revision that is not answered yet", async () => {
    const { travel, params, source, set } = mount("/blok");
    act(() => travel().commit(PAST));
    await flush();
    source.seekRevision.mockImplementationOnce((agentId: string) =>
      set({ phase: "loading", revision: { agentId, sessionId: null, revision: null, last: null, hasPrev: false, hasNext: false, changes: [] } }),
    );
    act(() => travel().setMode("revisions", "7"));
    await flush();
    expect(params().get("at")).toBe(iso(PAST));

    act(() => set({ phase: "ready", revision: { agentId: "7", sessionId: "s", revision: 3, last: 9, hasPrev: true, hasNext: true, changes: [] } }));
    await flush();
    expect(params().get("rev")).toBe("3");
    expect(params().get("session")).toBe("s");
  });

  it("checks out a revision by its number and goes back to the clock at its moment", async () => {
    const { travel, params, source, set } = mount("/blok");
    act(() => travel().commit(PAST));
    act(() => travel().setMode("revisions", "7"));
    await flush();

    act(() => travel().checkoutRevision(40));
    await flush();
    expect(source.seekRevision).toHaveBeenLastCalledWith("7", { revision: 40 });
    expect(params().get("rev")).toBe("40");

    act(() => set({ at: PAST - 5000 }));
    act(() => travel().setMode("time"));
    await flush();
    expect(source.seek).toHaveBeenLastCalledWith(PAST - 5000, true);
    expect(travel().mode).toBe("time");
    expect(params().get("at")).toBe(iso(PAST - 5000));
    expect(params().get("rev")).toBeNull();
    expect(params().get("agent")).toBeNull();
    expect(params().get("session")).toBeNull();
  });

  it("checks a revision out of the agent's latest session when it was live", async () => {
    const { travel, source } = mount("/blok?rev=12&agent=7&session=old");
    await flush();
    act(() => travel().goLive());
    await flush();

    act(() => travel().checkoutRevision(12));
    expect(source.seekRevision).toHaveBeenLastCalledWith("7", { revision: 12, sessionId: null });
    expect(travel().travelling).toBe(true);
  });

  it("leaves the URL alone while the revision slider is dragged, and writes it when let go", async () => {
    const { travel, params, source } = mount("/blok?rev=12&agent=7&session=abc");
    await flush();

    act(() => travel().scrubRevision(15));
    await flush();
    expect(source.seekRevision).toHaveBeenLastCalledWith("7", { revision: 15 }, false);
    expect(params().get("rev")).toBe("12");

    act(() => travel().checkoutRevision(15));
    await flush();
    expect(source.seekRevision).toHaveBeenLastCalledWith("7", { revision: 15 });
    expect(params().get("rev")).toBe("15");
  });

  it("stays live when revisions are chosen, and steps back from the agent's latest", async () => {
    const { travel, source } = mount("/blok");
    act(() => travel().setMode("revisions", "7"));
    expect(travel().travelling).toBe(false);
    expect(source.seekRevision).not.toHaveBeenCalled();

    act(() => travel().step(-1));
    expect(source.seekRevision).toHaveBeenCalledWith("7");
    expect(source.step).toHaveBeenCalledWith(-1);
    expect(travel().travelling).toBe(true);
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
