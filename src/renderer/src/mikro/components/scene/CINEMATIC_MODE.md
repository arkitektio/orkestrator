# Cinematic mode (lit volume)

**Status: IMPLEMENTED (Phases 0-2 of §5, plus the tone-mapping and smoothing
gates §5 did not anticipate).** The TSL sketches below are kept for their
rationale, not as current code — read them beside
`features/bricks/gpu/brickNodeMaterials.ts` (`emitFieldGradient` / `emitShade`)
and its CPU mirror `platform/gpu/shading.ts`. The invariants in §3 are the
load-bearing part of this document and are restated at each site that must
honour them.

**The user-facing shape is a CINEMATIC <-> SCIENTIFIC toggle**, session-only on
`modeStore.cinematic`, default OFF (scientific), in the `SceneSettings` gear
popover. It gates three display-space effects: volume shading (this document),
ACES tone mapping (see the correction in §2) and tricubic zoom smoothing
(`resolveSmoothThreshold`). It touches nothing quantitative — see C1.

A "cinematic mode" that shades the volume: gradient-derived normals,
Blinn-Phong key/fill, and a surface gate. Today the volume renderer has **no
lighting of any kind** — no gradients, no normals, `material.lights = false`
(`features/bricks/gpu/brickNodeMaterials.ts`, `commonMaterialSettings`, line 1256). The
ISOSURFACE projection is a first-hit test that paints a flat colormap colour, so
it renders a silhouette rather than an object.

Sibling documents: `OCTREE_RENDERER.md` — the brick-pool renderer this builds on
(§2.3 brick spec and §2.10 shader traversal are the load-bearing sections here);
`COORDINATE_SYSTEMS.md` — where `LayerState.affineMatrix` and the per-level
scales come from.

---

## 1. Why this is affordable

The naive estimate kills the idea. A central-difference gradient needs six
neighbour samples; each *looked* like it needed its own `emitResolveBrickResidency`
— a page-table walk — inside a fragment already running a 512-step ray loop over
a 16-channel loop over a 10-level walk. That is ~7× the march. Dead on arrival.

**It needs zero extra page-table walks.** 3D bricks carry a 1-voxel replicated
border holding real neighbour data, and the 3D atlas is always linear-filtered.
Six taps off the already-resolved `texelBase` land inside that border — which is
what the border is *for*. Cost drops to ~1.5× on the volume path, and ~2-5% on
the isosurface path (§4).

The chain is structural, not incidental — *3D ⟺ border ⟺ linear*:

| fact | where |
|---|---|
| `border = mode === "3D" ? 1 : 0` | `features/bricks/octree/brickSpec.ts:59` |
| `filter: spec.border > 0 ? "linear" : "nearest"` | `features/bricks/residency/brickResidency.ts:2182` |
| "3D: payload 64³, border 1 (stored 66³), LinearFilter" | `OCTREE_RENDERER.md` §2.3 |

Note the border is edge-replicated at the *volume's* outer boundary and holds
real neighbour data everywhere else (`features/bricks/octree/brickRepack.ts`). At the volume
edge the outward gradient is therefore zero — correct, there is no data out there.

Because 2D is the branch with `border = 0` and nearest filtering, and cinematic is
3D-only, there is no categorical-data caveat: the mode where the trick is unsafe
is the mode it never runs in.

## 2. Why there is no compositing rewrite

Lighting modulates colour **inside** the march, before accumulation. So
`commonMaterialSettings` is untouched — `AdditiveBlending`, `depthWrite = false`,
`toneMapped = false`, and the `vec4(outColor, 1.0)` resolve all stay exactly as
they are. No HDR target, no depth pass, no post-processing, no change to the 2D
plane compositor.

