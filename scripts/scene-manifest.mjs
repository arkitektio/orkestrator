#!/usr/bin/env node
/**
 * Scene move manifest — old path -> new path for the restructure (Phase 1).
 *
 * Rules are evaluated in order; the first match wins. Tests and any sibling
 * `-worker` / `__fixtures__` files follow their target automatically, which is
 * what keeps the three `import.meta.url` sibling pairs intact.
 *
 *   node scripts/scene-manifest.mjs           # print the manifest
 *   node scripts/scene-manifest.mjs --check   # verify every file maps exactly once
 *   node scripts/scene-manifest.mjs --dirs    # summarise destination sizes
 */
import { readdirSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SCENE = join(ROOT, "src/renderer/src/mikro/components/scene");

/** [destination dir, ...basenames] — matched against the file's scene-relative dir. */
const byDir = {
  // ---- platform ---------------------------------------------------------
  "core/octree":       "features/bricks/octree",
  "core/probe":        "platform/probe",
  "render/bricks":     "features/bricks/gpu",
  "render/fabriks":    "features/meshes/fabriks",
  "render/gpu":        "platform/gpu",
  "render/labels":     "features/labels",
  "render/attributes": "platform/attributes",
  "primitives":        "platform/draw",
  "sources":           "platform/sources",
  "theme":             "shell/theme",
  "cameras":           "platform/camera",
  "layers/bricks":     "features/bricks/layers",
  "layers/image":      "features/volume",
  "layers/label":      "features/labels",
  "layers/annotation": "features/annotations",
  "layers/mesh":       "features/meshes",
  "layers/three_d":    "shell",
  "layers/two_d":      "shell",
  "panels/animation":  "features/animation",
  "panels/layer/rendergraph": "features/volume/rendergraph",
  "enhancers":         "features/annotations/enhancers",
};

/** Explicit per-file destinations. Keyed by scene-relative path (no extension). */
const byFile = {
  // ---- platform/model: the layer vocabulary every tier needs -------------
  "core/layerModel": "platform/model", "core/layerGuards": "platform/model",
  "core/dataRange": "platform/model", "core/dims": "platform/model",
  "core/layerLevel0": "platform/model", "core/layerReconcile": "platform/model",
  "core/sliceSignature": "platform/model", "core/renderGraph": "platform/model",
  "core/sceneStructure": "platform/model", "core/phasor": "platform/model",
  "panels/selectionFormat": "platform/model",
  // Feature-scoped suites, not orphans: they test layerModel's label handling
  // and renderGraph's phasor nodes, so they follow their target.
  "core/labelModel": "platform/model", "core/renderGraphPhasor": "platform/model",
  // Pure placement math reached by probe, meshes AND Scene.tsx's public
  // `hasMeshLayer` — demoted so probe->meshes stops being a feature edge.
  "layers/mesh/collectionPlacement": "platform/model",

  // ---- platform/coords --------------------------------------------------
  "core/worldTransform": "platform/coords", "core/selection": "platform/coords",
  "core/sceneUnits": "platform/coords", "core/dimRemap": "platform/coords",

  // ---- platform/camera --------------------------------------------------
  "core/cameraState": "platform/camera", "core/cameraFit": "platform/camera",
  "core/sceneFit": "platform/camera", "core/sceneNavigation": "platform/camera",
  "core/panScale": "platform/camera", "core/preferredView": "platform/camera",
  // Camera pivot math. Depends on probe only for the `ProbedCoordinate` type,
  // which Phase 2 demotes to platform/model.
  "core/orbitPivot": "platform/camera",
  "CameraMatrixSync": "platform/camera",

  // ---- platform/visibility ----------------------------------------------
  "core/visibility": "platform/visibility", "core/frustumClip": "platform/visibility",
  "core/passVisibility": "platform/visibility", "core/captureVisibility": "platform/visibility",
  "core/layerBoxes": "platform/visibility",
  "managers/visibilityTracker": "platform/visibility",

  // ---- platform/quality --------------------------------------------------
  "core/qualityGovernor": "platform/quality", "core/lodPlanning": "platform/quality",
  "core/renderCost": "platform/quality", "managers/uploadBudget": "platform/quality",
  "cameras/QualityAdapter": "platform/quality",

  // ---- platform/gpu ------------------------------------------------------
  "render/colormaps": "platform/gpu",
  "core/pixelBuffer": "platform/gpu", "core/lineBuffer": "platform/gpu",

  // ---- platform/perf -----------------------------------------------------
  "managers/perfMonitor": "platform/perf", "managers/coldOpenTimeline": "platform/perf",
  "PerfFrameProbe": "platform/perf", "core/commitProfiler": "platform/perf",

  // ---- platform/stores ---------------------------------------------------
  "store/viewStore": "platform/stores", "store/modeStore": "platform/stores",
  "store/selectionStore": "platform/stores", "store/sceneStore": "platform/stores",
  "store/viewerStore": "platform/stores",

  // ---- features/bricks ---------------------------------------------------
  "core/viewportPlanning": "features/bricks/octree",
  "managers/brickResidency": "features/bricks/residency",
  "managers/nodePlanTracker": "features/bricks/residency",
  "managers/brickSystem": "features/bricks/residency",
  "managers/BrickSystemHost": "features/bricks/residency",
  "managers/BrickSystemProvider": "features/bricks/residency",
  "managers/residentSampling": "features/bricks/residency",
  "managers/brickResidency.test": "features/bricks/residency",
  // CPU mirrors of the TSL shaders: zero fan-in BY DESIGN, so they get a named
  // folder that says so rather than looking like dead code in a grab-bag.
  "core/opacityCorrection": "features/bricks/shaderspec",
  "core/raymarchStep": "features/bricks/shaderspec",
  "core/tricubic": "features/bricks/shaderspec",
  "overlays/CenterLodReadout": "features/bricks",

  // ---- features/labels (split out of render/bricks) ----------------------
  "render/bricks/labelNodeMaterials": "features/labels",
  "render/bricks/labelUniforms": "features/labels",
  "render/bricks/labelMaterialContract.test": "features/labels",
  "panels/layer/LabelLayerCard": "features/labels",

  // ---- features/volume ---------------------------------------------------
  "managers/VolumeCompositor": "features/volume",
  "panels/layer/LevelsEditor": "features/volume",
  "panels/layer/PhasorPlot": "features/volume",

  // ---- features/annotations ----------------------------------------------
  "core/anchorVisibility": "features/annotations", "core/annotationBounds": "features/annotations",
  "core/annotationStyle": "features/annotations", "core/annotationVisibility": "features/annotations",
  "core/drawGesture": "features/annotations", "core/modeCompat": "features/annotations",
  "core/primitiveDraw": "features/annotations", "core/roiAttributeLookup": "features/annotations",
  "core/roiMeasure": "features/annotations", "core/roiOutline": "features/annotations",
  "core/selectionRepair": "features/annotations",
  "store/roiDrawingStore": "features/annotations", "store/roiSelectionStore": "features/annotations",
  "store/roiDrawSessionStore": "features/annotations",
  "store/brushSkeletonStore": "features/annotations/enhancers",
  "interactions/RectangleDrawer": "features/annotations",
  "interactions/RoiDeleteKeybinding": "features/annotations",
  "interactions/RoiDrawer": "features/annotations",
  "interactions/VertexHandles": "features/annotations",
  "interactions/useCreateSceneAnnotation": "features/annotations",
  "interactions/useDeleteSelectedRois": "features/annotations",
  "interactions/useNavigateToAnnotation": "features/annotations",
  "interactions/FocusAnnotationOnMount": "features/annotations",
  "interactions/pathFromProbe": "features/annotations",
  "overlays/RoiToolbar": "features/annotations",
  "overlays/DrawSizeReadout": "features/annotations",
  "panels/AnnotationsPanel": "features/annotations",
  "panels/RoiAttributeSection": "features/annotations",
  "panels/layer/AnnotationLayerCard": "features/annotations",
  "panels/layer/AnchorMetadata": "features/annotations",

  // ---- features/meshes ----------------------------------------------------
  "panels/MeshesPanel": "features/meshes",
  "panels/layer/MeshLayerCard": "features/meshes",
  "interactions/useNavigateToMeshObject": "features/meshes",

  // ---- features/probe -----------------------------------------------------
  "managers/AttributeProbeTracker": "features/probe",
  "managers/ProbeReadoutSettler": "features/probe",
  "interactions/ProbeAxisGuides": "features/probe",
  "interactions/DoubleClickRecenter": "features/probe",
  "panels/SelectedPointPanel": "features/probe",

  // ---- features/animation -------------------------------------------------
  "cameras/AnimationPlayer": "features/animation",
  "panels/AnimationPanel": "features/animation",

  // ---- features/debug -----------------------------------------------------
  "panels/DebugPanel": "features/debug",
  "overlays/BrickResidencyOverlay": "features/debug",

  // ---- shell ---------------------------------------------------------------
  "SceneProvider": "shell", "SceneViewport": "shell",
  "ThreeDScene": "shell", "TwoDScene": "shell",
  "SceneColumn": "shell", "SceneDock": "shell",
  "ScaleBar": "shell/chrome", "ScaleGrid": "shell/chrome",
  "layers/registry": "shell", "layers/LayerRenderer": "shell",
  "layers/SceneAxis": "shell/chrome", "layers/stubs": "shell/chrome",
  "panels/LayerControlPanel": "shell/layerPanel",
  "panels/layer/LayerRow": "shell/layerPanel",
  "panels/layer/LayerGraphFlyout": "shell/layerPanel",
  "panels/sceneSidebarTabs": "shell/chrome",
  "panels/DimSliderPanel": "shell/chrome", "panels/ZSliderPanel": "shell/chrome",
  "overlays/SceneModeControls": "shell/chrome", "overlays/SceneSettings": "shell/chrome",
  "overlays/SceneScreenshot": "shell/chrome",
  "overlays/SceneShortcuts": "shell/keyboard",
  "interactions/KeyboardLayerVisibility": "shell/keyboard",
  "interactions/KeyboardModeController": "shell/keyboard",
  "interactions/KeyboardSceneNavigation": "shell/keyboard",
  "interactions/layerVisibilityKeys": "shell/keyboard",
  "interactions/sceneShortcuts": "shell/keyboard",
  "interactions/ModeCompatGuard": "shell/keyboard",


  // ---- Phase 0 edge triage: destinations chosen to dissolve feature edges ----
  // "probe" is two things. The type vocabulary, hit-targeting and gating are
  // infrastructure that bricks, meshes, annotations and the camera all use
  // (27 would-be feature edges); only the readout UI and the trackers are a
  // feature. rafCoalesce is a plain scheduling utility misfiled under probe.
  "core/probe/useProbeMarkerBinding": "features/probe",
  "core/probe/rafCoalesce": "platform/perf",
  "core/probeWorld": "platform/probe",
  // CPU raymarch over the brick pool; BrickVolumeLayer is its only consumer.
  "core/probeMath": "features/bricks",
  // Level scale/shape geometry — the coordinate fact probeWorld and the
  // external lib/coords/transformGraph.test.ts both reach for, not a brick
  // internal.
  "core/octree/levelGeometry": "platform/coords",
  // Camera-tour easing and pose interpolation: camera math, not the animation
  // UI. Leaves features/animation as the editor + player.
  "core/animation": "platform/camera",
  // Generic attribute-plan row rendering, shared by the probe HUD and the ROI
  // detail card.
  "panels/AttributeRowsSection": "platform/layerui",

  // Label brick layers are labels, not bricks (6 edges).
  "layers/bricks/BrickLabelPlaneLayer": "features/labels",
  "layers/bricks/BrickLabelVolumeLayer": "features/labels",

  // Colormap vocabulary, not mesh streaming (5 edges).
  "render/fabriks/instanceColormaps": "platform/gpu",
  // Pure render-target/pass decisions; QualityAdapter needs them (2 edges).
  "render/volumeCompositor": "platform/gpu", "render/volumeTargetFlags": "platform/gpu",
  // CameraController and DoubleClickRecenter both read playback state (2 edges).
  "store/animationStore": "platform/stores",
  // Generic "is the user typing" guard (2 edges).
  "interactions/keyboardTarget": "platform/input",
  // A generic preview line, not an annotation part (1 edge).
  "interactions/PreviewLine": "platform/draw",
  // Mount point that wires a platform tracker and a bricks tracker together.
  "managers/VisibilityManager": "shell",

  // Shared layer-card vocabulary every feature card builds on (12 edges).
  "panels/layer/cardControls": "platform/layerui",
  "panels/layer/entrySections": "platform/layerui",
  "panels/layer/ColumnEntryEditor": "platform/layerui",
  "panels/layer/ColumnOptionPicker": "platform/layerui",
  "panels/layer/columnOptions": "platform/layerui",
  "panels/layer/DimPill": "platform/layerui",
  "panels/layer/PlacementChain": "platform/layerui",
  "panels/layer/layerIdentity": "platform/layerui",
  "panels/layer/ColormapSelect": "platform/layerui",
  "panels/layer/colormap-utils": "platform/layerui",
  "panels/layer/contrast-utils": "platform/layerui",
  "panels/layer/renderGraphSwatch": "platform/layerui",

  // Public API — stays put, export surface untouched.
  "Scene": ".",
};

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules") continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

/** Strip `.test`/`.spec` and the extension to get the manifest key. */
const keyOf = (rel) => rel.replace(/\.(test|spec)\.tsx?$/, "").replace(/\.d\.ts$|\.tsx?$/, "");

export const destinationOf = (rel) => {
  const key = keyOf(rel);
  if (byFile[key]) return byFile[key];
  const dir = dirname(rel);
  if (byDir[dir]) return byDir[dir];
  // __fixtures__ and other nested assets follow their parent directory.
  for (const [from, to] of Object.entries(byDir)) {
    if (dir.startsWith(`${from}/`)) return join(to, dir.slice(from.length + 1));
  }
  return null;
};

// The four .md docs are split by concern in the docs phase, not moved wholesale.
// Only run the CLI body when invoked directly — scene-simulate.mjs imports
// `destinationOf` and must not trigger a manifest dump.
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const files = !isMain ? [] : walk(SCENE).map((f) => relative(SCENE, f)).filter((f) => !f.endsWith(".md"));
const rows = files.map((rel) => {
  const dest = destinationOf(rel);
  return { rel, dest, to: dest === null ? null : dest === "." ? basename(rel) : join(dest, basename(rel)) };
});

if (!isMain) { /* imported as a module */ }
else if (process.argv.includes("--check")) {
  const unmapped = rows.filter((r) => r.dest === null);
  const seen = new Map();
  for (const r of rows) if (r.to) seen.set(r.to, [...(seen.get(r.to) ?? []), r.rel]);
  const collisions = [...seen].filter(([, v]) => v.length > 1);
  console.log(`${files.length} files, ${rows.length - unmapped.length} mapped, ${unmapped.length} UNMAPPED, ${collisions.length} collisions`);
  if (unmapped.length) { console.log("\nUNMAPPED:"); unmapped.forEach((r) => console.log("  " + r.rel)); }
  if (collisions.length) { console.log("\nCOLLISIONS:"); collisions.forEach(([k, v]) => console.log(`  ${k} <- ${v.join(", ")}`)); }
  process.exit(unmapped.length || collisions.length ? 1 : 0);
} else if (process.argv.includes("--dirs")) {
  const c = new Map();
  for (const r of rows) if (r.dest) c.set(r.dest, (c.get(r.dest) ?? 0) + 1);
  [...c].sort().forEach(([d, n]) => console.log(String(n).padStart(4) + "  " + d));
} else {
  rows.forEach((r) => console.log(`${r.rel}\t${r.to ?? "??"}`));
}
