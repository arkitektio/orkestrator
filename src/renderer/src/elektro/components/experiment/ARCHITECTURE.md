# The experiment renderer — module map

Elektro's timeline renderer: an `Experiment` drawn as mikro's `Scene` is, over a
time axis. It is built on the scene renderer's architecture on purpose
(`mikro/components/scene/ARCHITECTURE.md`); read that first. This file
records what is the same, what differs, and the rules the tests enforce.

## Three tiers

**`shell/` knows every feature; `features/` know `platform/`; `platform/` knows
nothing about any feature.** (`architecture.test.ts`.)

```
experiment/
  ExperimentScene.tsx   the public API — what a host renders
  experimentHost.ts     the host API — plain data a workflow may read/do
  shell/                composition root: provider, system, host, viewport,
                        chrome, the registries, the feature-slice list
  platform/             the engine: model, coords, camera, stores, drivers
                        (lifecycle only), marks, pickers, quality, sources
  features/             one folder per layer kind (+ probe, stacking, metadata): its
                        driver, its slice, its layer component, its card
```

Only `features/traces` may be imported by other features (`FEATURE_ALLOWLIST`);
`KNOWN_SIDEWAYS` is empty and stays empty — move a shared piece to `platform/`.
elektro never imports `@/mikro/**` (`sharedImports.test.ts`): shared
infrastructure is PROMOTED to `@/lib/**`.

## Stores

Three vanilla zustand stores, built once per scope by
`shell/ExperimentSceneProvider.tsx` (rebuild on the scope signature, fold on
everything else):

| Store | Holds |
|---|---|
| `experimentStore` | the folded layers (+ optimistic patches, `layerIndex`), typed raw fragments (`rawLayerOf` / `useRawLayer`), world, time origin, extents |
| `rangeStore` | the live (render plane) and committed (UI plane) windows, history |
| `viewerStore` | everything else, composed from slices |

The viewer store is ONE store of slices (one `set`), as mikro's is:

- core slices in `platform/stores/viewer/` — layout (bands, clims, and the
  `layoutVersion` / `climVersion` scalars that stand for them), stats
  (stats, readouts, labels + scalar versions and `anyLoading`), probe, viewport,
  mode, chrome (the optional reading aids: `showValueAxis`, `showGrid` and the
  one `gridSpacingPx` knob both axes share);
- FEATURE slices, passed in at composition by `shell/featureSlices.ts` and read
  through their own hooks (`makeViewerSliceHooks`): `traceSlice` (packed
  lines), `eventsSlice`, `spikesSlice`, `annotationSlice`, `pickerSlice`.

`clearLayer(id)` is the ONE cleanup of a layer's core viewer state; drivers
clear their own feature-slice entries in `dispose`.

## Drivers — where the work happens

A layer's data work is a CLASS, not a hook: `LayerDriver`
(`platform/drivers/layerDriver.ts`) — `update(layer)`, `dispose()` — built by a
factory per typename and kept in step with the drawable, visible layers by the
`LayerDriverRegistry`. Drivers take vanilla stores and injected dependencies,
so they run in node tests with `createStore` fakes.

| Driver | Reads | Publishes |
|---|---|---|
| `features/traces/TraceTileDriver` | zarr tiles (plan → read → residency → pack) | `traceSlice.packed`, stats, probe, clim seed |
| `features/events/EventTableDriver` | parquet (whole table or per committed window) | `eventsSlice.eventDraws`, readout, labels, extent |
| `features/spikes/SpikeRasterDriver` | sparse block + unit order + pickers | `spikesSlice.spikeDraws`, readout |

