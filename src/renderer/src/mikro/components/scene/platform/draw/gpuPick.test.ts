// @vitest-environment jsdom
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import {
  GpuPicker,
  MAX_PICK_ORDINAL,
  PICK_REGION_PX,
  createPickScheduler,
  decodePickRegion,
  decodePickTexel,
  encodePickTexel,
  pickScanOrder,
  pickViewOffset,
  pickWorldPosition,
  readbackFloatsPerRow,
  type GpuPickSource,
  type PickRenderer,
} from "./gpuPick";

describe("the pick texel", () => {
  it("round-trips ordinal, slot and depth", () => {
    for (const [ordinal, slot, depth] of [
      [0, 0, 1.5],
      [41, 3, 0.25],
      [MAX_PICK_ORDINAL, 254, 1e4],
    ] as const) {
      const [r, g, b] = encodePickTexel(ordinal, slot, depth);
      expect(decodePickTexel(r, g, b)).toEqual({ ordinal, slot, viewDepth: depth });
    }
  });

  it("keeps the largest ordinal exact through float32", () => {
    const [r, g, b] = Float32Array.from(encodePickTexel(MAX_PICK_ORDINAL, 1, 2));
    expect(decodePickTexel(r, g, b)?.ordinal).toBe(MAX_PICK_ORDINAL);
  });

  it("reads the clear (and garbage) as nothing", () => {
    expect(decodePickTexel(0, 0, 0)).toBeNull();
    expect(decodePickTexel(5, 0, 1)).toBeNull(); // no slot: never written by a source
    expect(decodePickTexel(Number.NaN, 1, 1)).toBeNull();
  });
});

describe("the pick region", () => {
  it("pads readback rows to 256 bytes", () => {
    expect(readbackFloatsPerRow(1)).toBe(64);
    expect(readbackFloatsPerRow(5)).toBe(64); // 80 bytes -> 256
    expect(readbackFloatsPerRow(17)).toBe(128); // 272 bytes -> 512
  });

  it("offsets the view so the region is centred on the pointer's pixel", () => {
    expect(pickViewOffset({ x: 100.7, y: 40.2 }, { width: 800, height: 600 }, 5)).toEqual({
      fullWidth: 800,
      fullHeight: 600,
      x: 98,
      y: 38,
      width: 5,
      height: 5,
    });
    // At the corner the region hangs off the view; setViewOffset allows it.
    expect(pickViewOffset({ x: 0, y: 0 }, { width: 10, height: 10 }, 5)).toMatchObject({ x: -2, y: -2 });
  });

  it("scans nearest to the centre first", () => {
    const order = pickScanOrder(5);
    expect(order).toHaveLength(25);
    expect(order[0]).toEqual([2, 2]);
    // The four direct neighbours before any diagonal.
    expect(order.slice(1, 5).every(([c, r]) => Math.abs(c - 2) + Math.abs(r - 2) === 1)).toBe(true);
    expect(order[order.length - 1]).toEqual([4, 4]);
  });

  const region = (texels: [column: number, row: number, ordinal: number, slot: number, depth: number][]) => {
    const perRow = readbackFloatsPerRow(PICK_REGION_PX);
    const data = new Float32Array(perRow * (PICK_REGION_PX - 1) + PICK_REGION_PX * 4);
    for (const [c, r, ordinal, slot, depth] of texels) {
      data.set(encodePickTexel(ordinal, slot, depth), r * perRow + c * 4);
    }
    return data;
  };

  it("prefers the centre texel over any near miss", () => {
    const data = region([
      [2, 1, 9, 0, 1],
      [2, 2, 4, 1, 3],
    ]);
    expect(decodePickRegion(data, PICK_REGION_PX)).toMatchObject({ ordinal: 4, slot: 1, column: 2, row: 2 });
  });

  it("falls back to the nearest near miss, honouring the row padding", () => {
    const data = region([
      [0, 0, 1, 0, 1],
      [3, 3, 7, 2, 5],
    ]);
    expect(decodePickRegion(data, PICK_REGION_PX)).toMatchObject({
      ordinal: 7,
      slot: 2,
      viewDepth: 5,
      column: 3,
      row: 3,
    });
    expect(decodePickRegion(region([]), PICK_REGION_PX)).toBeNull();
  });
});

describe("pickWorldPosition", () => {
  it("puts the centre texel on the view axis at the written depth (perspective)", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(1, 2, 10);
    camera.updateMatrixWorld();
    const world = pickWorldPosition(camera, 5, 2, 2, 4);
    expect(world.x).toBeCloseTo(1);
    expect(world.y).toBeCloseTo(2);
    expect(world.z).toBeCloseTo(6);
  });

  it("puts an off-centre texel on its own ray, at the same view depth", () => {
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    camera.updateMatrixWorld();
    // Column 4 of 5 is NDC x = 0.8; at 90° vertical fov and aspect 1 the ray
    // there has slope 0.8, so at depth 10 it is 8 to the right. Row 0 is TOP.
    const world = pickWorldPosition(camera, 5, 4, 0, 10);
    expect(world.x).toBeCloseTo(8);
    expect(world.y).toBeCloseTo(8);
    expect(world.z).toBeCloseTo(-10);
  });

  it("re-seats an orthographic texel at the written depth", () => {
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    camera.updateMatrixWorld();
    const world = pickWorldPosition(camera, 5, 2, 2, 7);
    expect(world.toArray().map((v) => Number(v.toFixed(6)))).toEqual([0, 0, -7]);
  });
});

