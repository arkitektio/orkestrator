import { useState } from "react";
import { DatabaseIcon, EyeIcon, ImageIcon, InfoIcon, LayersIcon, PinIcon, RulerIcon, ShapesIcon } from "lucide-react";

import { FloatMenu, type FloatMenuEntry } from "../../../platform/float/FloatMenu";
import { layerDisplayLabel } from "../../../platform/layerui/layerIdentity";
import { formatAnnotationKind } from "../../../platform/model/selectionFormat";
import { effectiveDataLayerId } from "../../../platform/probe/probeTargeting";
import { useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useViewerStore } from "../../../platform/stores/viewerStore";
import type { SelectedRoi } from "../roiSelectionStore";
import { StagedPane, type FloatStaging } from "../../staging/FloatStaging";
import { useRoiMeasure } from "../useRoiMeasure";
import {
  AnnotationDerived,
  type AnnotationInfo,
  AnnotationDetails,
  InfoPending,
  derivedCount,
  hasDetails,
  useAnnotationInfo,
} from "./AnnotationInfoCard";
import { AnnotationPairActions } from "./AnnotationPairActions";
import { AnnotationEverythingActions, AnnotationShapeActions, useVisibleEverything } from "./AnnotationRunActions";

const NOTHING = () => {};

/**
 * The annotation float's body: a short menu, each row its own pane.
 *
 * - **In the scene**: what this card staged, to keep or discard. Shown only
 *   while there is something, first, in the brand hue.
 * - **Run on <shape>**: the actions on this shape alone.
 * - **Run on layer**: a list of the scene's layers; each lists the actions on
 *   this shape with that layer's image, and on its crop to the shape
 *   (`AnnotationPairActions`).
 * - **Run on everything**: the actions on this shape with what is visible
 *   across every channel — the plane or crop box at the frame shown, never the
 *   whole dataset (`AnnotationEverythingActions`). Typing on the menu lands
 *   here (on the shape alone when nothing is visible).
 * - **Derived**: what was cut, computed or refined from it, each stageable.
 * - **Details**: its description, where it is pinned, what it was made from.
 *
 * The shape's question (`GetAnnotationInfo`) is asked here, once, so the rows
 * can say how much each pane holds.
 */
export const AnnotationFloatMenu = ({
  roi,
  staging,
  pane,
  onPaneChange,
  autoFocus,
}: {
  roi: SelectedRoi;
  staging: FloatStaging;
  pane: string | null;
  onPaneChange: (pane: string | null) => void;
  autoFocus: boolean;
}) => {
  const { data, error, refetch } = useAnnotationInfo(roi.id);
  const info = data?.annotation;
  const staged = staging.entries.length;
  const pending = <InfoPending error={error} onRetry={() => refetch()} />;
  const kindWord = formatAnnotationKind(roi.kind).toLowerCase();
  const everything = useVisibleEverything();
  const dataLayerName = useDataLayerName();

  const entries: FloatMenuEntry[] = [
    {
      id: "staged",
      label: "In the scene",
      icon: EyeIcon,
      accent: true,
      hidden: staged === 0,
      hint: `${staged} not saved`,
      content: () => <StagedPane staging={staging} />,
    },
    {
      id: "run-shape",
      label: `Run on ${kindWord}`,
      icon: ShapesIcon,
      content: ({ typed }) => (
        <div className="px-1.5 pb-2 pt-1.5">
          {info ? (
            <AnnotationShapeActions
              roi={roi}
              kindWord={kindWord}
              descriptors={info.descriptors}
              autoFocus={!!typed}
              initialSearch={typed}
              onDone={NOTHING}
            />
          ) : (
            pending
          )}
        </div>
      ),
    },
    {
      id: "run-layer",
      label: "Run on layer",
      icon: LayersIcon,
      hint: dataLayerName ?? undefined,
      content: () => <LayerList roi={roi} />,
    },
    {
      id: "run-everything",
      label: "Run on everything",
      icon: DatabaseIcon,
      hint: "visible, all channels",
      hidden: !everything,
      content: ({ typed }) => (
        <div className="px-1.5 pb-2 pt-1.5">
          {info && everything ? (
            <AnnotationEverythingActions
              roi={roi}
              shapeDescriptors={info.descriptors}
              everything={everything}
              autoFocus={!!typed}
              initialSearch={typed}
              onDone={NOTHING}
            />
          ) : (
            pending
          )}
        </div>
      ),
    },
    {
      id: "derived",
      label: "Derived",
      icon: LayersIcon,
      hint: info ? derivedCount(info) : "…",
      content: () => (info ? <AnnotationDerived info={info} /> : pending),
    },
    {
      id: "details",
      label: "Details",
      icon: InfoIcon,
      // The context line already says where it is pinned: Details is for
      // what it was made from, and a description too long for two lines.
      hidden: !info || !hasDetails(info) || (!info.description && info.derivedFrom.length === 0),
      content: () => (info ? <AnnotationDetails info={info} /> : pending),
    },
  ];

  return (
    <FloatMenu
      entries={entries}
      pane={pane}
      onPaneChange={onPaneChange}
      typeTo={everything ? "run-everything" : "run-shape"}
      autoFocus={autoFocus}
      summary={<AnnotationContext roi={roi} info={info} />}
    />
  );
};

