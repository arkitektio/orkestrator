/**
 * A compact card for a `VectorLayer` in the Layers panel.
 *
 * The track card's split, applied to a field of glyphs:
 *
 *  - **STORED** (`updateVectorLayer`): the glyph, the sampling stride, the
 *    magnitude scale, the magnitude colormap and window, opacity, visibility.
 *  - **FACTS** (`Badge`): which axis carries the components. Derived server-side
 *    from the axis types (`vectorAxis`) — shown, never edited, because a
 *    per-layer copy could disagree with the axes themselves.
 *
 * Stride and scale each have an AUTO state (null: the renderer's budget, the
 * sampled maximum) that the update mutation cannot return to — null in a patch
 * means "unchanged", the same one-way door `projectionMode` documents. The
 * tooltips say so rather than pretending otherwise.
 *
 * Write cadence is the mesh card's: fold into the store immediately so the
 * canvas previews, mutate on commit.
 */
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, Trash2, Wind } from "lucide-react";
import { memo } from "react";
import {
  ColorMap,
  VectorGlyph,
  useUpdateVectorLayerMutation,
  type UpdateVectorLayerInput,
} from "@/mikro/api/graphql";
import { useSceneStore } from "../../platform/stores/sceneStore";
import {
  Badge,
  CardSection,
  OpacityRow,
  RowLabel,
} from "@/lib/scene/layerui/cardControls";
import { ColormapSelect } from "@/lib/scene/layerui/ColormapSelect";
import { CONTINUOUS_COLORMAP_CHOICES } from "../../platform/layerui/colormap-utils";
import type { VectorLayerFragment } from "../../platform/model/layerGuards";
import { useOptimisticLayerPatch } from "../../platform/layerui/useOptimisticLayerPatch";

type VectorPatch = Omit<UpdateVectorLayerInput, "id">;

/** Strides worth offering: powers of two, the sampling grid a reader expects. */
const STRIDES = [1, 2, 4, 8, 16, 32];

const GLYPHS: { value: VectorGlyph; label: string; title: string }[] = [
  { value: VectorGlyph.Arrow, label: "arrow", title: "A shaft with a head: direction and magnitude at a glance" },
  { value: VectorGlyph.Line, label: "line", title: "A bare segment — the honest mark for an orientation field, where the sign is not a measurement" },
  { value: VectorGlyph.Cone, label: "cone", title: "A solid cone; reads best in 3D, where an arrow's head is a few pixels" },
];

