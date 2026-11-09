import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import { SmartMenu, TILE_SKIN, useSmartMenu } from "@/core/smart/ObjectButton";
import type { SmartSectionSelection } from "@/core/smart/extensions/section";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { structure } from "@/core/smart/structure";
import type { Structure } from "@/core/types";
import {
  useEnsureArrayLensMutation,
  useGetAnnotationActionDescriptorsQuery,
} from "@/mikro/api/graphql";

import { FloatRunMenu } from "../../../platform/float/FloatRunMenu";
import { layerDisplayLabel } from "../../../platform/layerui/layerIdentity";
import { useSceneStore, useSceneStoreApi } from "../../../platform/stores/sceneStore";
import type { SelectedRoi } from "../roiSelectionStore";
import {
  ARRAY_LENS_IDENTIFIER,
  annotationObject,
  cropLensObject,
  layerLensPartner,
} from "./annotationActionTarget";

/**
 * Only what takes the PAIR: what runs on it, and what could be installed to
 * run on it (kabinet's Installable, asked with the same demands). By id, as
 * strings: the sections are rekuest's and kabinet's, and this module imports
 * none of it — each brings its own guard, so a deployment without them shows
 * an empty menu, not an error.
 */
export const PAIR_SECTIONS: SmartSectionSelection = {
  only: ["rekuest.shortcuts", "rekuest.actions", "kabinet.definitions"],
};

/**
 * The actions of the annotation card's "Run on layer" → <layer> pane: the ones
 * that take this annotation and that layer's image — `f(Annotation, ArrayLens,
 * ...)`, in that order, whatever they are called. (The Run and Shortcuts
 * sections match the two leading ports and let an action carry further
 * arguments, as on every drop.) Both sides go out with the descriptors they
 * provide (`annotationActionTarget`), so a port's `Requires` narrows the list:
 * an action wanting a rectangle is not offered on a point, one wanting a
 * single-channel image not against a stack.
 *
 * The layer is the one picked from the card's layer list — hidden ones too:
 * an action reads the lens, not the pixels on screen. The image is still a
 * SUGGESTION (`askPartner`): a run opens the assign form with the shape filled
 * in and the channel's selector shown, set to what the action last ran with,
 * else to this lens.
 *
 * Drawn for the card: the actions are tiles (`TILE_SKIN`) and the search waits
 * behind a magnifier — open at once when the card was opened by a click
 * (`autoFocus`), where typing is meant for it. The pane's title names the
 * layer, so there is no line saying it again.
 *
 * Below them, "On the crop": the actions that take the crop of that image to
 * the shape — `f(ArrayLens, ...)` on the lens `createLens(lens:, annotation:)`
 * would return (`CropActions`).
 */
export const AnnotationPairActions = ({
  roi,
  layerId,
  autoFocus,
  initialSearch,
  onDone,
}: {
  roi: SelectedRoi;
  /** The layer whose image the shape is paired with. */
  layerId: string;
  /** Whether the search takes focus: not while a key may still be held (a
   * draw), and not on a hover, where typing belongs to the scene. */
  autoFocus: boolean;
  /** What was already typed (the float's root hands on its first key). */
  initialSearch?: string;
  onDone: () => void;
}) => {
  // A scalar subscription (whether the layer is there), then a `getState()`
  // read: a whole-array subscription would re-render on every layer edit.
  const sceneApi = useSceneStoreApi();
  const present = useSceneStore((s) => s.layers.some((layer) => layer.id === layerId));
  const lens = useMemo(() => {
    if (!present) return null;
    const layers = sceneApi.getState().layers;
    return layerLensPartner(layerId, layers, (id) => {
      const layer = layers.find((candidate) => candidate.id === id);
      return layer ? layerDisplayLabel(layer) : undefined;
    });
  }, [present, layerId, sceneApi]);
  // One request for both groups: what the shape provides, and what its crop of
  // the lens would. A draw asked it already and left it in the cache
  // (`useCreateSceneAnnotation`).
  const { data, previousData, error, refetch } = useGetAnnotationActionDescriptorsQuery({
    variables: { id: roi.id, lens: lens?.id ?? "" },
    skip: !lens,
  });
  const answered =
    data?.annotation ?? (previousData?.annotation.id === roi.id ? previousData.annotation : undefined);
  const descriptors = answered?.descriptors;
  /** Undefined until answered for THIS lens; null when the shape misses it. */
  const cut = data?.annotation.descriptorsUnder;
  const objects = useMemo(() => [annotationObject(roi, descriptors)], [roi, descriptors]);
  const partners = useMemo(() => (lens ? [lens] : []), [lens]);
  // The one search filters both groups.
  const [filter, setFilter] = useState<string | undefined>(undefined);

  if (error) {
    return (
      <StatusPage
        variant="compact"
        icon={TriangleAlert}
        tone="warning"
        title="Could not read this annotation"
        description={classifyError(error).message}
        actions={<RetryButton onRetry={() => refetch()} />}
      />
    );
  }
  if (!lens) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">This layer is no longer in the scene.</p>;
  }
  if (descriptors === undefined) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>;
  }
  return (
    <>
      <PairMenu
        objects={objects}
        partners={partners}
        imageLabel={lens.label ?? "this image"}
        autoFocus={autoFocus || !!initialSearch}
        initialSearch={initialSearch}
        onFilterChange={setFilter}
        onDone={onDone}
      />
      <CropActions roi={roi} lens={lens} descriptors={cut} filter={filter} onDone={onDone} />
    </>
  );
};