**CORRECTION (2026-08-28) — tone mapping was already ON, by accident.** Nothing
in the tree ever set `toneMapping`, and the `<Canvas>` in
`shell/SceneViewport.tsx` sets neither `flat` nor `linear`, so R3F's default
(`ACESFilmicToneMapping` + `SRGBColorSpace`) applied to every frame the scene has
ever drawn. `material.toneMapped = false` does NOT prevent this — it is a
documented no-op on the WebGPU backend (read only by WebGLRenderer/
WebGLPrograms, while the output transform runs as a separate full-screen pass).
So the scene's default was the PRETTY end, and the scientific direction is one
line: `ToneMappingSync` in `SceneViewport.tsx` now switches
ACES <-> `NoToneMapping` with the preset. Cost is bounded — three's
`getOutputCacheKey()` keys only the output pass on `renderer.toneMapping`, so a
flip recompiles one full-screen quad and leaves every brick pipeline alone.

The honest limit: the brick materials blend ADDITIVELY, so under `NoToneMapping`
a multi-channel sum above 1.0 HARD CLIPS where ACES rolled it off monotonically.
Scientific mode is therefore linear and monotone up to 1.0 and saturated above
it. That is deliberate — ACES does not fix oversaturation, it hides it — but it
is a real limit on the "screen value is a function of data value" claim and must
be stated wherever that claim is made.

The rest of this section still holds for the OTHER reading of "cinematic" —
bloom, depth of field, tone-mapped GRADING — which is genuinely structural and
roughly an order of magnitude more work. It needs the volume writing real alpha **and** depth into a
float target, which means rewriting the final resolve of all four projection modes
plus the 2D plane material, then adding three's own TSL `PostProcessing`. (Note
`@react-three/postprocessing` is in `package.json` but is WebGL-only and cannot
touch a `WebGPURenderer` — the two existing usages are on other canvases.) That
reading is deferred; see §9.

Since `e4feb722 fix: drop webgl support`, TSL only has to compile to WGSL. The
GLSL-parity tax that would have applied to any new shader work is gone.

## 3. Invariants

These are the reason this document exists. Each is cheap to honour and expensive
to rediscover.

**C1 — Lighting modulates colour only.** Never `sampleNorm`, never `weight`,
never `volAlpha`, never the iso hit test. This is what keeps the CPU transfer-math
mirrors (`features/bricks/probeMath.ts`, `features/bricks/shaderspec/opacityCorrection.ts`,
`features/bricks/octree/brickSampling.ts`, `platform/model/phasor.ts`) valid with **zero** changes —
they pin *transfer* math because the probe readout must agree with the picture,
and shading is not transfer. Break C1 and every one of those mirrors, and their
tests, comes into scope.

**C2 — `GRADIENT_H = 0.5` is an invariant, not a tuning knob.** The filter-safe
range of a slot is `[slot + 0.5, slot + slotSize - 0.5]`; the payload occupies
`[slot + 1, slot + 1 + payload)`, leaving exactly 0.5 texel of margin each side.
`h > 0.5` reaches past the border into the neighbouring slot in x/y — and in z
into the neighbouring **channel slab**, because `slotSize.z = stored.z *
channelCount` (`platform/coords/levelGeometry.ts:66`). That would silently mix another
channel's data into the normal. If a wider baseline is ever genuinely needed, the
correct move is a full `emitResolveBrickResidency` per tap (~7×), not a bigger `h`.
Guard it with a test (§8).

**C3 — Shade in physical space.** Base-voxel space is anisotropic; 5× z-steps are
routine in microscopy, and a raw base-voxel gradient gives visibly wrong normals.
`gPhys = gLvl / (levelScale * baseScale)` — one componentwise divide, one new vec3
uniform, no matrices.

**C4 — (historical) the `toBaseVoxel` y-flip and shading.** `toBaseVoxel` no
longer flips y — frames are corner-anchored with no client-side reflection
(COORDINATE_SYSTEMS.md §0) — so N, V and L live in an orientation-preserving
map of world space and dot products are trivially safe. The old caveat stands
only as a warning template: if a reflection ever re-enters the local→voxel
map, cross products (tangent frames, anisotropic shading) must handle it
explicitly; dot-product-only shading survives a consistent reflection.

**C5 — Gate `surfaceness` on the level-voxel gradient, not the physical one.**
`norm ∈ [0, 1]` over a 1-voxel baseline makes `|gLvl|` roughly dataset-independent;
`|gPhys|` scales with the dataset's physical units and would need per-dataset
retuning. This is what keeps `surfaceGain` a constant instead of a knob.

