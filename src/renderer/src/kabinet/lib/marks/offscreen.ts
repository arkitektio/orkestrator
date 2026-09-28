/**
 * offscreen.ts — render a mark to a PNG, through ONE shared WebGL context.
 *
 * Why not a canvas per icon: browsers cap live WebGL contexts at roughly 8-16
 * and silently drop the oldest past that, so a store grid of forty apps would
 * lose most of its icons and stall the page on software GL. Instead one
 * module-level renderer draws each mark once and the list shows `<img>`. The
 * cache above it survives route changes, so grid → detail → back repaints with
 * no flicker.
 *
 * Everything here degrades to `null` rather than throwing: no WebGL (jsdom in
 * tests, a blocked GPU in the wild) simply means `AppIcon` keeps its initials.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  AMBIENT_LIGHT,
  FILL_LIGHT,
  KEY_LIGHT,
  MARK_CAMERA,
  MATERIAL,
} from "./constants";
import { geometryFor } from "./geometry";
import { colorFor, markNodes, type MarkMaterialRole } from "./markNodes";
import { markParams, type MarkInput } from "./markParams";

interface Studio {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

let studio: Studio | null = null;
/** Sticky: once the context cannot be created, stop trying on every icon. */
let unavailable = false;

/**
 * Materials are cached, not built per mark. The palette is tiny — eight
 * fallback colours, six topic base/accent pairs and one ink — so this is
 * bounded by the spec, and it takes disposal ordering out of the hot path
 * entirely. The only garbage per render is a Group of Meshes, which holds no
 * GPU resources of its own.
 */
const materials = new Map<string, THREE.MeshStandardMaterial>();

const materialFor = (role: MarkMaterialRole, hex: string) => {
  const key = `${role}|${hex}`;
  let m = materials.get(key);
  if (!m) {
    const spec = MATERIAL[role];
    m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness: spec.roughness,
      metalness: spec.metalness,
      envMapIntensity: spec.envMapIntensity,
    });
    materials.set(key, m);
  }
  return m;
};

const teardown = () => {
  if (studio) {
    studio.scene.environment?.dispose();
    studio.gl.dispose();
    studio.gl.forceContextLoss();
  }
  studio = null;
  // Materials belong to the dead context's GPU programs; drop them too. The
  // geometry cache in geometry.ts is CPU-side and re-uploads by itself.
  materials.forEach((m) => m.dispose());
  materials.clear();
};

const getStudio = (): Studio | null => {
  if (unavailable) return null;
  if (studio) return studio;
  if (typeof document === "undefined") {
    unavailable = true;
    return null;
  }

  let gl: THREE.WebGLRenderer;
  const canvas = document.createElement("canvas");
  try {
    gl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // toDataURL needs the buffer to survive the draw
      powerPreference: "low-power",
    });
  } catch {
    // jsdom returns null from getContext and three throws. One icon's worth of
    // failure is the whole feature's failure, so latch it.
    unavailable = true;
    return null;
  }

  // R3F's <Canvas> sets all of these; a bare renderer sets none but the last
  // two. Tone mapping is the one that bites: three defaults to NoToneMapping,
  // so without this every list icon comes out hotter than the live detail-page
  // mark and the two visibly stop matching.
  THREE.ColorManagement.enabled = true;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1;
  gl.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.background = null;
  const pmrem = new THREE.PMREMGenerator(gl);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose(); // the texture it produced stays valid

  const key = new THREE.DirectionalLight(KEY_LIGHT.color, KEY_LIGHT.intensity);
  key.position.set(...KEY_LIGHT.position);
  const fill = new THREE.DirectionalLight(FILL_LIGHT.color, FILL_LIGHT.intensity);
  fill.position.set(...FILL_LIGHT.position);
  scene.add(key, fill, new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT.intensity));

  // R3F points its default camera at the origin after applying the camera prop;
  // a bare PerspectiveCamera looks straight down -Z. Without the lookAt the
  // offscreen mark sits off-centre and untilted next to the live one.
  const camera = new THREE.PerspectiveCamera(
    MARK_CAMERA.fov,
    1,
    MARK_CAMERA.near,
    MARK_CAMERA.far,
  );
  camera.position.set(...MARK_CAMERA.position);
  camera.lookAt(...MARK_CAMERA.target);
  camera.updateMatrixWorld();

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    teardown();
  });

  studio = { gl, scene, camera };
  return studio;
};

/**
 * Draw one mark and return it as a PNG data URL, or `null` when there is no
 * WebGL to draw with.
 *
 * A data URL rather than `URL.createObjectURL`: cache entries get evicted, and
 * a revoked blob URL breaks any `<img>` still pointing at it while not revoking
 * leaks. A data URL that falls out of the cache stays valid in the DOM and is
 * collected when the last `<img>` lets go.
 */
export const renderMarkPng = (
  input: MarkInput,
  opts: { px: number; simple?: boolean },
): string | null => {
  const s = getStudio();
  if (!s) return null;

  const p = markParams(input);
  const scene = markNodes(p, { simple: opts.simple });

  const root = new THREE.Group();
  root.rotation.set(...scene.rotation);
  root.scale.setScalar(scene.scale);
  for (const node of scene.nodes) {
    const geometry = geometryFor(node);
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, materialFor(node.material, colorFor(p, node.material)));
    mesh.position.set(...node.position);
    mesh.rotation.set(...node.rotation);
    mesh.scale.setScalar(node.scale);
    root.add(mesh);
  }

  try {
    s.gl.setSize(opts.px, opts.px, false); // false: leave the canvas CSS alone
    s.scene.add(root);
    s.gl.render(s.scene, s.camera);
    return s.gl.domElement.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    s.scene.remove(root);
    // Geometries are the shared module cache and materials are cached above —
    // disposing either here would corrupt every other mark. Only the Group and
    // its Meshes are garbage, and they hold nothing.
    root.clear();
  }
};

/** Whether a mark can be drawn at all. Lets a caller skip straight to a fallback. */
export const marksAvailable = (): boolean => getStudio() !== null;

if (import.meta.hot) {
  // Without this, every edit to this file leaks a live WebGL context and dev
  // hits the browser's context cap after a handful of saves.
  import.meta.hot.dispose(teardown);
}
