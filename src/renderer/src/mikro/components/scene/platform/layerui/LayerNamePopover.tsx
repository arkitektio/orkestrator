import type { ApolloClient } from "@apollo/client";
import { Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";
import { Input } from "@/core/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { cn } from "@/core/util/utils";
import { useMikro } from "@/mikro/api/funcs";
import {
  GetLensDocument,
  SetPositionLabelDocument,
  type AnchorLabelsFragment,
  type GetLensQuery,
  type GetLensQueryVariables,
  type SetPositionLabelMutation,
  type SetPositionLabelMutationVariables,
} from "@/mikro/api/graphql";
import { pinSummary, slicePins, type LensPin } from "@/mikro/lenses";
import type { LayerState } from "../model/layerModel";
import { useSceneStoreApi } from "../stores/sceneStore";
import { HEADER_BUTTON } from "./headerButton";
import { Name } from "@/core/ui/name";

/**
 * The layer's name, as a button: click it to set the anchor the name comes from.
 *
 * A layer has no name of its own. What it is called is read off the metadata
 * beneath it (`layerDisplayLabel`): its lens' name, which the server composes
 * from the labels on the dataset's COORDINATE ANCHORS at the positions the lens
 * pins (`core/logic/lens_names.py`). So renaming a layer is setting that anchor:
 * `setPositionLabel` gets or makes the anchor at the lens' pins and puts a
 * person's `PositionLabel` on it, beside the label ingest recorded there, which
 * stays. Every lens pinning the same positions — and every layer drawing one —
 * is called by it.
 *
 * A layer over a lens that pins nothing (an RGB or multichannel layer over the
 * whole array) has no anchor beneath it: it is called by its dataset, and the
 * popover says so instead of offering a field.
 *
 * Every click is kept inside: the row and the card header it sits in toggle on
 * click, and the content is portalled, but React bubbles its events through
 * the tree.
 *
 * `trigger="icon"` draws a pencil instead of the name, for a header whose
 * name is the fold toggle (the label card): the rename sits with the other
 * header buttons.
 */
export const LayerNamePopover = ({
  layer,
  label,
  className,
  trigger = "name",
}: {
  layer: LayerState;
  /** What the row shows now (`layerDisplayLabel(layer)`). */
  label: string;
  className?: string;
  /** The name itself (default), or a pencil button beside it. */
  trigger?: "name" | "icon";
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(HEADER_BUTTON, className)}
            title="Set the anchor label this layer is named by"
            onClick={(event) => event.stopPropagation()}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        ) : (
          <button
            type="button"
            className={cn(
              "min-w-0 flex-1 rounded-sm text-left hover:underline hover:decoration-foreground/30 hover:underline-offset-2",
              className,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <Name title={`${label} (click to set its anchor label)`}>{label}</Name>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-3"
        onClick={(event) => event.stopPropagation()}
      >
        {open && <AnchorLabelForm layer={layer} onDone={() => setOpen(false)} />}
      </PopoverContent>
    </Popover>
  );
};

const AnchorLabelForm = ({ layer, onDone }: { layer: LayerState; onDone: () => void }) => {
  const client = useMikro();
  const sceneApi = useSceneStoreApi();
  const pins = layerPins(layer);
  const anchor = anchorAt(layer.lens.nameAnchors, pins);
  const [value, setValue] = useState(anchor?.positionLabel?.label ?? "");
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const dataset = layer.lens.dataset.name?.trim() || "the array";

  if (pins.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium">No anchor beneath this layer</div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          It draws all of {dataset} and pins no position, so there is no coordinate
          anchor to label: it is called by {dataset}. A layer over one channel or
          frame is named by the anchor there.
        </p>
      </div>
    );
  }

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await setAnchorLabel(client, sceneApi, layer, value);
      onDone();
    } catch (cause) {
      // Stays open with the reason: the text is still there to fix and retry.
      setError(cause);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="text-xs font-medium">Position label</div>
      <AnchorFacts pins={pins} dataset={dataset} anchor={anchor} />
      <p className="text-[11px] leading-snug text-muted-foreground">
        {anchor
          ? "Set on the coordinate anchor above, beside what was recorded there, which stays."
          : `There is no anchor at ${pinSummary(pins)} yet: saving sets one there.`}{" "}
        The layer is called by it, and so is anything else over this position. Empty
        removes the label.
      </p>
      <Input
        autoFocus
        aria-label="Position label"
        className="h-7 text-xs"
        placeholder={anchor?.channelLabel?.label ?? "e.g. GFP"}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <ErrorNote error={error} title="Couldn't set the anchor label" />
      <div className="flex justify-end">
        <Button type="submit" size="sm" className="h-7" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
};

/** Where the anchor sits and what is on it already: the facts the label joins. */
const AnchorFacts = ({
  pins,
  dataset,
  anchor,
}: {
  pins: readonly LensPin[];
  dataset: string;
  anchor: AnchorLabelsFragment | null;
}) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded border border-border/50 px-2 py-1.5 text-[11px]">
    <dt className="text-muted-foreground">Anchor</dt>
    <dd className="truncate font-mono">
      {pinSummary(pins)} · {dataset}
    </dd>
    <dt className="text-muted-foreground">Recorded</dt>
    <dd className="truncate">{anchor?.channelLabel?.label ?? "—"}</dd>
    <dt className="text-muted-foreground">Label</dt>
    <dd className="truncate">{anchor?.positionLabel?.label ?? "—"}</dd>
  </dl>
);

