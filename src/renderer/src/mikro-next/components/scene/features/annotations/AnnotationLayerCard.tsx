import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Shapes, Trash2 } from "lucide-react";
import { memo, useMemo } from "react";
import {
  useGetSceneAnnotationsQuery,
  type SceneLayerFragment,
} from "@/mikro-next/api/graphql";
import { useRoiSelectionStore } from "./roiSelectionStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import {
  Badge,
  LayerCardShell,
  RowLabel,
  formatCount,
} from "../../platform/layerui/cardControls";

/**
 * A compact card for an `AnnotationLayer` in the Layers panel.
 *
 * Scope on purpose: this is the card for the LAYER, not for its shapes. The
 * Annotations sidebar tab already lists every annotation with its measure and
 * a go-to button; repeating that here would give the same list two homes that
 * can disagree. What the Layers panel answers is what it answers for every
 * other layer — is it on, what is in it, and what is it.
 *
 * Every control is a SESSION-LOCAL patch (`patchSceneLayer`): there is no
 * `updateAnnotationLayer` mutation, so visibility lives for the session and no
 * longer — the same bound the mesh card's render settings work under.
 *
 * The "in view" count is the one thing here that a user cannot get anywhere
 * else, and it answers the question annotations actually provoke: shapes are
 * pinned to discrete coordinates, so a layer can be fully visible and still
 * draw nothing on the current slice. "0 / 5 in view" says that outright,
 * instead of leaving the layer looking broken.
 */

type AnnotationLayerVariant = Extract<
  SceneLayerFragment,
  { __typename: "AnnotationLayer" }
>;

/** Plural-aware kind caption: "3 rectangles", "1 point". */
const kindCaption = (kind: string, count: number): string => {
  const word = kind.toLowerCase();
  return `${count} ${count === 1 ? word : `${word}s`}`;
};

export const AnnotationLayerCard = memo(
  ({
    layer,
    expanded,
    onSelect,
    onRemove,
  }: {
    layer: AnnotationLayerVariant;
    /** Whether the card's controls are unfolded (`LayerCardShell`). */
    expanded: boolean;
    /** The panel's toggle — handed the current state, see `cardShell.tsx`. */
    onSelect: (id: string, currentlyExpanded: boolean) => void;
    onRemove?: (id: string) => void;
  }) => {
    const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
    const hidden = layer.visible === false;
    const collection = layer.annotationCollection;

    // The renderer polls this exact query for the same collection, so this is
    // a cache read that stays fresh on its cadence rather than a second poll.
    // It does run on its own when the layer is HIDDEN (the renderer unmounts
    // then) — which is the point: the card still has to say what is in there.
    const { data } = useGetSceneAnnotationsQuery({
      variables: { filters: { collection: collection?.id ?? "" } },
      skip: !collection,
    });
    const annotations = data?.annotations;

    const byKind = useMemo(() => {
      const counts = new Map<string, number>();
      for (const annotation of annotations ?? []) {
        counts.set(annotation.kind, (counts.get(annotation.kind) ?? 0) + 1);
      }
      // Commonest first: the shape the layer is mostly made of leads.
      return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [annotations]);

    // A SCALAR selector, deliberately: `visibleRois` is rewritten whenever the
    // z-plane moves, and subscribing to the objects would re-render this card
    // at scrub cadence (P17). A count only re-renders when the count changes.
    const inView = useRoiSelectionStore((s) => {
      // Counted without allocating (`Object.values` + `filter` per store
      // write, per card).
      let count = 0;
      const visible = s.visibleRois;
      for (const key in visible) {
        if (visible[key].layerId === layer.id) count += 1;
      }
      return count;
    });

    const total = annotations?.length ?? 0;

    return (
      <LayerCardShell
        icon={<Shapes className="h-3 w-3 text-amber-300" />}
        tile="bg-amber-400/15"
        title={
          collection?.name?.trim() ||
          (collection ? `Annotations ${collection.id}` : "Annotations (no collection)")
        }
        hidden={hidden}
        expanded={expanded}
        onToggle={() => onSelect(layer.id, expanded)}
        // The one fact a user can get nowhere else, kept out from behind the
        // fold: shapes are pinned to discrete coordinates, so a fully visible
        // layer can still draw nothing on the current slice.
        badges={
          total > 0 ? (
            <span
              className={`shrink-0 font-mono text-[9px] ${
                inView === 0 ? "text-amber-300/80" : "text-white/50"
              }`}
              title={
                inView === 0
                  ? "None of this layer's shapes are on the current slice — scrub z or switch to 3D to see them"
                  : "Shapes currently drawn, of the layer's total"
              }
            >
              {formatCount(inView)} / {formatCount(total)}
            </span>
          ) : undefined
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-white/45 hover:text-white/90"
              title={hidden ? "Show (session)" : "Hide (session)"}
              onClick={() => patchSceneLayer(layer.id, { visible: hidden })}
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
          </>
        }
      >
        {/* ------------------------------------------------ shapes --------- */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 px-2 py-1.5">
          <RowLabel>shapes</RowLabel>
          {total === 0 ? (
            <span className="text-[9px] text-white/25">
              {annotations ? "empty — draw a shape to fill it" : "loading…"}
            </span>
          ) : (
            <>
              <span
                className={`font-mono text-[9px] ${
                  inView === 0 ? "text-amber-300/80" : "text-white/50"
                }`}
                title={
                  inView === 0
                    ? "None of this layer's shapes are on the current slice — scrub z or switch to 3D to see them"
                    : "Shapes currently drawn, of the layer's total"
                }
              >
                {formatCount(inView)} / {formatCount(total)} in view
              </span>
              {byKind.map(([kind, count]) => (
                <Badge key={kind} title={`${kind} annotations in this layer`}>
                  {kindCaption(kind, count)}
                </Badge>
              ))}
            </>
          )}
        </div>

        {/* What the layer actually is: the collection it draws and the frame
            its vectors live in — the two facts that explain where the shapes
            land when the placement looks wrong. */}
        {collection && (
          <div className="flex flex-wrap items-center gap-1 border-t border-white/5 px-2 py-1">
            <Badge title="The annotation collection this layer draws">
              collection {collection.id}
            </Badge>
            <Badge title="The coordinate system the annotations' vectors are in">
              {collection.coordinateSystem.name}
            </Badge>
            {collection.description?.trim() && (
              <Badge title={collection.description}>described</Badge>
            )}
          </div>
        )}
      </LayerCardShell>
    );
  },
);
AnnotationLayerCard.displayName = "AnnotationLayerCard";