**C6 — Add no `uniformArray`.** The WebGPU 12-uniform-buffers-per-stage limit
applies to `uniformArray` — each is its own binding, and the material is already
near the limit with five (`uPageOffset`, `uLevelShape`, `uLevelScale`,
`chParamsA`, `chParamsB`; see the note at `brickNodeMaterials.ts:120`). Scalar
`uniform()` nodes share one object UBO and are free. Every uniform this design
adds is scalar or vec3.

**C7 — MIP and attenuated MIP stay unlit, by construction.**
**↳ RELAXED (2026-08-28), at the user's request.** In cinematic mode an intensity
layer sits on MIP, so under the original C7 it stayed flat while every VOLUME and
ISOSURFACE layer beside it lit up — which reads as broken, and was the complaint
that forced this. All four projections now shade.

*What is surrendered:* in a MIP, screen brightness IS max intensity along the ray,
a value you can read off the picture by eye. Shading breaks that — a bright voxel
on a grazing surface renders dimmer than the same voxel face-on. This is true
**only in cinematic mode**; scientific mode is unaffected, and that is the mode the
fidelity guarantee is written against.

*What still holds — C1, untouched.* The winner is still selected on the UNSHADED
`sampleNorm` (and for attenuated MIP on the unshaded `sampleNorm · atten`); only
the colour stored for the winner is lit. Probe readings, the shaderspec mirrors and
every early-termination bound are unchanged. A diff that shades `sampleNorm`, `av`
or either early-out is the bug.

*The dial.* Rather than pick the tradeoff by assertion, `LightRig.mipShading`
weights the diffuse term for the MAX projections only:
`diffuse_mip = mix(1, diffuse, mipShading)`. At `0` a MIP keeps its brightness
exactly and gains only highlights; at `1` it is treated identically to VOLUME.
Default `0.5`, exposed as a slider. Specular is never weighted — it ADDS light, so
it can never darken a MIP below its true value.

*Cost.* Not the iso path's 2-5%: a gradient fires on every running-max improvement,
which on a smooth monotone ramp is most steps until the `bestNorm >= 0.995`
early-out — worst case the same ~1.5-2× as lit VOLUME. It therefore rides the same
`resolveCinematic` / `litVolumeWhileActive` governor gate, inheriting
flat-while-dragging → lit-on-settle and the R2 tour override for free.

**C8 — This is not a `ProjectionMode` and not a `DisplayMode`.**
`ProjectionMode` is a backend enum (`api/graphql.ts:6402`) — a fifth member needs
a schema change. `DisplayMode` (`"2D" | "3D"`) drives brick planning
(`features/bricks/octree/nodePlanning.ts`, `resolveBrickSpec`) and is re-declared as
hand-written literal unions in several files, so a third member would silently
fail to propagate. Cinematic is a session flag that changes *how the existing*
VOLUME/ISOSURFACE branches shade.

## 4. Design

### 4.1 The gradient

Central differences on the **normalized** (post-transfer) field, six taps off the
resolved `texelBase`, no page-table walks.

Normalized rather than raw because the iso surface is *defined* in normalized
space (`sampleNorm >= isoThreshold`), so the normal must be the gradient of that
same field. The transfer is monotone, so raw would give the right direction —
except where clim clamps, where the raw gradient is nonzero but the visible field
is flat, and you would light a region that is not there. `channelNormalize` is
pure ALU, dwarfed by six texture fetches.

Which channel: track the **argmax slot** in the existing channel loop.
`chParamsA.x` is the intensity slab for channels *and* phasors, so one path covers
both kinds; cost is six taps regardless of channel count, and it lights the
structure actually on screen.

