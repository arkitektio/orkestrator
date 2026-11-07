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
| `LayerControlPanel`, `LayerMenu`; the scene's `LayerCardShell` (`@/core/data/scene/layerui`) | `ChartLayerCardShell`, the three cards, `ChartLayerStyle` |
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

## The layer kinds

Three exhaustive tables keyed by `__typename`: `shell/layerRegistry.ts` (what
draws it), `shell/layerPanel/cardRegistry.tsx` (its card), and the driver
factories in `shell/chartSystem.ts`.

| Kind | Reads | Draws |
|---|---|---|
| `TraceChartLayer` | a lens along `alongAxis`, through the engine's tile pipeline over `mikro/lib/zarr/windowReader` | packed lines, one per position of `seriesAxis` |
| `SeriesChartLayer` | `valueColumn` against `coordinateColumn`, through the attribute service's parquet engine | one packed line |
| `AnnotationChartLayer` | its collection's annotations: fetched once, then followed live (`mikro/lib/annotations`) | SVG marks over the canvas |
| `PointsChartLayer` (BY_VALUES) | a table lens' rows at `xColumn` / `yColumn` (/ `zColumn` as colour) | dots or a line, on a panel's plane |
| `DistributionChartLayer` (BY_VALUES) | `valueColumn`, per `groupColumn` | a histogram or a box per group, on a panel's plane |

- **A trace through a large array is priced by what it decodes.** Every axis the
  lens pins is read at that one position (`fixedRanges`), a pyramid level
  downsampled along a pinned axis is dropped (it is other data), and the planner
  is told what a sample really costs (`decodeCost: "chunks"`) — one time point
  of a `(t, y, x)` stack is a whole plane. The card shows coverage.
- **A series is read whole** up to `WHOLE_TABLE_MAX` rows (pan and zoom are then
  free), and per committed window as a bucketed min/max envelope beyond it.
- **A mark is a look.** `LINE`, `MARKERS`, `LINE_MARKERS` and `STEPS` are all
  drawn from the same packed points: switching repacks, never refetches.

## One chart, two kinds of positioning

A chart has no kind. Each layer's kind says where its positions come from
(`isValuesKind`, there is no separate field): traces, series and marks are laid
along the chart's one measured axis (`Chart.axis`); points and distributions
draw a table's rows at the values of their columns. One chart
may hold both — a table framed by `t` drawn as a series and as a scatter.

The viewport is read off that (`platform/model/chartCanvas.ts`): the axis plot
alone, the value panels alone (no axis: a table's rows), or both — the axis
plot across the top, the panels beneath, the split draggable. The axis plot's
rows and renderers already skip value layers (`rowOf`, the null renderers), so
it needs no filter. Together, the axis plot's HUD carries the one layout
toggle and the loading bar.

## Layouts

How the layers share the screen is the CHART's, remembered by the server
(`Chart.layout`: STACKED, SHARED, OVERLAY), not a session choice:

- The fold notes the server's value (`chartLayoutOf`: missing → SHARED) into
  the chart store's `layout`. OVERLAY is kept: it puts every along-axis layer in
  one plot, and value panels lay it out as SHARED. It is content,
  never in `chartScopeSignature`: a switch relays out, it never rebuilds.
- `shell/ChartLayoutSync` puts it on screen (the viewer's `layoutMode`): once
  before the first paint, then only when the server's value CHANGES — a refetch
  carrying the same layout never undoes a toggle still in flight.
- The toggle (`core/data/plot/chrome/LayoutModeToggle`) writes through
  `useChartLayoutWrite`: optimistic, rolled back and reported on a refusal.
  Elektro's timeline uses the same toggle without `onChange`: session-only.
- **Value layers are panels** (`platform/model/valuesPanels.ts`,
  `shell/ValuesPanel.tsx`), a responsive grid, each panel a plane of its own
  (store, camera, canvas, probe, legend; its own zoom). STACKED: a panel per
  layer. SHARED (and OVERLAY): a panel per `valuesGroup`, decided by the fold —
  the server's rule, one kind, one mark, the same x and y units: points by the
  units of x and y; a histogram by its value's unit and whether it counts rows
  or each group's fraction; a box by its value's unit and its group column
  (its x is that column's categories). A column with no unit stands for itself,
  so unitless columns never share by accident.
- A plane's x-categories are kept per layer (`planeStore.xCategories`), like its
  extents and legends: one layer clearing its own never wipes another's.

## Probing a point

A point of a value layer is a row. A click that isn't a drag pins it
(`PlaneFrame` `onPick` → `chartStore.pinnedRow`, ringed in its panel). The
**Probe** tab (`features/probe/`) then runs the table's row plan from the
row's INDEX value: the server's `rowPlan`, executed by the same attribute-plan
machinery a scene uses (`mikro/lib/attributes`). It shows the row, a
cluster's members (REVERSE), the same row in a derived table (SAME_ROWS), and
what each row IS, as chips that open it. The client never composes what a row
reaches. See `PROBE_PLANS.md`.

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
- **Two writes.** A restyle (name, visibility, order, opacity, colour, mark,
  widths) is `updateChartLayer`, optimistic, through `useChartLayerWrite`.
  What a layer READS — its lens, its columns, its grouping and bins — is its
  kind's own update (`updateTraceChartLayer`, `…Series…`, `…Points…`,
  `…Distribution…`), edited in the card's "reads" section
  (`platform/edits/ChartLayerReads.tsx`). That one is a re-pointing, so it is
  not optimistic: it refetches `GetChart` and the fold rereads the layer. It
  answers with the id only, like the creates: a new lens is a new placement,
  and selecting `asAffine` there would reject a write that succeeded.
