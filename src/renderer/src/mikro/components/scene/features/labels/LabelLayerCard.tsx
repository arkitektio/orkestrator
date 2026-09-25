import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Save, Shapes, Spline, Trash2 } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  useUpdateLabelLayerMutation,
  type LabelRenderFragment,
} from "@/mikro/api/graphql";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import { useSceneStore, type LayerState } from "../../platform/stores/sceneStore";
import {
  Badge,
  CardSection,
  IconToggle,
  LayerCardShell,
  OpacityRow,
} from "@/lib/scene/layerui/cardControls";
import { type ColumnOptionSource } from "../../platform/layerui/ColumnOptionPicker";
import {
  ColorBySection,
  FilterBySection,
  HASH_GRADIENT_CSS,
  type DefaultColorRow,
  type EntriesPatch,
} from "../../platform/layerui/entrySections";
import { colorByEntryToInput, filterByEntryToInput } from "../../platform/layerui/columnOptions";

/**
 * The card for a `LabelLayer` — an array whose values are discrete object ids
 * (a segmentation or an instance map).
 *
 * Its two substantial blocks are the same PICKER SECTIONS the mesh card
 * mounts (`entrySections.tsx`), for the same reason and over the same
 * relation: a mask's pixel values dereference into a table of objects by
 * exactly the FIELD edge a mesh collection's ids do, so `colorBys` /
 * `filterBys` mean the same thing here and the sections, the entry editor and
 * the option→input bridge are shared code rather than a second dialect.
 *
 * Everything a label layer stores is STORED — unlike the mesh card, whose
 * render settings are session-local because `updateLayer` has no home for
 * them on the server. `updateLabelLayer` takes `visible` / `opacity` /
 * `order` directly and everything else under `render`, so this card has no
 * session-only state at all.
 *
 * ONE write path, deliberately: no edit talks to the server. Every control
 * folds into the local normalized layer (live preview), marks the card dirty,
 * and the header's Save button sends the whole stored slice in one mutation —
 * the same contract as the image layer card's render-graph save. The server's
 * normalised answer (labels filled, joins normalised) folds back in on save.
 *
 * The fold after the save is not optional, and it goes through
 * `updateLayer` (the NORMALIZED list the renderer reads), never
 * `patchSceneLayer`: `syncSceneLayers` reconciles by STRUCTURE, and an
 * unchanged structure key makes it keep the previous NORMALIZED object — so a
 * `GetScene` re-emission carrying the server's new render settings is
 * discarded. Content mutations have to land in the store at their call site,
 * and in the list that is actually read.
 *
 * RE-RENDER SHAPE: same contract as the mesh card. The card re-runs whenever
 * `layer` changes — every opacity tick, since the tick folds into the store —
 * and the sections skip via memo because everything they receive is stable:
 * the persistence callbacks read the CURRENT layer through `layerRef` instead
 * of closing over it (a closure over `layer` would mint new callbacks per
 * tick and defeat every boundary below).
 *
 * NOT here, on purpose: `seed`, `background` and the selection. All three are
 * stored, fetched and honoured by the material, but none has a control yet —
 * `seed` reshuffles every colour at once (a "shuffle" button, not a number
 * field), `background` is almost always 0 and picking the wrong one blanks
 * the mask, and the selection is driven by clicking objects rather than by
 * typing ids. Each wants a designed control rather than a raw field, so they
 * wait.
 */

/** The optimistic path's patch: picker choices and plain render toggles. */
type SettingPatch = {
  activeColorBy?: number | null;
  activeFilterBys?: number[];
  contour?: boolean;
  contourWidth?: number;
};

/** Boundary widths worth a click, in base voxels. */
const CONTOUR_WIDTHS = [1, 2, 3] as const;

/** The label default is the id hash; it has no settings to unfold (the hash
 * palette lives in material uniforms with no stored home yet), so this row is
 * one module-level constant and the section's memo never sees it change. */
const LABEL_DEFAULT_ROW: DefaultColorRow = {
  title: "Color by instance id — each object id is hashed to its own hue (stored)",
  label: "instance id",
  detail: "a hue per object id",
  swatchCSS: HASH_GRADIENT_CSS,
};

/* ----------------------------------------------------------------- outline */

/**
 * A contour is a genuinely different reading of a mask — the boundaries
 * rather than the regions — so it is a toggle, not a style tweak. 2D ONLY,
 * and the section says so: each boundary test costs its own residency
 * resolve, which is affordable once per pixel and not inside a 512-step ray
 * loop.
 */
