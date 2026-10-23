/**
 * A compact card for a `CadModelLayer` in the Layers panel.
 *
 * Everything here is STORED (`updateCadModelLayer`), with the vector card's
 * cadence: fold into the store at once so the canvas previews, write through.
 * The opacity slider previews per tick and writes on release.
 *
 *  - **material**: the file's own materials ("as authored"), or one colour
 *    over all of them — the override, for a model whose export carries no
 *    useful colours or that should recede behind the data.
 *  - **FACTS** (`Badge`): the unit the model's space carries and the box it
 *    occupies, read off the file at registration. Shown, never edited: the
 *    unit is what makes the placement come out the right size.
 */
import { Box, Eye, EyeOff, Grid3x3, Trash2 } from "lucide-react";
import { memo, useCallback, useSyncExternalStore } from "react";

import {
  Badge,
  CardSection,
  LayerCardShell,
  OpacityRow,
  Segment,
  SegmentGroup,
} from "@/core/data/scene/layerui/cardControls";
import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";
import { useUpdateCadModelLayerMutation, type UpdateCadModelLayerInput } from "@/mikro/api/graphql";

import { LENS_BUTTON } from "../../platform/layerui/LayerCardActions";
import { LensButton } from "../../platform/layerui/LensButton";
import { useOptimisticLayerPatch } from "../../platform/layerui/useOptimisticLayerPatch";
import type { CadModelLayerFragment } from "../../platform/model/layerGuards";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { cadLoadFailure, subscribeCadLoadFailures } from "./loadFailures";

type CadPatch = Omit<UpdateCadModelLayerInput, "id">;

/** The override a fresh "single colour" starts from: a pale glass-like grey. */
const DEFAULT_OVERRIDE = [205, 214, 224, 255];

const toHex = (rgba: readonly number[]): string =>
  `#${rgba
    .slice(0, 3)
    .map((component) => Math.round(component).toString(16).padStart(2, "0"))
    .join("")}`;

const fromHex = (hex: string, alpha: number): number[] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  alpha,
];

/** "24 × 24 × 0.17 mm": the box the file declares, in the model's own unit. */
const boundsSummary = (bounds: unknown, unit: string | null | undefined): string | null => {
  const box = bounds as { min?: number[]; max?: number[] } | null;
  if (!box?.min || !box?.max || box.min.length < 3 || box.max.length < 3) return null;
  const sizes = box.max.map((high, axis) => Number((high - box.min![axis]).toPrecision(3)));
  return `${sizes.join(" × ")}${unit ? ` ${unit}` : ""}`;
};

export const CadModelLayerCard = memo(
  ({
    layer,
    expanded,
    onSelect,
    onRemove,
  }: {
    layer: CadModelLayerFragment;
    expanded: boolean;
    onSelect: (id: string, currentlyExpanded: boolean) => void;
    onRemove?: (id: string) => void;
  }) => {
    const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
    const [updateCadModelLayer] = useUpdateCadModelLayerMutation();
    const persist = useOptimisticLayerPatch<CadPatch>(layer.id, updateCadModelLayer, "[cad-model]");
    const layerId = layer.id;
    const hidden = layer.visible === false;
    const model = layer.model;
    const failure = useSyncExternalStore(subscribeCadLoadFailures, () => cadLoadFailure(layerId));

    const override = Array.isArray(layer.materialColor) ? layer.materialColor : null;
    const unit = model?.coordinateSystem.axes[0]?.unit ?? null;
    const size = boundsSummary(model?.bounds, unit);

    const preview = useCallback(
      (opacity: number) => patchSceneLayer(layerId, { opacity }),
      [layerId, patchSceneLayer],
    );
    const commit = useCallback((opacity: number) => persist({ opacity }), [persist]);

    return (
      <LayerCardShell
        icon={<Box className="h-3 w-3 text-brand-soft" />}
        tile="bg-brand/15"
        title={layer.name?.trim() || model?.label || `CAD model ${layerId}`}
        badges={unit ? <Badge>{unit}</Badge> : undefined}
        hidden={hidden}
        expanded={expanded}
        onToggle={() => onSelect(layerId, expanded)}
        actions={
          <>
            <LensButton lens={layer.lens} className={LENS_BUTTON} />
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 shrink-0 ${
                layer.wireframe ? "bg-brand/15 text-brand-light" : "text-white/45 hover:text-white/90"
              }`}
              title={layer.wireframe ? "Draw solid surfaces" : "Draw as a wireframe"}
              onClick={() => persist({ wireframe: !layer.wireframe })}
            >
              <Grid3x3 className="h-3 w-3" />
            </Button>
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
                onClick={() => onRemove(layerId)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </>
        }
      >
        {failure != null && (
          <div className="px-2 py-1.5">
            <ErrorNote error={failure} title="Couldn't load the model" variant="line" />
          </div>
        )}

        <CardSection title="material">
          <div className="flex items-center gap-1.5">
            <SegmentGroup>
              <Segment
                active={!override}
                title="Draw the materials the file was exported with"
                onClick={() => persist({ materialColor: null })}
              >
                as authored
              </Segment>
              <Segment
                active={!!override}
                title="Draw every part in one colour"
                onClick={() => persist({ materialColor: override ?? DEFAULT_OVERRIDE })}
              >
                one colour
              </Segment>
            </SegmentGroup>
            {override && (
              <input
                type="color"
                title="The colour every part is drawn in"
                className="h-5 w-7 cursor-pointer rounded border border-white/10 bg-transparent"
                value={toHex(override)}
                // Previewed per pick, written once the picker closes: a drag
                // across the swatch is dozens of `input` events.
                onChange={(event) =>
                  patchSceneLayer(layerId, { materialColor: fromHex(event.target.value, override[3] ?? 255) })
                }
                onBlur={(event) => persist({ materialColor: fromHex(event.target.value, override[3] ?? 255) })}
              />
            )}
          </div>
        </CardSection>

        <OpacityRow opacity={layer.opacity ?? 1} step={5} onChange={preview} onCommit={commit} />

        {(size || model?.store.originalFileName) && (
          <CardSection title="file">
            <div className="flex flex-wrap items-center gap-1">
              {model?.store.originalFileName && <Badge>{model.store.originalFileName}</Badge>}
              {size && <Badge>{size}</Badge>}
            </div>
          </CardSection>
        )}
      </LayerCardShell>
    );
  },
);
CadModelLayerCard.displayName = "CadModelLayerCard";
