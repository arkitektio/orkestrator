import { memo, useState } from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ProjectionMode,
  useUpdateIntensityLayerMutation,
  useUpdatePhasorLayerMutation,
  useUpdateRgbLayerMutation,
} from "@/mikro-next/api/graphql";

import { perfMonitor } from "../../platform/perf/perfMonitor";
import {
  CardSection,
  Segment,
  SegmentGroup,
  layerCardShellClasses,
} from "../../platform/layerui/cardControls";
import type { LayerState } from "../../platform/stores/sceneStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewStoreApi } from "../../platform/stores/viewStore";
import type { ChannelRenderNode, PhasorRenderNode, TransferFn } from "../../platform/model/renderGraph";
import { serializePhasorTransfer } from "../../platform/model/renderGraph";
import {
  PhasorNodeEditor,
  TransferEditor,
} from "../../features/volume/rendergraph/RenderNodeEditor";
import { LayerGraphFlyout } from "./LayerGraphFlyout";
import { RgbChannelEditor } from "./RgbChannelEditor";
import { LayerRow } from "./LayerRow";
import { UnplannableNotice } from "./UnplannableNotice";
import { type LayerCardProps } from "./cardShell";

/**
 * The projection choices, in the order they escalate: two ways of taking the
 * brightest sample along z, then the two that actually integrate the volume.
 *
 * Short labels on purpose — `ATTENUATED_MIP` does not fit a 9px pill, and the
 * enum's spelling is not what a user calls it. The full meaning is the title.
 */
const PROJECTIONS: ReadonlyArray<{
  mode: ProjectionMode;
  label: string;
  title: string;
}> = [
  {
    mode: ProjectionMode.Mip,
    label: "MIP",
    title: "Maximum intensity: each pixel takes the brightest sample along z",
  },
  {
    mode: ProjectionMode.AttenuatedMip,
    label: "att. MIP",
    title:
      "Attenuated maximum intensity: samples are weighted by depth, so nearer structure dominates",
  },
  {
    mode: ProjectionMode.Volume,
    label: "volume",
    title: "Alpha volume rendering: samples along z are composited front-to-back",
  },
  {
    mode: ProjectionMode.Isosurface,
    label: "iso",
    title: "Isosurface: a surface is extracted at a threshold value",
  },
];

/**
 * The card for a FIXED-SHAPE lens layer — `IntensityLayer`, `RgbLayer`,
 * `PhasorLayer`.
 *
 * These have no render graph, so they get no graph editor: the recipe's shape
 * is declared by the type, and only its VALUES are editable. That is a simpler
 * card, not a poorer one — the graph editor's whole vocabulary (add a node,
 * change a blend, reparent) describes choices these types do not offer.
 *
 * The INTENSITY and PHASOR editors are the SAME ones the graph editor mounts
 * (`TransferEditor`, `PhasorNodeEditor`), reused rather than reimplemented — an
 * intensity layer's transfer is the identical `TransferFn`, tint included, and
 * a phasor layer's `phasorRender` normalizes to the identical node. What
 * differs is only where the edit is persisted: each type has its own
 * `update*Layer` mutation, because the generic `updateLayer` takes a
 * `renderGraph` and none of these has one.
 *
 * RGB does NOT share that editor, and `RgbChannelEditor`'s docblock argues
 * why at length: an RGB layer's question is which plane feeds which primary,
 * and almost everything a transfer editor offers — gamma, a curve, a colormap,
 * a per-plane window — is both unpersistable for it and enough to demote it
 * off its specialised material. It brings its own sections instead of a
 * "Rendering" block.
 *
 * Live preview is a store write (the renderer reads `sceneStore.layers`); the
 * mutation is the explicit Save, exactly as the graph editor sequences it.
 */