const PairMenu = ({
  objects,
  partners,
  imageLabel,
  autoFocus,
  initialSearch,
  onFilterChange,
  onDone,
}: {
  objects: Structure[];
  partners: Structure[];
  imageLabel: string;
  autoFocus: boolean;
  initialSearch?: string;
  onFilterChange: (filter: string | undefined) => void;
  onDone: () => void;
}) => (
  <FloatRunMenu
    objects={objects}
    partners={partners}
    sections={PAIR_SECTIONS}
    // `askPartner`: the image under the shape is a guess, so a run opens the
    // form with its channel shown — defaulting to what the action last ran
    // with, else this one.
    askPartner
    line={null}
    searchPlaceholder={`Run with ${imageLabel}…`}
    emptyText="Nothing runs on this shape with this image"
    autoFocus={autoFocus}
    initialSearch={initialSearch}
    onFilterChange={onFilterChange}
    onDone={onDone}
  />
);

/**
 * "On the crop": the actions that take the crop of `lens` to the shape, before
 * the crop exists. mikro says what the crop would provide (`descriptorsUnder`,
 * the same cut `createLens(lens:, annotation:)` makes), so a port's `Requires`
 * narrows the list as on a real lens — a z-pinned rectangle on a volume crops
 * to an IMAGE. Nothing is made to list them: the crop is made when one of them
 * runs (`materialize`, awaited by every run path), once per lens and shape —
 * the server hands the same lens back for the same cut anyway.
 *
 * A shape that misses the lens has no crop, and the group says so.
 */
const CropActions = ({
  roi,
  lens,
  descriptors,
  filter,
  onDone,
}: {
  roi: SelectedRoi;
  lens: Structure;
  descriptors: unknown;
  filter: string | undefined;
  onDone: () => void;
}) => {
  // Still asking for this lens: nothing to offer yet.
  if (descriptors === undefined) return null;
  return (
    <div className="mt-1.5 border-t border-border/60 pt-1.5">
      <p className="truncate px-1 text-[11px] text-muted-foreground">
        On the crop to this shape
      </p>
      {descriptors === null ? (
        <p className="px-1 py-1 text-xs text-muted-foreground">
          This shape lies outside {lens.label ?? "this image"}.
        </p>
      ) : (
        <CropMenu roi={roi} lens={lens} descriptors={descriptors} filter={filter} onDone={onDone} />
      )}
    </div>
  );
};

const CropMenu = ({
  roi,
  lens,
  descriptors,
  filter,
  onDone,
}: {
  roi: SelectedRoi;
  lens: Structure;
  descriptors: unknown;
  filter: string | undefined;
  onDone: () => void;
}) => {
  const crop = useMemo(() => cropLensObject(roi, lens, descriptors), [roi, lens, descriptors]);
  const objects = useMemo(() => [crop], [crop]);
  const [ensureLens] = useEnsureArrayLensMutation({
    // The shape's card lists what was cut from it.
    refetchQueries: ["GetAnnotationInfo"],
  });
  const made = useRef<{ key: string; lens: Promise<Structure> } | null>(null);

  const materialize = useCallback<NonNullable<SmartContextProps["materialize"]>>(async () => {
    const key = crop.id;
    if (made.current?.key !== key) {
      const pending: Promise<Structure> = ensureLens({
        variables: { input: { lens: lens.id, annotation: roi.id } },
      }).then(
        ({ data }) => {
          const id = data?.createLens.id;
          if (!id) throw new Error("Could not make the crop: mikro answered no lens.");
          return structure(ARRAY_LENS_IDENTIFIER, id, {
            label: crop.label,
            descriptors: crop.descriptors,
          });
        },
        (error: unknown) => {
          // Not remembered: the next run asks again.
          if (made.current?.lens === pending) made.current = null;
          throw new Error(`Could not make the crop: ${classifyError(error).message}`);
        },
      );
      made.current = { key, lens: pending };
    }
    return { objects: [await made.current.lens], partners: [] };
  }, [crop, ensureLens, lens.id, roi.id]);

  const menu = useSmartMenu({
    objects,
    partners: [],
    sections: PAIR_SECTIONS,
    materialize,
    autoFocus: false,
    onDone,
  });
  const { setFilter } = menu;
  useEffect(() => setFilter(filter), [filter, setFilter]);

  return (
    <SmartMenu.Root menu={menu} skin={TILE_SKIN}>
      <SmartMenu.Body className="rounded-none bg-transparent p-0">
        <SmartMenu.Progress />
        <SmartMenu.List className="mt-1 max-h-64 p-0.5">
          <SmartMenu.Pinned />
          <SmartMenu.Sections />
          <SmartMenu.Empty>Nothing runs on this crop</SmartMenu.Empty>
        </SmartMenu.List>
      </SmartMenu.Body>
    </SmartMenu.Root>
  );
};