```ts
// Emits NO Loop of its own — the only reason it is safe to inline six times
// inside the ray loop (see OCTREE_RENDERER.md on the emitResolveBrickResidency
// shadowing hazard). `slot` must arrive as a .toVar().
const GRADIENT_H = 0.5; // C2 — an invariant, not a knob.

function emitFieldGradient(t, c, resolved, slot, fns) {
  const g = vec3(0.0).toVar("gradLvl");
  // EMPTY brick (status 2) → uniform field → no surface, no normal.
  If(resolved.status.lessThan(1.5), () => {
    const base = vec3(resolved.texelBase).toVar("gradBase");
    base.z.addAssign(float(int(vec4(c.chParamsA.element(slot)).x).mul(t.uChannelSlabDepth)));
    const tap = (off) => float(fns.channelNormalize(slot,
      texture3D(t.brickAtlas, base.add(off).div(t.uAtlasTexels)).r.mul(t.uAtlasScale)));
    const h = float(GRADIENT_H), hn = float(-GRADIENT_H);
    g.assign(vec3(
      tap(vec3(h, 0, 0)).sub(tap(vec3(hn, 0, 0))),
      tap(vec3(0, h, 0)).sub(tap(vec3(0, hn, 0))),
      tap(vec3(0, 0, h)).sub(tap(vec3(0, 0, hn))),
    ).mul(float(0.5).div(h))); // → d(norm)/d(level voxel)
  });
  return g;
}
```

### 4.2 Light model

**Headlight key + fixed object-space fill.** A pure headlight is flat at frame
centre (`dot(N,V) = 1` — no shape cue exactly where you are looking); a pure fixed
key can leave the specimen black. The key is the view vector, the fill is fixed in
the specimen frame — since the specimen is static, that reads as "lit in a room"
while you orbit, and costs no per-frame CPU and no camera-basis derivation.

**The view vector is loop-invariant.** `V_phys = -normalize(dirB * baseScale)`,
because `rayT > 0`. Hoist it out of the ray loop: zero per-sample cost, still
per-fragment correct under perspective.

**`surfaceness` is the term that makes or breaks this.** Where the field is flat —
homogeneous interior, noise floor — there is no surface, and lighting a noise
gradient turns dim tissue into glitter. Levoy's fix, gated per C5:

```ts
const lit = mix(baseColor, shaded, clamp(length(gLvl).mul(uSurfaceGain), 0.0, 1.0));
```

Face N at the viewer before shading (`If(dot(N, V).lessThan(0), () => N.negate())`):
the gradient points up the intensity ramp — into the object from outside, out of
it from inside — so a surface would otherwise go black purely because the ray
entered from the dense side.

Proposed defaults: `ambient 0.25, specular 0.35, shininess 32, surfaceGain 6`.

### 4.3 Where the state lives

`platform/stores/modeStore.ts` — `cinematic: boolean` + `setCinematic`, session-only, per
scene, resets on scene change. `BrickVolumeLayer` already imports `useModeStore`
and `SceneSettings` already reads both stores, so it costs nothing.

Recorded tension: `cinematic` is semantically a *view* setting, and its popover
siblings (`showScaleBar`, `showScaleGrid`, `debug`) all live in `viewerStore`, as
does `probeThreshold` — the closest precedent. `modeStore` was chosen; the move is
one line if it reads wrong in review.

## 5. Phases

**Phase 0 — unblock the iso threshold (~3h). DONE.** *(Premise corrected: the
uniform IS written — `BrickVolumeLayer.tsx` pushed a hardcoded `0.5` through
`updateMergedMemberNodes`, so the plumbing already existed and only a store
field and a control were missing.)* `isoThreshold` is a per-member uniform node
(`brickNodeMaterials.ts:1552`, default 0.5). Isosurface is
permanently pinned at 0.5, and a shaded iso is worthless without a working
threshold. It *must* be session-only: `ProjectionNode` (`api/graphql.ts`) is
`{children, kind, label, mode}` — there is no threshold field to persist to.

It landed on `modeStore.isoThreshold`, NOT on `probeSlice`: it is a render
uniform that defines what the isosurface IS, whereas `probeThreshold` only tunes
how a first-hit probe marches. The probe HUD's slider block is the right UI
template (now factored out as `SliderRow` in `SceneSettings.tsx`), not the right
home.

**Phase 1 — lit ISOSURFACE (~1 day). The honest first cut.** One gradient per
*ray* — at the hit, then `Break` — so ~2-5% cost. The best win per unit effort in
this document: it turns a flat silhouette into an object.