Scope-level services (not per drawn layer): `PickerValuesService`
(table metadata and picker value maps, shared by drivers, cards and the editor)
and `AnnotationMarksIndexer` (every annotation layer's marks, once per fold).

`shell/experimentSystem.ts` (`createExperimentSystem`) is the ONE construction
site — mikro's `createBrickSystem` — and `shell/ExperimentSystemHost.tsx`
hosts it for a scope, handing over React-context dependencies as getters so a
late dependency never rebuilds the drivers.

Layer COMPONENTS only draw: each subscribes to its own slice entry and binds its
band imperatively.

## Annotating — the scene's tools on a timeline

`features/annotations/` mirrors mikro's `RoiToolbar` / `roiDrawingStore` /
`roiSelectionStore`:

- `annotationTools.ts` — the tools (SELECT; time: EVENT, EVENTS, EPOCH; row:
  LINE, PATH, POLYGON) and ONE pure gesture machine for all of them. The
  drawer resolves pointer events to world time, world y and the trace row under
  them (`platform/coords/rowHit.ts`); the machine never reads a pixel.
- `annotationSlice` — the active tool, the draft (pointer rate, bound
  imperatively by the SVG preview) and the selection (`selectionVersion`
  scalar; one boolean per panel row).
- `useAnnotationCommit` — time shapes go to the experiment's own
  world-registered collection (`createAnnotation(experiment:)`); row shapes go
  to a per-lens VALUE COLLECTION (`valueCollections.ts`): axes = the lens'
  time (and channel) + a VALUE axis, derived from the lens by a BY_DIMENSION
  identity that drops the value. It is minted with its annotation layer on the
  first row shape, single-flight per lens space. Vertices are
  `[lens sample, lens channel, value]`; the channel is also pinned.
- Drawing: `AnnotationMarksIndexer` matches a value collection to the trace
  layers reading its lens (`derivedFrom[0].output` = the lens' space) and emits
  `rows` per (trace, drawn channel). Those draw in the trace's own units under
  `platform/marks/bandValueMatrix.ts` — the same band + clim → matrix binding
  `TraceLines` uses — so a shape stays on its trace through any relayout.
- `annotationHit.ts` — SELECT's pixel-space hit test (shapes, then instants,
  then the narrowest epoch).

## Reading the plot — axes and grid

The time axis (`shell/chrome/TimeAxis.tsx`) is always drawn; the VALUE axis
(`shell/chrome/ValueAxis.tsx`) and the grid (`ValueAxis` horizontally,
`shell/chrome/TimeGrid.tsx` vertically) are off until asked for, from the one
popover `shell/chrome/DisplaySettings.tsx` puts in the HUD.

- The value axis is **per row**, in that row's own units: rows have independent
  scales, so one axis down the side would be wrong for every row but one. On an
  OVERLAY row — several layers, several scales, one plot — the gutter shows the
  LEADING layer's scale, tinted that layer's colour; the legend keeps the
  others' ranges in full. Since `groupByDimension` only ever puts layers of ONE
  dimension in a row (see `features/stacking/stackLayout.ts`), that scale is at
  least the right kind of quantity for every line under it.
- `gridSpacingPx` drives the time axis AND the vertical grid, so a line always
  rises out of a label and the plot carries no second set of numbers. The value
  axis derives a denser target from it (`valueSpacingFor`).
- Anti-crowding lives in `platform/coords/valueTicks.ts`: a band shorter than
  `MIN_BAND_PX` is not labelled at all.
- Cadence: anything following the LIVE window (`TimeAxis`, `TimeGrid`) binds
  imperatively over a reused element pool; the value axis moves only on a
  relayout, a clim or a resize, so it renders (P17).

## Registries — adding a layer kind

Three exhaustive tables keyed by `__typename` (a missing kind is a compile
error in the first two, and draws nothing in the third):

1. `shell/layerRegistry.ts` — the component that draws it;
2. `shell/layerPanel/cardRegistry.tsx` — its card;
3. `shell/experimentSystem.ts` — its driver factory (a kind drawn straight from
   its fragment, like annotations, needs none).

Plus its fragment in `platform/stores/layerFragments.ts` and, if it publishes
draw data, a feature slice in `shell/featureSlices.ts`.

## Invariants

- **P17 — the two-plane rule.** React subscribes to scalars and single
  entries, never whole per-layer records (`storeSelectors.test.ts`, with a
  reasoned allowlist). Drivers and `bindFields` do the render-plane work.
- **Committed, not live.** Drivers wake on `committedRange`; a gesture moves
  the camera over what is already drawn.
- **Structure vs content.** A layer's structural key (source, path, channel)
  moves only on a re-placement or re-pointing; edits are content and never
  refetch (`experimentStructure.ts`, `layerPatch.ts`).
- **Never more marks than pixels** — traces pack to a min/max envelope, spikes
  and events fall back to density (`platform/marks/density.ts`).