/**
 * The anchor a label lands on: the one at exactly the lens' pins — what
 * `setPositionLabel` gets or creates — among the anchors the lens' name is read
 * from. Null when there is none yet (saving sets one there).
 */
export const anchorAt = (
  anchors: readonly AnchorLabelsFragment[] | null | undefined,
  pins: readonly LensPin[],
): AnchorLabelsFragment | null =>
  (anchors ?? []).find((anchor) => {
    const coordinates = (anchor.coordinates ?? {}) as Record<string, unknown>;
    const axes = Object.keys(coordinates);
    return (
      axes.length === pins.length &&
      pins.every((pin) => Number(coordinates[pin.axis]) === pin.value)
    );
  }) ?? null;

/**
 * The positions the layer's lens pins, read off the SERVER's slices
 * (`sourceSlices`). Not `layer.lens.slices`: the store's lens is the brick
 * POOL lens, the server's lens with the channel slice taken out so every
 * channel of a dataset shares one pool (`poolLensOf`) — read that, and a
 * one-channel intensity layer looks as if it pinned nothing.
 */
export const layerPins = (layer: Pick<LayerState, "sourceSlices">): LensPin[] =>
  slicePins(layer.sourceSlices ?? []);

type MikroClient = ApolloClient<unknown>;
type SceneApi = ReturnType<typeof useSceneStoreApi>;

/**
 * Set the label on the anchor beneath the layer, then tell the scene store.
 *
 * The store does not hear it on its own: a scene re-emission only re-derives a
 * layer whose placement moved (`layerStructureKey`), so the layer would show
 * its old name until the scene reloaded. The OTHER layers over the same array
 * whose lenses pin the same positions were renamed by the server too; their
 * lenses are read back and patched in as well (`refreshLensNames`).
 */
export const setAnchorLabel = async (
  client: MikroClient,
  sceneApi: SceneApi,
  layer: LayerState,
  value: string,
): Promise<void> => {
  const { data } = await client.mutate<SetPositionLabelMutation, SetPositionLabelMutationVariables>({
    mutation: SetPositionLabelDocument,
    variables: { lens: layer.lens.id, label: value.trim() || null },
  });
  applyLensNames(sceneApi, layer.id, {
    name: data?.setPositionLabel.name ?? null,
    nameAnchors: data?.setPositionLabel.nameAnchors,
  });
  refreshLensNames(client, sceneApi, layer).catch((cause: unknown) =>
    // A background read-back: the named layer is right already, the others
    // catch up on the next scene load.
    console.warn("[scene] couldn't read back renamed lenses", cause),
  );
};

/** Patch a layer's lens name (and the anchors it is read from) into both store views. */
const applyLensNames = (
  sceneApi: SceneApi,
  layerId: string,
  lens: { name: string | null; nameAnchors?: AnchorLabelsFragment[] },
) => {
  const patch = { name: lens.name, ...(lens.nameAnchors ? { nameAnchors: lens.nameAnchors } : {}) };
  const state = sceneApi.getState();
  const current = state.layers.find((candidate) => candidate.id === layerId);
  if (!current) return;
  state.updateLayer({ ...current, lens: { ...current.lens, ...patch } });
  // The polymorphic view too (the probe readouts and the pickers name layers
  // from it), each from its OWN lens object: the two views do not share one.
  const raw = state.sceneLayers.find((candidate) => candidate.id === layerId);
  const rawLens = raw && "lens" in raw ? (raw.lens as Record<string, unknown> | null) : null;
  if (!rawLens) return;
  state.patchSceneLayer(layerId, {
    lens: { ...rawLens, ...patch },
  } as Parameters<typeof state.patchSceneLayer>[1]);
};

/**
 * The other layers over the same array: their lenses may pin the position just
 * labelled, and the server renamed them with it. Read each one's name back and
 * patch the ones that moved. Network-only: the cache holds the name from
 * before.
 */
const refreshLensNames = async (client: MikroClient, sceneApi: SceneApi, named: LayerState) => {
  const others = sceneApi
    .getState()
    .layers.filter(
      (candidate) =>
        candidate.id !== named.id &&
        candidate.lens.dataset.id === named.lens.dataset.id &&
        layerPins(candidate).length > 0,
    );
  await Promise.all(
    others.map(async (other) => {
      const { data } = await client.query<GetLensQuery, GetLensQueryVariables>({
        query: GetLensDocument,
        variables: { id: other.lens.id },
        fetchPolicy: "network-only",
      });
      const name = data?.lens.name ?? null;
      if (name !== (other.lens.name ?? null)) applyLensNames(sceneApi, other.id, { name });
    }),
  );
};