export const FixedShapeLayerCard = memo(function FixedShapeLayerCard({
  layer,
  expanded,
  unplannable,
  onSelect,
  onUpdate,
  onFocus,
  onRemove,
  onClose,
}: LayerCardProps<LayerState>) {
  perfMonitor.countRender("FixedShapeLayerCard"); // no-op unless a perf recording is armed
  const updateStoreLayer = useSceneStore((s) => s.updateLayer);
  const viewApi = useViewStoreApi();
  const [dirty, setDirty] = useState(false);
  // Tracked apart from `dirty` so an unrelated edit (a gamma nudge) does not
  // write a projection: `layer.projection` READS as MIP when the server holds
  // null (layerModel), so sending it unconditionally would silently turn
  // "unset" into "explicitly MIP" on every save.
  const [projectionEdited, setProjectionEdited] = useState(false);
  const [saveIntensity, { loading: savingIntensity }] = useUpdateIntensityLayerMutation();
  const [saveRgb, { loading: savingRgb }] = useUpdateRgbLayerMutation();
  const [savePhasor, { loading: savingPhasor }] = useUpdatePhasorLayerMutation();

  const handleSelect = () => onSelect(layer.id, expanded);
  const handleRemove = () => onRemove(layer.id);

  /**
   * Push edited sources into the store AND fold the primary's transfer onto the
   * flat fields, the same contract `useRenderGraphEditor.pushPreview` keeps: the
   * flat fields are DERIVED, never written by a panel on their own.
   */
  const pushChannels = (channels: ChannelRenderNode[]) => {
    // Live-preview tick: pulse the interaction flag so the volume renders
    // degraded during the drag and refines on release (viewStore docblock).
    viewApi.getState().markInteraction();
    const primary = channels[0]?.transfer;
    if (!dirty) setDirty(true); // same-value sets bail anyway; skip the call per tick
    updateStoreLayer({
      ...layer,
      channels,
      sources: channels,
      climMin: primary?.climMin ?? layer.climMin,
      climMax: primary?.climMax ?? layer.climMax,
      colormap: primary?.colormap ?? layer.colormap,
      color: primary?.color ?? layer.color,
      gamma: primary?.gamma ?? layer.gamma,
      intensityAxis: channels[0]?.intensityAxis ?? layer.intensityAxis,
    });
  };

  /**
   * The projection is a FIELD on the layer, not part of its transfer — which
   * is why it is a store write of its own rather than another `pushChannels`
   * fold. The renderer reads `layer.projection` (`BrickVolumeLayer`), so the
   * store write IS the live preview; `projectionMode` in `save()` is what
   * makes it outlive the session.
   */
  const setProjection = (mode: ProjectionMode) => {
    setDirty(true);
    setProjectionEdited(true);
    updateStoreLayer({ ...layer, projection: mode });
  };

  const setIntensityTransfer = (transfer: TransferFn) =>
    pushChannels([{ ...layer.channels[0], transfer }]);

  /**
   * ONE window for all three planes: an RGB image is three views of one
   * acquisition, so the editor edits the shared window and writes it to each.
   *
   * Only the window — never a gamma, a curve or a colormap. That is not a
   * simplification of the editor's output but the precondition of
   * `renderKind === "rgb"` (`platform/model/layerModel.ts`): identical clims,
   * no gamma, basis tints. The RGB editor offers none of them, so this can
   * only ever be handed the two values it copies.
   */
  const setRgbWindow = (climMin: number, climMax: number) =>
    pushChannels(
      layer.channels.map((channel) => ({
        ...channel,
        transfer: { ...channel.transfer, climMin, climMax },
      })),
    );

  /** All three plane indices at once — a preset moves two or three of them,
   *  and three separate writes would republish the layer mid-edit. */
  const setRgbPlanes = (indices: readonly number[]) =>
    pushChannels(
      layer.channels.map((channel, i) => ({
        ...channel,
        intensityIndex: indices[i] ?? channel.intensityIndex,
      })),
    );

  /** The axis the three indices address. `pushChannels` folds it onto the flat
   *  field the renderer and the planner read; `save()` persists it. */
  const setRgbAxis = (intensityAxis: string) =>
    pushChannels(layer.channels.map((channel) => ({ ...channel, intensityAxis })));

  const setPhasorNode = (node: PhasorRenderNode) => {
    viewApi.getState().markInteraction(); // same live-preview cadence as pushChannels
    setDirty(true);
    updateStoreLayer({
      ...layer,
      phasors: [node],
      sources: [node],
      colormap: node.transfer.colormap,
      climMin: node.transfer.intensity.climMin ?? layer.climMin,
      climMax: node.transfer.intensity.climMax ?? layer.climMax,
      gamma: node.transfer.intensity.gamma ?? layer.gamma,
    });
  };

  const save = async () => {
    if (layer.__typename === "IntensityLayer") {
      const transfer = layer.channels[0]?.transfer;
      await saveIntensity({
        variables: {
          input: {
            id: layer.id,
            climMin: transfer?.climMin ?? null,
            climMax: transfer?.climMax ?? null,
            gamma: transfer?.gamma ?? null,
            colormap: transfer?.colormap ?? null,
            // The tint the shared `ColormapControl` edits alongside the ramp —
            // an intensity layer carries it as a field, so it persists here
            // rather than inside a serialized render graph.
            color: transfer?.color ?? null,
            intensityIndex: layer.channels[0]?.intensityIndex ?? null,
            // Only `UpdateIntensityLayerInput` carries this — the RGB and
            // phasor inputs have no `projectionMode`, which is why the control
            // below is gated on the typename rather than shown for all three.
            // Omitted unless picked: the input is a patch, so not sending it
            // leaves the server's value (null included) exactly as it was.
            ...(projectionEdited ? { projectionMode: layer.projection } : {}),
          },
        },
      });
    } else if (layer.__typename === "RgbLayer") {
      const [red, green, blue] = layer.channels;
      await saveRgb({
        variables: {
          input: {
            id: layer.id,
            climMin: red?.transfer.climMin ?? null,
            climMax: red?.transfer.climMax ?? null,
            redIndex: red?.intensityIndex ?? null,
            greenIndex: green?.intensityIndex ?? null,
            blueIndex: blue?.intensityIndex ?? null,
            // The axis those three index. Editable on a lens with more than
            // one candidate, and unpersisted until now — a remapped layer came
            // back addressing the old axis on the next load.
            intensityAxis: red?.intensityAxis ?? null,
          },
        },
      });
    } else {
      const phasor = layer.phasors[0];
      if (!phasor) return;
      await savePhasor({
        variables: {
          input: {
            id: layer.id,
            phasorAxis: phasor.phasorAxis,
            intensityAxis: phasor.intensityAxis,
            intensityIndex: phasor.intensityIndex,
            harmonic: phasor.harmonic,
            transfer: serializePhasorTransfer(phasor.transfer),
          },
        },
      });
    }
    setDirty(false);
    setProjectionEdited(false);
  };

  const saving = savingIntensity || savingRgb || savingPhasor;

  return (
    <Collapsible
      open={expanded}
      className={layerCardShellClasses(expanded, layer.visible === false)}
    >
      <LayerRow
        embedded
        compact
        layer={layer}
        isSelected={expanded}
        graphDirty={dirty}
        savingGraph={saving}
        onSaveGraph={save}
        onSelect={handleSelect}
        onUpdate={onUpdate}
        onFocus={onFocus}
        onRemove={handleRemove}
      />
      {unplannable && <UnplannableNotice layer={layer} info={unplannable} />}
      {/* Snap open, no height animation — same reason as the image card. */}
      <CollapsibleContent className="overflow-hidden">
        <div className="flex flex-col border-t border-white/10">
          {layer.__typename === "IntensityLayer" && (
            <CardSection
              title="projection"
              hint={
                layer.projection === ProjectionMode.Isosurface
                  ? "3D only — the surface's threshold is scene-wide, in Scene settings"
                  : "3D only — a 2D slice shows one plane whatever the mode"
              }
            >
              <SegmentGroup>
                {PROJECTIONS.map(({ mode, label, title }) => (
                  <Segment
                    key={mode}
                    active={layer.projection === mode}
                    title={title}
                    onClick={() => setProjection(mode)}
                  >
                    {label}
                  </Segment>
                ))}
              </SegmentGroup>
            </CardSection>
          )}
          {/* RGB brings its OWN sections (channels / exposure / source) rather
              than a "Rendering" block: what it edits is a mapping, and the
              one window is a consequence of that, not a transfer to tune. */}
          {layer.__typename === "RgbLayer" && layer.channels[0] && (
            <RgbChannelEditor
              layer={layer}
              onPlanes={setRgbPlanes}
              onWindow={setRgbWindow}
              onIntensityAxis={setRgbAxis}
            />
          )}
          {layer.__typename !== "RgbLayer" && (
            <CardSection title="Rendering">
              {layer.__typename === "IntensityLayer" && layer.channels[0] && (
                <TransferEditor
                  layer={layer}
                  transfer={layer.channels[0].transfer}
                  onChange={setIntensityTransfer}
                />
              )}
              {layer.__typename === "PhasorLayer" && layer.phasors[0] && (
                <PhasorNodeEditor
                  layer={layer}
                  node={layer.phasors[0]}
                  onChange={setPhasorNode}
                />
              )}
            </CardSection>
          )}
          {/* The metadata + placement chrome every layer card offers. Passing
              no editor is what keeps the graph section out. */}
          <LayerGraphFlyout inline layer={layer} onUpdate={onUpdate} onClose={onClose} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
