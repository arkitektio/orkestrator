import { afterEach, describe, expect, it, vi } from "vitest";
import { getDecodedChunkCacheBytes } from "../octree/poolBudget";
import {
  decodeCacheBytesPerScene,
  forgetScene,
  onDecodeShareChange,
  resetSceneDecodeBudgetForTests,
  sceneChunkCache,
  setSceneVisible,
} from "./sceneDecodeBudget";

afterEach(() => resetSceneDecodeBudgetForTests());

describe("sceneDecodeBudget", () => {
  it("gives one scene on screen the whole budget, as before", () => {
    setSceneVisible({}, true);
    expect(decodeCacheBytesPerScene()).toBe(getDecodedChunkCacheBytes());
  });

  it("splits it between the scenes on screen, and hidden scenes take no share", () => {
    const a = {};
    const b = {};
    const hidden = {};
    setSceneVisible(a, true);
    setSceneVisible(b, true);
    setSceneVisible(hidden, true);
    setSceneVisible(hidden, false);
    expect(decodeCacheBytesPerScene()).toBe(getDecodedChunkCacheBytes() / 2);

    forgetScene(b);
    expect(decodeCacheBytesPerScene()).toBe(getDecodedChunkCacheBytes());
  });

  it("tells the planners when the share moves, and only then", () => {
    const listener = vi.fn();
    const unsubscribe = onDecodeShareChange(listener);
    const scene = {};
    setSceneVisible(scene, true);
    setSceneVisible(scene, true); // no change
    setSceneVisible(scene, false);
    forgetScene(scene); // already hidden: no change
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setSceneVisible({}, true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("is one cache for every scene, sized by the session's decode budget", () => {
    expect(sceneChunkCache()).toBe(sceneChunkCache());
  });
});