/**
 * The few facts that place the shape, above the menu: how big it is (in the
 * scene's units), which slice it is pinned to, and the first lines of its
 * description. Nothing that needs a click.
 */
const AnnotationContext = ({ roi, info }: { roi: SelectedRoi; info: AnnotationInfo | undefined }) => {
  const measure = useRoiMeasure(roi);
  const pinned = roi.coordinates.map((coordinate) => `${coordinate.name} ${coordinate.value}`).join(" · ");
  const facts = [
    measure && { icon: RulerIcon, text: measure, title: "Size" },
    pinned && { icon: PinIcon, text: pinned, title: "Pinned to" },
  ].filter((fact): fact is { icon: typeof RulerIcon; text: string; title: string } => !!fact);
  if (facts.length === 0 && !info?.description) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {facts.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {facts.map((fact) => (
            <span key={fact.title} className="flex min-w-0 items-center gap-1" title={fact.title}>
              <fact.icon className="h-3 w-3 shrink-0" />
              <span className="truncate tabular-nums">{fact.text}</span>
            </span>
          ))}
        </div>
      )}
      {info?.description && <p className="line-clamp-2 text-foreground/80">{info.description}</p>}
    </div>
  );
};

/** The data layer's name, for the "Run on layer" row's hint. */
const useDataLayerName = (): string | null => {
  const sceneApi = useSceneStoreApi();
  const pin = useViewerStore((s) => s.dataLayerId);
  const layers = sceneApi.getState().layers;
  const id = effectiveDataLayerId(pin, layers);
  const layer = layers.find((candidate) => candidate.id === id);
  return layer ? layerDisplayLabel(layer) : null;
};

/**
 * "Run on layer": every image layer of the scene, each a row opening what runs
 * on this shape with that layer's image (and on its crop). Hidden layers too:
 * an action reads the lens, not the pixels on screen. Listed when the pane
 * opens (a `getState()` read), so a layer edit does not re-render it.
 */
const LayerList = ({ roi }: { roi: SelectedRoi }) => {
  const sceneApi = useSceneStoreApi();
  const pin = useViewerStore((s) => s.dataLayerId);
  const [pane, setPane] = useState<string | null>(null);
  const [rows] = useState(() => {
    const layers = sceneApi.getState().layers;
    const dataLayerId = effectiveDataLayerId(pin, layers);
    return layers.map((layer) => ({
      id: layer.id,
      label: layerDisplayLabel(layer),
      hint: layer.id === dataLayerId ? "data" : layer.visible === false ? "hidden" : undefined,
    }));
  });
  if (rows.length === 0) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">No image layer to run with.</p>;
  }
  const entries: FloatMenuEntry[] = rows.map((row) => ({
    id: row.id,
    label: row.label,
    icon: ImageIcon,
    hint: row.hint,
    content: ({ typed }) => (
      <div className="px-1.5 pb-2 pt-1.5">
        <AnnotationPairActions
          roi={roi}
          layerId={row.id}
          autoFocus={!!typed}
          initialSearch={typed}
          onDone={NOTHING}
        />
      </div>
    ),
  }));
  return <FloatMenu entries={entries} pane={pane} onPaneChange={setPane} autoFocus />;
};