**Phase 2 — lit VOLUME + governor knob (~0.5-1 day).** One gradient per
*contributing* sample; gate on `uCinematic > 0.5 AND a > 0.01` so samples that
contribute nothing pay nothing. ~1.5-2×. Shade `sampleColor` before
`volColor.addAssign`; `a` and `volAlpha` untouched (C1). Add
`litVolumeWhileActive` to `QualityProfile` (true for HIGH, false for MEDIUM/LOW):
slow GPUs go flat while you drag and snap to lit when you settle — the
active/settled contract the scene already has.

**Phase 3 — AO / shadow probe on ISO (optional, ~1-2 days).** A short march from
the iso hit toward the fill light, O(1)/pixel. Needs the march refactored into a
reusable emitter and a **second Loop nested inside the ray loop** — where the TSL
shadowing hazard bites hardest. Loop iterator names are not auto-renamed the way
`.toVar()` names are, so an explicit unique `name:` is mandatory. Separate project.

## 6. File map

| file | change |
|---|---|
| `platform/gpu/shading.ts` | **new, pure**: `GRADIENT_H`, `physicalGradient`, `surfaceness`, `blinnPhong`, `CINEMATIC_DEFAULTS`. House style of `platform/model/phasor.ts`. |
| `features/bricks/gpu/brickNodeMaterials.ts` | `length` into the TSL destructure; scalar uniforms `uCinematic`, `uBaseScale`, `uAmbient`, `uSpecular`, `uShininess`, `uSurfaceGain` (C6); `emitFieldGradient` + `emitShade`; argmax `domSlot` in the channel loop (~991); hoist `vPhys`; shade in the ISO (~1039) and VOLUME (~1028) branches. |
| `features/bricks/layers/BrickVolumeLayer.tsx` | read `useModeStore(s => s.cinematic)`; push `uCinematic` in the existing uniform effect (~179-200); set `uBaseScale` in the `bundle` useMemo beside `uBaseShape`. |
| `platform/stores/modeStore.ts` | `cinematic` + setter. |
| `platform/stores/modeStore.ts` | Phase 0: `isoThreshold` + setter; plus `cinematic` and `lightRig`. |
| `shell/SceneViewport.tsx` | `ToneMappingSync` — the ACES <-> NoToneMapping gate (§2 correction). |
| `shell/chrome/SceneSettings.tsx` | `CinematicSection`: the toggle, the iso-threshold slider, and the light rig. |
| `platform/quality/qualityGovernor.ts` | `litVolumeWhileActive` + pure `resolveCinematic`; `resolveSmoothThreshold` gained the `cinematic` argument. |
| `features/bricks/layers/useVolumeRayUniforms.ts` | `uCinematic` joins the step-scale driver's per-variant values (tier/activity cadence); `animationPlaying` rides the variant for R2. |
| `OCTREE_RENDERER.md` | C2 as a numbered invariant beside the existing pitfalls. |

`uCinematic` is dynamically uniform across the draw, so the branch is coherent on
GPU — no divergence, and one material per pool `structureSignature` still holds.

**UI copy matters here.** `cinematic` is scene-wide but projection is per-layer, so
"disable the toggle when it would do nothing" needs a scene↔layer coupling that
does not exist and is not worth building. Keep the toggle always enabled and put
the truth in the label: *"Lights VOLUME and ISOSURFACE layers. MIP is unaffected."*

## 7. Risks

**R1 — Register pressure (the highest real risk).** Six taps and a dozen vec3s
enter an already-enormous shader, and register allocation is *static* — occupancy
may drop even with cinematic **off**. Plan B: two material variants keyed on
`cinematic` in the `useMemo` deps; the pool is unchanged, so toggling rebuilds only
the material — a one-time hitch on a deliberate toggle. Do not do this
pre-emptively: it doubles compile time and breaks the one-material-per-pool
contract.

**R2 — Camera tours render unlit, exactly where cinematic matters most.**
`CameraMatrixSync`'s `useFrame` calls `updateCameraData(..., true)` during motion,
which sets `viewStore.cameraMoving` (`platform/stores/viewStore.ts:62`). `AnimationPlayer`
drives the camera continuously, so a playing tour is permanently "active" → on
MEDIUM/LOW, Phase 2's governor gate renders it flat. A tour is a deliberate
artifact, not an interaction: quality should win over framerate. Compute
`active = (cameraMoving && !animationPlaying) || isStreaming()` **for the cinematic
decision only** (leave DPR and step scale alone); subscribe
`useAnimationStore(s => s.playingId !== null)` — a rare-cadence scalar, P17-clean.

