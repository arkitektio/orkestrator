# The chart renderer — module map

A `Chart` drawn as elektro draws an `Experiment`: data laid out along ONE metric
axis (time, wavelength, distance, …), with values read off it. A scene is a
place; a chart is an axis.

It is built on the **plot engine** (`@/core/data/plot`), which was promoted out
of elektro's experiment renderer so that both could use it without either
importing the other. Read `elektro/components/experiment/ARCHITECTURE.md` for
the engine's own design (the two planes, drivers, the range store); this file
records what a chart adds, and the rules the tests enforce.

## Three tiers

**`shell/` knows every feature; `features/` know `platform/`; `platform/` knows
nothing about any feature.** (`architecture.test.ts`.)

```
chart/
  Chart.tsx     the public API — what a host renders (the ONLY way in)
  shell/        composition root: provider, system, host, viewport, the
                registries, the feature-slice list
  platform/     model (the layer model, the fold, mark geometry), the chart
                store, the optimistic write, the shared line drawing
  features/     one folder per layer kind: traces, series, annotations
```

No feature imports another; a shared piece moves down. Nothing here imports
`@/elektro/**` or the scene's internals — what a chart shares with the timeline
is in `@/core/data/plot`, and what it shares with the scene is in `@/mikro/lib`.

## What the engine gives, and what the chart adds

| From `@/core/data/plot` | Added here |
|---|---|
| the plot / range / viewer stores, the optimistic overlay | `chartStore` (the engine's store, typed for a chart) |
| `PlotScopeProvider` (rebuild / fold / phase) | `ChartProvider`'s spec: how a chart folds |
| `LayerDriverRegistry`, `TileLineDriver` | `SeriesTableDriver` (a table has no pyramid) |
| `AxisCamera`, `AxisTicks`, grid, value axis, overview strip, HUD | `ChartRowLabels` (the legend) |
| `PackedLine`, `markerDots`, `stepped` | `ChartLines` (a layer's `mark`) |
| `LayerControlPanel`, `CardShell`, `LayerMenu` | the three cards, `ChartLayerStyle` |
| `createGestureMachine` | `chartTools` (its tool table), the drawer, the SVG overlay |

## Placement

`ChartLayer.asAffine` is the ONLY placement authority. It is one row (the
chart's world has one axis): the coefficient on `alongAxis` is the step along
the chart's axis per step along the data, the last entry the offset. There is
no client walk of `pathToWorld` — that field is selected only as the reconcile
key (`chartStructure.layerStructureKey`).

A layer with no `asAffine`, no `alongAxis`, or a map that says nothing about the
chart's axis is NOT drawn, and its card says why (`ChartLayerPlacement`).
`asAffine` errors rather than nulls when a path will not condense, so the page
runs `GetChart` with `errorPolicy: "all"` and hands the errors to the provider.

## The three layer kinds

Three exhaustive tables keyed by `__typename`: `shell/layerRegistry.ts` (what
draws it), `shell/layerPanel/cardRegistry.tsx` (its card), and the driver
factories in `shell/chartSystem.ts`.

| Kind | Reads | Draws |
|---|---|---|
| `TraceChartLayer` | a lens along `alongAxis`, through the engine's tile pipeline over `mikro/lib/zarr/windowReader` | packed lines, one per position of `seriesAxis` |
| `SeriesChartLayer` | `valueColumn` against `coordinateColumn`, through the attribute service's parquet engine | one packed line |
| `AnnotationChartLayer` | its collection's annotations: fetched once, then followed live (`mikro/lib/annotations`) | SVG marks over the canvas |

- **A trace through a large array is priced by what it decodes.** Every axis the
  lens pins is read at that one position (`fixedRanges`), a pyramid level
  downsampled along a pinned axis is dropped (it is other data), and the planner
  is told what a sample really costs (`decodeCost: "chunks"`) — one time point
  of a `(t, y, x)` stack is a whole plane. The card shows coverage.
- **A series is read whole** up to `WHOLE_TABLE_MAX` rows (pan and zoom are then
  free), and per committed window as a bucketed min/max envelope beyond it.
- **A mark is a look.** `LINE`, `MARKERS`, `LINE_MARKERS` and `STEPS` are all
  drawn from the same packed points: switching repacks, never refetches.

## Rows and scales

Default layout is SHARED: layers that measure the same thing share one row and
one scale. What "the same thing" is comes from the fold (`rowGroup`), never from
a name: a series by its `valueUnit`, a trace by its dataset (the schema gives a
trace no unit). Scales are fixed gain — seeded by the first data, changed only
by an explicit autoscale — and session-only: the schema persists none.

## Annotating

A drawing surface is an annotation collection whose space has the chart's axis
and a VALUE axis. Tools (`chartTools.ts`): point, points, line, path, polygon,
box. The surface's VALUE axis is unitless, and nothing in the schema says which
row a height is read against — so there is ONE answer, used for drawing and for
reading alike: the chart's first row, on that row's scale (`valueFrame.ts`).

A chart with no drawing layer offers to add one, explicitly; a layer is never
made behind a first stroke.

## Invariants

- **P17 — the two-plane rule** (`storeSelectors.test.ts`): React subscribes to
  scalars and single entries; drivers, `bindFields` and `useMarkTransform` do
  the render-plane work.
- **Committed, not live.** Drivers wake on `committedRange`; a gesture moves the
  camera over what is already drawn.
- **Structure vs content.** A layer's structural key moves only on a
  re-registration or re-pointing; every edit is content and never rereads.