export const VectorLayerCard = memo(
  ({
    layer,
    onRemove,
  }: {
    layer: VectorLayerFragment;
    onRemove?: (id: string) => void;
  }) => {
    const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
    const [updateVectorLayer] = useUpdateVectorLayerMutation();
    const hidden = layer.visible === false;

    const persist = useOptimisticLayerPatch<VectorPatch>(layer.id, updateVectorLayer, "[vectors]");


    return (
      <div
        className={`@container/card rounded-lg border border-white/10 bg-black/40 backdrop-blur-md transition-opacity ${
          hidden ? "opacity-50" : ""
        }`}
      >
        {/* ------------------------------------------------ header --------- */}
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-teal-400/15">
            <Wind className="h-3 w-3 text-teal-300" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/90">
            {layer.name?.trim() || layer.lens.dataset.name?.trim() || `Vectors ${layer.id}`}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 text-white/45 hover:text-white/90"
            title={hidden ? "Show" : "Hide"}
            onClick={() => persist({ visible: hidden })}
          >
            {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-white/35 hover:text-red-300"
              title="Remove layer from scene"
              onClick={() => onRemove(layer.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* ------------------------------------------------ glyph ---------- */}
        <CardSection title="glyph">
          <div className="flex items-center gap-1">
            {GLYPHS.map((glyph) => (
              <button
                key={glyph.value}
                title={glyph.title}
                onClick={() => persist({ glyph: glyph.value })}
                className={`h-6 flex-1 rounded border text-[10px] transition-colors ${
                  layer.glyph === glyph.value
                    ? "border-teal-300/40 bg-teal-400/15 text-teal-200"
                    : "border-white/10 bg-black/30 text-white/60 hover:text-white/90"
                }`}
              >
                {glyph.label}
              </button>
            ))}
          </div>
        </CardSection>

        {/* ------------------------------------------------ sampling ------- */}
        <CardSection title="every">
          <div className="flex items-center gap-1.5">
            <select
              value={layer.glyphStride ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value >= 1) persist({ glyphStride: value });
              }}
              className="h-6 min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-1.5 text-[10px] text-white/80"
              title="Sample every Nth voxel per spatial axis. 'auto' lets the renderer pick a stride from its glyph budget — and is a one-way door: a patch cannot say 'back to auto', only recreating the layer can."
            >
              {layer.glyphStride == null && <option value="">auto (renderer budget)</option>}
              {STRIDES.map((stride) => (
                <option key={stride} value={stride}>
                  {stride}. voxel
                </option>
              ))}
            </select>
          </div>
        </CardSection>

        {/* ------------------------------------------------ scale ---------- */}
        <CardSection title="scale">
          <div className="flex items-center gap-1.5">
            <Slider
              min={0.1}
              max={10}
              step={0.1}
              value={[layer.glyphScale ?? 1]}
              disabled={layer.glyphScale == null}
              onValueChange={([value]) => patchSceneLayer(layer.id, { glyphScale: value })}
              onValueCommit={([value]) => persist({ glyphScale: value })}
              className="flex-1 py-1"
            />
            {layer.glyphScale == null ? (
              <button
                className="w-14 shrink-0 rounded border border-white/10 bg-black/30 text-right font-mono text-[9px] text-white/40 hover:text-white/80"
                title="Auto-normalized: the longest sampled vector draws just short of one stride. Click to pin the current 1.0 scene-units-per-unit — a one-way door, like the stride."
                onClick={() => persist({ glyphScale: 1 })}
              >
                auto
              </button>
            ) : (
              <span
                className="w-14 shrink-0 text-right font-mono text-[9px] text-white/40"
                title="Scene units drawn per unit of magnitude, in the component axis's unit — a well-defined length from SIMILARITY up"
              >
                {layer.glyphScale}
              </span>
            )}
          </div>
        </CardSection>

        {/* ------------------------------------------------ colour --------- */}
        <CardSection title="magnitude">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <ColormapSelect
                value={(layer.vectorColormap as unknown as ColorMap) ?? ColorMap.Viridis}
                choices={CONTINUOUS_COLORMAP_CHOICES}
                onChange={(value) => persist({ colormap: value as ColorMap })}
                title="The ramp glyph MAGNITUDE runs through — a vector length in the component axis's unit, windowed by the clims"
              />
            </div>
          </div>
        </CardSection>

        <OpacityRow
          opacity={layer.opacity ?? 1}
          onChange={(opacity) => patchSceneLayer(layer.id, { opacity })}
          onCommit={(opacity) => persist({ opacity })}
        />

        {/* What the layer IS: derived, stated rather than offered. */}
        <div className="flex flex-wrap items-center gap-1 border-t border-white/5 px-2 py-1">
          <RowLabel>from</RowLabel>
          <Badge title="The DISPLACEMENT value axis whose positions are the vector components — derived from the axis types, never stored on the layer">
            components on '{layer.vectorAxis}'
          </Badge>
          {layer.placementInvariance &&
            layer.placementInvariance !== "ISOMETRY" &&
            layer.placementInvariance !== "SIMILARITY" && (
              <Badge title="Below SIMILARITY a scene-unit glyph scale still draws but is not a well-defined length">
                {String(layer.placementInvariance).toLowerCase()}
              </Badge>
            )}
        </div>
      </div>
    );
  },
);
VectorLayerCard.displayName = "VectorLayerCard";