**R3 — Lit VOLUME has no shadows.** Per-sample shadow rays are O(n²). Half-angle
slicing (Kniss) is the correct fix and is a rewrite of the march, not a feature.
`surfaceness` + Blinn-Phong is ~80% of the perceived win at ~0 extra cost. This is
the industry-normal tradeoff; say so rather than promise shadows.

**R4 — Phasor layers**: the gradient is of *intensity* while the colour is the
*lifetime hue*. Correct, and it mirrors the existing "rank by intensity, never by
phasor value" rule (~987-990) — but confirm it on real phasor data.

**R5 — Additive blending + specular** can push a highlight above 1.0 where the
colormap is dark. That is what a specular is; `surfaceness` keeps it on real
surfaces. Watch the first multi-layer scene.

**R6 — Non-uniformly-scaled or sheared layer affines** distort normals. C3 is
exact up to the layer's `affineMatrix` rotation, which only re-aims a fixed light
and does not touch a headlight. Rare. Documented, not fixed.

## 8. What can and cannot be verified

**Automatable (vitest + tsc):**
- `platform/gpu/shading.ts` pure math: dot-product invariance under the y-flip reflection
  (C4); headlight never dark; `surfaceness` clamps; `physicalGradient` exact under
  anisotropic scale.
- **The highest-value test here:** assert `GRADIENT_H <= resolveBrickSpec(geo,
  "3D", …).border` across the specs `resolveBrickSpec` can produce, including the
  payload-doubling path. If anyone sets `border: 0` for 3D, or bumps `GRADIENT_H`
  "for a smoother normal", this fires — instead of the render silently mixing an
  adjacent channel into the normals (C2).
- `resolveCinematic` truth table (tier × cinematic × active × playing).
- `modeStore.cinematic` and `viewerStore.isoThreshold` defaults + setters.

**Eye-only — no automated path exists:**
- **That this TSL compiles to valid WGSL at all.** `vitest.config.ts` runs
  node/jsdom, `vitest.setup.ts` stubs no GPU, and `WGSLNodeBuilder` needs a real
  device. This is the single biggest unverifiable and the most likely thing to be
  wrong on first run — budget a debug round-trip.
- Normal orientation, specular blowout, whether `surfaceGain = 6` and the fill
  direction flatter real data, actual frame cost.
- `platform/gpu/shading.ts` would prove the TS is right, **not** that the TSL matches it —
  the same caveat the existing `phasor.ts` / `opacityCorrection.ts` mirrors carry.
  Do not oversell it.

## 9. Deferred on purpose

- **Post-processing** — **NO LONGER DEFERRED for bloom and grading**; see §10.
  DOF remains deferred, and §10 records exactly why.
- **Volumetric shadows / half-angle slicing** — R3.
- **Persisting cinematic** — session-only by choice, and it stayed that way.
  There is no precedent for persisting a viewer preference to the backend; the
  two options are the render-graph mutation (per-layer, wrong granularity for a
  scene-wide light) or the `localStorage` pattern `qualityGovernor` uses for its
  learned tier.
- **A configurable light DIRECTION rig** (direction, colour, multiple lights) —
  the zero-configuration key+fill is the point. *(The four scalars — ambient,
  specular, shininess, surfaceGain — were shipped as sliders because
  `surfaceGain` in particular needs tuning against real data. The directions are
  still fixed by design.)*

---

## 10. Post-processing (2026-08-28) — bloom + grading, on the target

**Three corrections to §2/§9's premise**, all verified against the installed three
0.184:

1. **`PostProcessing` is deprecated** — renamed `RenderPipeline` in r183, and
   `renderAsync()` deprecated in r181 in favour of a synchronous `render()`. The
   `frameloop="demand"` objection dissolves. (In the end neither is needed — see
   below.)
