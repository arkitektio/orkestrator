import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import type { LayerLevelGeometry } from "../../../../platform/coords/levelGeometry";
import type { LayerBrickPool } from "../../residency/brickResidency";
import { resolveBrickSpec } from "../../octree/brickSpec";
import { buildPageTableLayout } from "../../octree/pageTableLayout";
import { createBrickAtlas } from "../brickAtlas";
import { createPageTableTexture } from "../pageTableTexture";

/**
 * Test-only harness: a device-free brick pool and a WGSL build of any brick
 * material through the backend's own node builder. Shared by the volume and
 * label raymarcher build tests (labels -> bricks is an allowed edge).
 */

export const testGeometry = (channelCount: number): LayerLevelGeometry =>
  ({
    dims: ["c", "z", "y", "x"],
    axes: {},
    channelCount,
    slabs: Array.from({ length: channelCount }, (_, c) => ({ kind: "channel", index: c })),
    channelSlabCount: channelCount,
    phasorBins: 0,
    exactValues: false,
    levels: [
      { spatialShape: [256, 256, 128], scale: [1, 1, 1] },
      { spatialShape: [128, 128, 128], scale: [2, 2, 1] },
      { spatialShape: [64, 64, 64], scale: [4, 4, 2] },
    ],
  }) as unknown as LayerLevelGeometry;

export const makeTestPool = (channelCount: number, dtype = "float32"): LayerBrickPool => {
  const geo = testGeometry(channelCount);
  const spec = resolveBrickSpec(geo, "3D");
  const layout = buildPageTableLayout(geo, spec.payload)!;
  const atlas = createBrickAtlas({
    spec,
    dtype,
    desiredSlots: 8,
    maxExtent: 2048,
    filter: "linear",
  });
  return {
    geometry: geo,
    spec,
    atlas,
    pageTable: createPageTableTexture(layout),
    emptyBits: 8,
    occEncodeMin: 0,
    occEncodeMax: 255,
  } as unknown as LayerBrickPool;
};

export const fragmentWgsl = (material: THREE.Material): string => {
  // A real renderer object for its node library, output transform and
  // context — never init()'d, so no adapter or device is requested.
  const renderer = new WebGPURenderer();
  // The one device query the builder makes (float32-filterable for the R32F
  // atlas): answer as the target hardware does.
  (renderer as unknown as { hasFeature: (name: string) => boolean }).hasFeature = () => true;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  const camera = new THREE.PerspectiveCamera();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder = (renderer.backend as any).createNodeBuilder(mesh, renderer);
  builder.scene = new THREE.Scene();
  builder.camera = camera;
  builder.build();
  return builder.fragmentShader as string;
};

