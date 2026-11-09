import { useCallback, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { structure } from "@/core/smart/structure";
import { useMikro } from "@/mikro/api/funcs";
import { useGetSlicedDescriptorsQuery } from "@/mikro/api/graphql";
import { lensRegistry } from "@/mikro/lib/lenses/lensRegistry";

import { FloatRunMenu } from "../../../platform/float/FloatRunMenu";
import { layerDisplayLabel } from "../../../platform/layerui/layerIdentity";
import { effectiveDataLayerId } from "../../../platform/probe/probeTargeting";
import { useModeStoreApi } from "../../../platform/stores/modeStore";
import { useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../../platform/stores/viewerStore";
import { runnableLayers, scopedSelectionAt, type LayerRunSnapshot } from "../../layerRun/layerRunSnapshot";
import {
  ARRAY_LENS_IDENTIFIER,
  runLensLabel,
  runLensObject,
  type LayerRunSelection,
} from "../../layerRun/layerRunTarget";
import type { SelectedRoi } from "../roiSelectionStore";
import { annotationObject } from "./annotationActionTarget";
import { PAIR_SECTIONS } from "./AnnotationPairActions";

/**
 * "Run on <shape>": the actions that take this annotation ALONE —
 * `f(Annotation, ...)` with no image beside it. The shape's descriptors come
 * from the card's own question (`GetAnnotationInfo`), so a port's `Requires`
 * narrows the list (a rectangle is not a path).
 */
export const AnnotationShapeActions = ({
  roi,
  kindWord,
  descriptors,
  autoFocus,
  initialSearch,
  onDone,
}: {
  roi: SelectedRoi;
  /** "path", "rectangle": how the shape is said. */
  kindWord: string;
  descriptors: unknown;
  autoFocus: boolean;
  initialSearch?: string;
  onDone: () => void;
}) => {
  const objects = useMemo(() => [annotationObject(roi, descriptors)], [roi, descriptors]);
  return (
    <FloatRunMenu
      objects={objects}
      partners={[]}
      sections={PAIR_SECTIONS}
      line={null}
      searchPlaceholder={`Run on this ${kindWord}…`}
      emptyText={`Nothing runs on this ${kindWord} alone`}
      autoFocus={autoFocus || !!initialSearch}
      initialSearch={initialSearch}
      onDone={onDone}
    />
  );
};

/** What "everything" is for this card: the cut, and how its lens is named. */
export type VisibleEverything = {
  selection: LayerRunSelection;
  label: string;
};

/**
 * What is VISIBLE, across every channel: the data layer's cut at the frame
 * shown — the plane in 2D, the volume or crop box in 3D — without its channel
 * slice (`layerRun`'s "everything"). Never the whole dataset. Read once, when
 * the card opens: scrubbing afterwards does not move what it runs on.
 * Null when no shown layer has a cut here.
 */
export const useVisibleEverything = (): VisibleEverything | null => {
  const viewerApi = useViewerStoreApi();
  const modeApi = useModeStoreApi();
  const sceneApi = useSceneStoreApi();
  const [everything] = useState<VisibleEverything | null>(() => {
    const viewer = viewerApi.getState();
    const layers = sceneApi.getState().layers;
    const snapshot: LayerRunSnapshot = {
      displayMode: modeApi.getState().displayMode,
      currentZ: viewer.currentZ,
      cropBox: viewer.cropBox,
      dimSelections: viewer.dimSelections,
      worldSelections: viewer.worldSelections,
      layerAxisInstants: viewer.layerAxisInstants,
    };
    const [layer] = runnableLayers(layers, effectiveDataLayerId(viewer.dataLayerId, layers), snapshot);
    if (!layer) return null;
    // A layer that draws every channel already IS everything on screen.
    const selection =
      scopedSelectionAt(layer, snapshot, "everything") ?? scopedSelectionAt(layer, snapshot, "view");
    if (!selection) return null;
    return { selection, label: runLensLabel(selection, layerDisplayLabel(layer), layer.lens.dataset.name) };
  });
  return everything;
};

/**
 * "Run on everything": the actions that take this annotation and what is
 * visible across every channel — `f(Annotation, ArrayLens, ...)` with a lens
 * that is not made yet. mikro says what it would provide
 * (`ArrayDataset.descriptorsSliced`), so the list narrows as on a real lens;
 * the lens is made when an action runs (`materialize`), as the crop is.
 */
export const AnnotationEverythingActions = ({
  roi,
  shapeDescriptors,
  everything,
  autoFocus,
  initialSearch,
  onDone,
}: {
  roi: SelectedRoi;
  shapeDescriptors: unknown;
  everything: VisibleEverything;
  autoFocus: boolean;
  initialSearch?: string;
  onDone: () => void;
}) => {
  const { selection, label } = everything;
  const { data, error, refetch } = useGetSlicedDescriptorsQuery({
    variables: { dataset: selection.datasetId, slices: selection.slices },
  });
  const lensDescriptors = data?.arrayDataset.descriptorsSliced;

  if (error) {
    return (
      <StatusPage
        variant="compact"
        icon={TriangleAlert}
        tone="warning"
        title="Could not read what is visible"
        description={classifyError(error).message}
        actions={<RetryButton onRetry={() => refetch()} />}
      />
    );
  }
  if (lensDescriptors === undefined) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>;
  }
  if (lensDescriptors === null) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">Nothing is visible to run on.</p>;
  }
  return (
    <EverythingMenu
      roi={roi}
      shapeDescriptors={shapeDescriptors}
      selection={selection}
      label={label}
      lensDescriptors={lensDescriptors}
      autoFocus={autoFocus}
      initialSearch={initialSearch}
      onDone={onDone}
    />
  );
};

const EverythingMenu = ({
  roi,
  shapeDescriptors,
  selection,
  label,
  lensDescriptors,
  autoFocus,
  initialSearch,
  onDone,
}: {
  roi: SelectedRoi;
  shapeDescriptors: unknown;
  selection: LayerRunSelection;
  label: string;
  lensDescriptors: unknown;
  autoFocus: boolean;
  initialSearch?: string;
  onDone: () => void;
}) => {
  const client = useMikro();
  const shape = useMemo(() => annotationObject(roi, shapeDescriptors), [roi, shapeDescriptors]);
  const objects = useMemo(() => [shape], [shape]);
  const virtual = useMemo(
    () => runLensObject(selection, label, lensDescriptors),
    [selection, label, lensDescriptors],
  );
  const partners = useMemo(() => [virtual], [virtual]);

  // Awaited by every run path. The registry keeps one mutation per selection
  // (and forgets a failed one), so a second run reuses the lens.
  const materialize = useCallback<NonNullable<SmartContextProps["materialize"]>>(async () => {
    let id: string;
    try {
      id = await lensRegistry(client).ensureArrayLens(selection.datasetId, selection.slices);
    } catch (error) {
      throw new Error(`Could not make the lens of what is visible: ${classifyError(error).message}`);
    }
    return {
      objects: [shape],
      partners: [structure(ARRAY_LENS_IDENTIFIER, id, { label: virtual.label, descriptors: virtual.descriptors })],
    };
  }, [client, selection, shape, virtual]);

  return (
    <FloatRunMenu
      objects={objects}
      partners={partners}
      sections={PAIR_SECTIONS}
      materialize={materialize}
      line={null}
      searchPlaceholder="Run on everything…"
      emptyText="Nothing runs on this shape with everything visible"
      autoFocus={autoFocus || !!initialSearch}
      initialSearch={initialSearch}
      onDone={onDone}
    />
  );
};