2. **The TSL display nodes are NOT in `three/tsl`.** That barrel ships only the core
   `src/nodes/display/*` set — `pass`, `renderOutput`, `luminance`, `nodeObject` and
   the `ColorAdjustment` family (`saturation`, `vibrance`, `hue`). Bloom and the rest
   live in the addons: `three/examples/jsm/tsl/display/BloomNode.js` → `bloom`.
   `platform/gpu/volumePost.test.ts` asserts that specifier still resolves and that
   the graph builds.
3. **"Filmic grading" is not `film`** — `FilmNode` is grain and scanlines. Grading is
   `renderOutput` tone mapping (already wired to the preset), `lut3D`, and
   `ColorAdjustment`.

### The design: post the VOLUME TARGET, not the scene

`VolumeCompositor` already renders volumes — and only volumes — into a private
offscreen `HalfFloatType` target and adds it back with `(One, One)` on both colour
and alpha. The whole chain therefore lives in that composite quad's `colorNode`
(`platform/gpu/volumePost.ts`), which buys:

- **Furniture excluded for free** — no glow on the scale grid, origin axis, ROI
  outlines, `Line2` track lines, vertex handles or point sprites. There is no
  post-eligibility mechanism in the scene (`passVisibility.ts` gates per PASS), so
  the `pass(scene, camera)` route would have needed a second pass for chrome.
- **No frame-loop takeover** — the compositor already owns the frame via
  `useFrame(cb, 1)` and a second priority>0 subscriber would double-render. Nothing
  new subscribes; no render call changes.
- **No `RenderPipeline` at all** — `BloomNode.updateBefore` sizes itself from the
  renderer and saves/restores renderer state via `RendererUtils`, so it is
  self-contained inside any material's node graph.

**Alpha is the load-bearing detail.** The canvas is transparent over a DOM
background div, so accumulated alpha is what makes a volume visible (§2's note on
`commonMaterialSettings`). A bloom halo extends past the volume's footprint where
`base.a` is 0: leave alpha alone and the halo never appears; sum the bloom's own
alpha and the frame goes milky. The chain uses
`alpha = clamp(base.a + luminance(glow.rgb), 0, 1)` — the halo earns exactly as much
coverage as it has brightness. **This is the thing to check first on a GPU**;
`GaussianBlurNode`'s `premultipliedGaussianBlur` is the fallback.

**Scientific mode emits nothing.** A strength-0 bloom uniform still executes every
downsample and upsample, so the material is REBUILT on the cinematic edge and the
passthrough build is bit-for-bit the old `texture(map, screenUV)`. Value changes ride
BloomNode's own uniform nodes and never rebuild.

### Known limitations, deliberate

- **Screenshots have no post.** `SceneScreenshot` hides the composite quad (it is
  `EXCLUDE_FROM_CAPTURE`) and re-raymarches the volumes live at capture resolution —
  the capture takes the DIRECT path and never touches this chain. Fixing it means
  routing the capture through a compositor-like path at capture size.
- **3D only.** It depends on the volume compositor, which is now unconditional —
  it used to ride the `orkestrator.volumeTarget` kill switch, and with the
  compositor off there was no target and so no post (OCTREE_RENDERER.md §6.9).
  `TwoDScene` gets none.
- **`CanvasHueProbe`** samples canvas pixels for the brand hue; bloom shifts it.

### DOF: still deferred, and now with the reasons

- The volume is `depthWrite = false`, additive and `BackSide`, and its resolve
  returns `vec4(outColor, 1.0)` — there is no per-pixel depth today.
- The target has `depthBuffer: true` but **no `depthTexture`**, so nothing is
  sampleable.
- **MIP and attenuated MIP have no meaningful depth at all** — an argmax position is
  not a surface. VOLUME has only a statistical depth (a `volAlpha` crossing).
  ISOSURFACE is the one mode with a defensible depth: `rayT` at the first hit.
- `PassNode.getViewZNode()` calls `perspectiveDepthToViewZ` unconditionally in
  0.184, so it is wrong under the orthographic cameras this scene supports.

The door that is open: ISOSURFACE-only, perspective-only DOF, by storing `rayT` at
the hit and adding a `DepthTexture` to the volume target.