describe("createPickScheduler", () => {
  const deferred = () => {
    let resolve!: (value: string) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<string>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  const harness = () => {
    const runs: { req: number; job: ReturnType<typeof deferred> }[] = [];
    const errors: unknown[] = [];
    const scheduler = createPickScheduler<number, string>({
      run: (req) => {
        const job = deferred();
        runs.push({ req, job });
        return job.promise;
      },
      same: (a, b) => a === b,
      onError: (error) => errors.push(error),
    });
    return { runs, errors, scheduler };
  };

  it("keeps at most one pick in flight, and the latest waiting request wins", async () => {
    const { runs, scheduler } = harness();
    const seen: string[] = [];
    scheduler.request("hover", 1, (r) => seen.push(`1:${r}`));
    scheduler.request("hover", 2, (r) => seen.push(`2:${r}`));
    scheduler.request("hover", 3, (r) => seen.push(`3:${r}`));
    expect(runs.map((r) => r.req)).toEqual([1]);
    expect(scheduler.busy).toBe(true);

    runs[0].job.resolve("a");
    await flush();
    // 2 was superseded by 3 while 1 was in flight: never run, never answered.
    expect(runs.map((r) => r.req)).toEqual([1, 3]);
    runs[1].job.resolve("b");
    await flush();
    expect(seen).toEqual(["1:a", "3:b"]);
    expect(scheduler.busy).toBe(false);
  });

  it("drains a waiting click before a waiting hover, and never drops the click", async () => {
    const { runs, scheduler } = harness();
    const seen: string[] = [];
    scheduler.request("hover", 1, (r) => seen.push(`h1:${r}`));
    scheduler.request("click", 2, (r) => seen.push(`c2:${r}`));
    scheduler.request("hover", 3, (r) => seen.push(`h3:${r}`));
    scheduler.request("hover", 4, (r) => seen.push(`h4:${r}`));
    runs[0].job.resolve("x");
    await flush();
    expect(runs.map((r) => r.req)).toEqual([1, 2]);
    runs[1].job.resolve("y");
    await flush();
    runs[2].job.resolve("z");
    await flush();
    expect(runs.map((r) => r.req)).toEqual([1, 2, 4]);
    expect(seen).toEqual(["h1:x", "c2:y", "h4:z"]);
  });

  it("shares one run between equal requests (two layers, one pointer event)", async () => {
    const { runs, scheduler } = harness();
    const seen: string[] = [];
    scheduler.request("hover", 5, (r) => seen.push(`a:${r}`));
    scheduler.request("hover", 5, (r) => seen.push(`b:${r}`)); // joins the in-flight run
    scheduler.request("hover", 6, (r) => seen.push(`c:${r}`));
    scheduler.request("hover", 6, (r) => seen.push(`d:${r}`)); // joins the waiting one
    runs[0].job.resolve("p");
    await flush();
    runs[1].job.resolve("q");
    await flush();
    expect(runs).toHaveLength(2);
    expect(seen).toEqual(["a:p", "b:p", "c:q", "d:q"]);
  });

  it("reports a failed run and keeps draining", async () => {
    const { runs, errors, scheduler } = harness();
    const seen: string[] = [];
    scheduler.request("hover", 1, (r) => seen.push(r));
    scheduler.request("hover", 2, (r) => seen.push(r));
    runs[0].job.reject(new Error("lost"));
    await flush();
    expect(errors).toHaveLength(1);
    runs[1].job.resolve("ok");
    await flush();
    expect(seen).toEqual(["ok"]);
  });
});

describe("GpuPicker", () => {
  const canvas = () => {
    const element = document.createElement("canvas");
    element.getBoundingClientRect = () =>
      ({ left: 10, top: 20, width: 200, height: 100, right: 210, bottom: 120 }) as DOMRect;
    return element;
  };

  const fakeRenderer = (onRender: (root: THREE.Object3D, camera: THREE.Camera) => void) => {
    const perRow = readbackFloatsPerRow(PICK_REGION_PX);
    let pixels = new Float32Array(perRow * PICK_REGION_PX);
    let target: THREE.RenderTarget | null = null;
    const renderer: PickRenderer & { pixels: (data: Float32Array) => void } = {
      domElement: canvas(),
      getRenderTarget: () => target,
      setRenderTarget: (next) => {
        target = next;
      },
      getClearColor: (out) => out.set(0x123456),
      getClearAlpha: () => 0.5,
      setClearColor: vi.fn(),
      autoClear: true,
      render: (root, camera) => onRender(root, camera),
      readRenderTargetPixelsAsync: async () => pixels,
      pixels: (data) => {
        pixels = data;
      },
    };
    return renderer;
  };

  const source = (key: string) => {
    const root = new THREE.Group();
    const display = new THREE.MeshBasicMaterial();
    const pick = new THREE.MeshBasicMaterial();
    const drawn = new THREE.Mesh(new THREE.BufferGeometry(), display);
    const furniture = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    root.add(drawn, furniture);
    const slot = { value: -1 };
    const pickSource: GpuPickSource = {
      key,
      slot,
      root: () => root,
      pickMaterialFor: (object) => (object === drawn ? pick : null),
    };
    return { root, drawn, furniture, display, pick, slot, pickSource };
  };

  const camera = () => {
    const c = new THREE.PerspectiveCamera(50, 2, 0.1, 100);
    c.position.set(0, 0, 5);
    c.updateMatrixWorld();
    return c;
  };

  it("renders each source with its pick materials, then restores everything", async () => {
    const a = source("layer-a");
    const b = source("layer-b");
    const seen: { key: string; material: THREE.Material; furnitureVisible: boolean; slot: number; autoClear: boolean }[] = [];
    const renderer = fakeRenderer((root, pickCamera) => {
      const s = root === a.root ? a : b;
      seen.push({
        key: s.pickSource.key,
        material: s.drawn.material as THREE.Material,
        furnitureVisible: s.furniture.visible,
        slot: s.slot.value,
        autoClear: renderer.autoClear,
      });
      // The pick camera sees only the region around the pointer.
      expect((pickCamera as THREE.PerspectiveCamera).view).toMatchObject({
        enabled: true,
        fullWidth: 200,
        fullHeight: 100,
        offsetX: 50 - 2,
        offsetY: 30 - 2,
        width: PICK_REGION_PX,
        height: PICK_REGION_PX,
      });
    });
    const picker = new GpuPicker(renderer);
    picker.register(a.pickSource);
    picker.register(b.pickSource);

    // B drew the centre texel.
    const data = new Float32Array(readbackFloatsPerRow(PICK_REGION_PX) * PICK_REGION_PX);
    data.set(encodePickTexel(12, 1, 5), 2 * readbackFloatsPerRow(PICK_REGION_PX) + 2 * 4);
    renderer.pixels(data);

    const main = camera();
    const hit = await new Promise((resolve) =>
      picker.pick("click", { clientX: 60, clientY: 50, camera: main }, resolve),
    );
    expect(seen).toEqual([
      { key: "layer-a", material: a.pick, furnitureVisible: false, slot: 0, autoClear: true },
      // The second source keeps the first one's depth: nearest wins across layers.
      { key: "layer-b", material: b.pick, furnitureVisible: false, slot: 1, autoClear: false },
    ]);
    expect(hit).toMatchObject({ key: "layer-b", ordinal: 12 });
    // Depth 5 from a camera at z=5 looking down -z, centre texel: the origin-ish.
    const worldPos = (hit as { worldPos: number[] }).worldPos;
    expect(worldPos[2]).toBeCloseTo(0, 1);

    // Everything back as it was.
    expect(a.drawn.material).toBe(a.display);
    expect(b.drawn.material).toBe(b.display);
    expect(a.furniture.visible && b.furniture.visible).toBe(true);
    expect(renderer.autoClear).toBe(true);
    expect(renderer.getRenderTarget()).toBeNull();
    // The main camera was never touched.
    expect(main.view).toBeNull();
  });

  it("skips hidden sources and answers null when nothing drew", async () => {
    const a = source("layer-a");
    a.root.visible = false;
    const render = vi.fn();
    const picker = new GpuPicker(fakeRenderer(render));
    picker.register(a.pickSource);
    const hit = await new Promise((resolve) =>
      picker.pick("hover", { clientX: 60, clientY: 50, camera: camera() }, resolve),
    );
    expect(render).not.toHaveBeenCalled();
    expect(hit).toBeNull();
  });

  it("ignores a pointer outside the canvas", async () => {
    const a = source("layer-a");
    const render = vi.fn();
    const picker = new GpuPicker(fakeRenderer(render));
    picker.register(a.pickSource);
    const hit = await new Promise((resolve) =>
      picker.pick("hover", { clientX: 5, clientY: 50, camera: camera() }, resolve),
    );
    expect(hit).toBeNull();
    expect(render).not.toHaveBeenCalled();
  });

  it("turns itself off after a failed pick and restores the renderer", async () => {
    const a = source("layer-a");
    const renderer = fakeRenderer(() => {
      throw new Error("device lost");
    });
    const picker = new GpuPicker(renderer);
    picker.register(a.pickSource);
    const flipped = vi.fn();
    picker.onAvailabilityChange(flipped);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    picker.pick("click", { clientX: 60, clientY: 50, camera: camera() }, () => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    warn.mockRestore();
    expect(picker.available).toBe(false);
    expect(flipped).toHaveBeenCalledTimes(1);
    expect(a.drawn.material).toBe(a.display);
    expect(a.furniture.visible).toBe(true);
    expect(renderer.getRenderTarget()).toBeNull();
  });
});