const OutlineSection = memo(function OutlineSection({
  contour,
  contourWidth,
  persistSetting,
}: {
  contour: boolean;
  contourWidth: number;
  /** MUST be stable (ref-backed in the card). */
  persistSetting: (patch: SettingPatch) => void;
}) {
  perfMonitor.countRender("OutlineSection"); // no-op unless a perf recording is armed
  return (
    <CardSection
      title="outline"
      hint={
        contour
          ? "2D only — in 3D the mask draws as a solid first-hit surface"
          : "objects draw filled"
      }
    >
      <div className="flex flex-wrap items-center gap-1">
        <IconToggle
          active={contour}
          title={contour ? "Draw objects filled" : "Draw only object boundaries (2D only)"}
          onClick={() => persistSetting({ contour: !contour })}
          icon={<Spline className="h-2.5 w-2.5" />}
          label="outline"
        />
        {contour &&
          CONTOUR_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              title={`${width} voxel${width === 1 ? "" : "s"} wide`}
              onClick={() => persistSetting({ contourWidth: width })}
              className={`rounded-md border px-1.5 py-0.5 text-[9px] leading-none transition-colors ${
                Math.round(contourWidth) === width
                  ? "border-sky-400/40 bg-sky-400/15 text-sky-100"
                  : "border-white/10 bg-black/30 text-white/45 hover:text-white/80"
              }`}
            >
              {width}px
            </button>
          ))}
      </div>
    </CardSection>
  );
});

/* -------------------------------------------------------------------- card */

