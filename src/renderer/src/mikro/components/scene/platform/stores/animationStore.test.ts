// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { describe, expect, it } from "vitest";

import { Easing } from "@/mikro/api/graphql";
import type { AnimationFragment, SceneFragment } from "@/mikro/api/graphql";
import { createAnimationStore } from "./animationStore";

const makeAnimation = (
  id: string,
  legDurations: number[] = [1000],
): AnimationFragment =>
  ({
    id,
    name: `tour ${id}`,
    description: null,
    createdAt: "2026-01-01",
    waypoints: [0, ...legDurations].map((durationMs, order) => ({
      id: `${id}-wp-${order}`,
      order,
      name: `stop ${order}`,
      durationMs,
      easing: Easing.Linear,
      camera: {
        position: { x: order * 100 },
        crossSectionOrientation: null,
        crossSectionScale: null,
        projectionOrientation: null,
        projectionScale: null,
      },
    })),
  }) as AnimationFragment;

const makeStore = (animations: AnimationFragment[] = []) =>
  createAnimationStore({
    scene: { animations } as unknown as SceneFragment,
    frame: { sceneToWorld: null, worldToScene: null, axes: null },
  });

describe("animation store — tours", () => {
  it("seeds from the scene fragment", () => {
    const store = makeStore([makeAnimation("a")]);
    expect(store.getState().animations.map((a) => a.id)).toEqual(["a"]);
  });

  it("upserts by id rather than duplicating", () => {
    const store = makeStore([makeAnimation("a")]);
    store.getState().upsertAnimation({ ...makeAnimation("a"), name: "renamed" });
    expect(store.getState().animations).toHaveLength(1);
    expect(store.getState().animations[0].name).toBe("renamed");
  });

  it("appends a tour it has not seen", () => {
    const store = makeStore([makeAnimation("a")]);
    store.getState().upsertAnimation(makeAnimation("b"));
    expect(store.getState().animations.map((a) => a.id)).toEqual(["a", "b"]);
  });

  // A tour cannot keep playing once it is gone.
  it("stops playback when the playing tour is removed", () => {
    const store = makeStore([makeAnimation("a")]);
    store.getState().play("a");
    store.getState().removeAnimation("a");
    expect(store.getState().playingId).toBeNull();
    expect(store.getState().elapsedMs).toBe(0);
  });

  it("drops the draft's edit target when that tour is removed", () => {
    const store = makeStore([makeAnimation("a")]);
    store.getState().loadDraft(store.getState().animations[0]);
    expect(store.getState().editingId).toBe("a");
    store.getState().removeAnimation("a");
    expect(store.getState().editingId).toBeNull();
  });
});

describe("animation store — playback", () => {
  it("advances the clock while the tour runs", () => {
    const store = makeStore([makeAnimation("a", [1000])]);
    store.getState().play("a");
    store.getState().advance(400);
    expect(store.getState().elapsedMs).toBe(400);
    expect(store.getState().playingId).toBe("a");
  });

  // Settle exactly on the final pose rather than wherever the delta overshot.
  it("clamps to the end and stops", () => {
    const store = makeStore([makeAnimation("a", [1000])]);
    store.getState().play("a");
    store.getState().advance(1600);
    expect(store.getState().elapsedMs).toBe(1000);
    expect(store.getState().playingId).toBeNull();
  });

  it("wraps instead of stopping when looping", () => {
    const store = makeStore([makeAnimation("a", [1000])]);
    store.getState().play("a", { loop: true });
    store.getState().advance(1200);
    expect(store.getState().elapsedMs).toBe(200);
    expect(store.getState().playingId).toBe("a");
  });

  // A tour with no travel would otherwise loop forever at 0.
  it("ends a zero-duration tour instead of dividing by it", () => {
    const store = makeStore([makeAnimation("a", [])]);
    store.getState().play("a", { loop: true });
    store.getState().advance(16);
    expect(store.getState().playingId).toBeNull();
    expect(store.getState().elapsedMs).toBe(0);
  });

  it("restarts the clock on play", () => {
    const store = makeStore([makeAnimation("a", [1000])]);
    store.getState().play("a");
    store.getState().advance(500);
    store.getState().play("a");
    expect(store.getState().elapsedMs).toBe(0);
  });

  it("keeps the loop setting when play does not restate it", () => {
    const store = makeStore([makeAnimation("a", [1000])]);
    store.getState().setLoop(true);
    store.getState().play("a");
    expect(store.getState().loop).toBe(true);
  });

  it("takes effect on a tour already playing", () => {
    const store = makeStore([makeAnimation("a", [1000])]);
    store.getState().play("a");
    store.getState().setLoop(true);
    store.getState().advance(1200);
    expect(store.getState().playingId).toBe("a");
  });

  it("does nothing when nothing is playing", () => {
    const store = makeStore([makeAnimation("a")]);
    store.getState().advance(500);
    expect(store.getState().elapsedMs).toBe(0);
  });
});

describe("animation store — draft", () => {
  it("loads a tour's stops in `order`, not array order", () => {
    const animation = makeAnimation("a", [1000, 2000]);
    const shuffled = {
      ...animation,
      waypoints: [...animation.waypoints].reverse(),
    } as AnimationFragment;
    const store = makeStore([shuffled]);
    store.getState().loadDraft(shuffled);
    expect(store.getState().draft.map((w) => w.name)).toEqual([
      "stop 0",
      "stop 1",
      "stop 2",
    ]);
  });

  it("starts an empty draft for a new tour", () => {
    const store = makeStore();
    store.getState().loadDraft(null);
    expect(store.getState().draft).toEqual([]);
    expect(store.getState().editingId).toBeNull();
  });

  it("appends captured stops with distinct keys", () => {
    const store = makeStore();
    const camera = makeAnimation("a").waypoints[0].camera;
    store.getState().addDraftWaypoint(camera);
    store.getState().addDraftWaypoint(camera);
    const keys = store.getState().draft.map((w) => w.key);
    expect(new Set(keys).size).toBe(2);
  });

  it("reorders a stop", () => {
    const store = makeStore();
    const camera = makeAnimation("a").waypoints[0].camera;
    store.getState().addDraftWaypoint(camera, "first");
    store.getState().addDraftWaypoint(camera, "second");
    store.getState().moveDraftWaypoint(store.getState().draft[1].key, -1);
    expect(store.getState().draft.map((w) => w.name)).toEqual(["second", "first"]);
  });

  it("refuses to move a stop off either end", () => {
    const store = makeStore();
    const camera = makeAnimation("a").waypoints[0].camera;
    store.getState().addDraftWaypoint(camera, "only");
    store.getState().moveDraftWaypoint(store.getState().draft[0].key, -1);
    store.getState().moveDraftWaypoint(store.getState().draft[0].key, 1);
    expect(store.getState().draft.map((w) => w.name)).toEqual(["only"]);
  });

  it("clears the draft and its edit target", () => {
    const store = makeStore([makeAnimation("a")]);
    store.getState().loadDraft(store.getState().animations[0]);
    store.getState().clearDraft();
    expect(store.getState().draft).toEqual([]);
    expect(store.getState().editingId).toBeNull();
  });
});