export const LabelLayerCard = memo(
  ({
    layer,
    expanded,
    onSelect,
    onRemove,
  }: {
    /** Whether the card's controls are unfolded (`LayerCardShell`). */
    expanded: boolean;
    /** The panel's toggle — handed the current state, see `cardShell.tsx`. */
    onSelect: (id: string, currentlyExpanded: boolean) => void;
    /**
     * The NORMALIZED label layer, off `sceneStore.layers` — deliberately not
     * the raw fragment off `sceneLayers`.
     *
     * A label mask joined `LayerState` when it joined the brick path, and the
     * renderer reads it from there. Editing the raw fragment instead would
     * leave the two disagreeing: `patchSceneLayer` writes only `sceneLayers`,
     * so a colouring picked here would update the card and never reach the
     * material.
     */
    layer: LayerState;
    onRemove?: (id: string) => void;
  }) => {
    perfMonitor.countRender("LabelLayerCard"); // no-op unless a perf recording is armed
    const updateLayer = useSceneStore((s) => s.updateLayer);
    const [updateLabelLayer, { loading: saving }] = useUpdateLabelLayerMutation();
    const layerId = layer.id;
    const hidden = layer.visible === false;
    const lens = layer.lens;
    const render = layer.labelRender;

    // The CURRENT layer for the stable callbacks below — the fold has to
    // spread the layer it runs against, not the one the callback was created
    // against, and closing over `layer` would re-mint every callback per
    // opacity tick.
    const layerRef = useRef(layer);
    layerRef.current = layer;

    // Memoized: the `?? []` mints a new array every render, which would break
    // the sections' memo boundaries on every one of them.
    const colorBys = useMemo(() => render?.colorBys ?? [], [render?.colorBys]);
    const filterBys = useMemo(() => render?.filterBys ?? [], [render?.filterBys]);
    const activeColorBy = render?.activeColorBy ?? null;
    const activeFilterBys = useMemo(
      () => render?.activeFilterBys ?? [],
      [render?.activeFilterBys],
    );
    const contour = render?.contour ?? false;
    const contourWidth = render?.contourWidth ?? 1;

    /**
     * Fold a render patch into the store. `updateLayer` replaces the whole
     * normalized layer by id, so `labelRender` is rebuilt here — spread the
     * current one first or a picker write would drop the seed and the
     * background.
     *
     * `labelRender` is nullable, and a layer that has never been tuned has
     * none. Folding onto `{}` is right rather than defensive: the only patch
     * reachable in that state is adding a first entry, which goes through
     * `persistRender` and comes back with the server's whole render object
     * anyway.
     */
    const foldRender = useCallback(
      (patch: Partial<LabelRenderFragment>) => {
        const current = layerRef.current;
        updateLayer({
          ...current,
          labelRender: { ...current.labelRender, ...patch } as LabelRenderFragment,
        });
      },
      [updateLayer],
    );

    /**
     * NO server write per edit — the image layer card's contract, adopted
     * here: every edit folds into the LOCAL normalized layer only (the
     * material reads it there, so the preview is live), the card turns dirty,
     * and the header's Save button is the one thing that talks to the server.
     */
    const [dirty, setDirty] = useState(false);

    /** Picker choices and render toggles: fold locally, mark dirty. */
    const persistSetting = useCallback(
      (patch: SettingPatch) => {
        foldRender(patch);
        setDirty(true);
      },
      [foldRender],
    );

    /**
     * The picker CONTENTS: same local fold. The store holds input-shaped
     * entries between an edit and its save — structurally the fragments every
     * consumer reads (the cast below states exactly that) — and the server's
     * normalised answer (labels filled, joins normalised) folds in when Save
     * round-trips.
     */
    const persistRender = useCallback(
      (patch: EntriesPatch) => {
        foldRender(patch as Partial<LabelRenderFragment>);
        setDirty(true);
      },
      [foldRender],
    );

    /** Stored layer fields (visible/opacity): fold locally, saved with Save. */
    const persistLayer = useCallback(
      (patch: { visible?: boolean; opacity?: number }) => {
        updateLayer({ ...layerRef.current, ...patch });
        setDirty(true);
      },
      [updateLayer],
    );

    /**
     * The one server write: the whole stored slice — layer fields plus the
     * render settings this card manages. Entries go through the entry→input
     * mappers because one re-sent without its `joinPath` flattens to `[]`:
     * the same column name, resolved against the wrong table. Fields the card
     * does NOT manage (`seed`, `background`, the selection) are simply not
     * sent — patch semantics per field leave them untouched. The server's
     * normalised answer folds back in, and dirty clears only on success — a
     * failed save keeps the button, not silently drops the edits.
     */
    const save = useCallback(() => {
      const current = layerRef.current;
      const render = current.labelRender;
      updateLabelLayer({
        variables: {
          input: {
            id: layerId,
            visible: current.visible ?? true,
            opacity: current.opacity ?? 1,
            render: {
              colorBys: (render?.colorBys ?? []).map(colorByEntryToInput),
              filterBys: (render?.filterBys ?? []).map(filterByEntryToInput),
              activeColorBy: render?.activeColorBy ?? null,
              activeFilterBys: [...(render?.activeFilterBys ?? [])],
              contour: render?.contour ?? false,
              contourWidth: render?.contourWidth ?? 1,
            },
          },
        },
      })
        .then(({ data }) => {
          const saved = data?.updateLabelLayer.labelRender;
          if (saved) {
            foldRender({
              colorBys: saved.colorBys,
              filterBys: saved.filterBys,
              activeColorBy: saved.activeColorBy,
              activeFilterBys: saved.activeFilterBys,
            });
          }
          setDirty(false);
        })
        .catch((error) => {
          console.warn("[label] could not save the layer:", error);
        });
    }, [layerId, foldRender, updateLabelLayer]);

    /** Memoized because it crosses the sections' memo boundary as an object. */
    const source: ColumnOptionSource = useMemo(
      () => ({ kind: "label" as const, lens: lens.id }),
      [lens.id],
    );

    // Live opacity per tick (the material reads the store), persisted once on
    // release — the tick path must not hit the server.
    const setOpacity = useCallback(
      (opacity: number) => updateLayer({ ...layerRef.current, opacity }),
      [updateLayer],
    );
    const commitOpacity = useCallback(
      (opacity: number) => persistLayer({ opacity }),
      [persistLayer],
    );

    return (
      <LayerCardShell
        icon={<Shapes className="h-3 w-3 text-emerald-300" />}
        tile="bg-emerald-400/15"
        title={lens.dataset?.name?.trim() || `Labels ${layerId}`}
        hidden={hidden}
        expanded={expanded}
        onToggle={() => onSelect(layerId, expanded)}
        badges={<Badge>labels</Badge>}
        actions={
          <>
            {/* The one server write — same affordance as the image layer card's
                graph save: visible only while there is something to save. */}
            {dirty && (
              <button
                className="shrink-0 rounded p-0.5 text-yellow-300/90 transition-colors hover:text-yellow-200 disabled:opacity-50"
                title="Save changes"
                disabled={saving}
                onClick={save}
              >
                <Save className="h-3 w-3" />
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-white/45 hover:text-white/90"
              title={hidden ? "Show" : "Hide"}
              onClick={() => persistLayer({ visible: hidden })}
            >
              {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-white/35 hover:text-red-300"
                title="Remove layer from scene"
                onClick={() => onRemove(layerId)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </>
        }
      >
        <OutlineSection
          contour={contour}
          contourWidth={contourWidth}
          persistSetting={persistSetting}
        />

        <ColorBySection
          source={source}
          colorBys={colorBys}
          activeColorBy={activeColorBy}
          persistEntries={persistRender}
          persistPick={persistSetting}
          defaultRow={LABEL_DEFAULT_ROW}
        />

        <FilterBySection
          source={source}
          filterBys={filterBys}
          activeFilterBys={activeFilterBys}
          persistEntries={persistRender}
          persistPick={persistSetting}
        />

        <OpacityRow
          opacity={layer.opacity ?? 1}
          onChange={setOpacity}
          onCommit={commitOpacity}
        />
      </LayerCardShell>
    );
  },
);

LabelLayerCard.displayName = "LabelLayerCard";
