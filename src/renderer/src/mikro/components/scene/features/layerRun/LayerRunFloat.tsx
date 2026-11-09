import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BoxIcon,
  CropIcon,
  DatabaseIcon,
  EyeIcon,
  InfoIcon,
  LayersIcon,
  PinIcon,
  SquareIcon,
  TriangleAlert,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import type { SmartSectionSelection } from "@/core/smart/extensions/section";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { structure } from "@/core/smart/structure";
import { Button } from "@/core/ui/button";
import { useMikro } from "@/mikro/api/funcs";
import { useGetSlicedDescriptorsQuery } from "@/mikro/api/graphql";
import { lensRegistry } from "@/mikro/lib/lenses/lensRegistry";

import { FloatMenu, type FloatMenuEntry } from "../../platform/float/FloatMenu";
import { FloatRunMenu } from "../../platform/float/FloatRunMenu";
import { projectToScreen } from "../../platform/float/projectScreenRect";
import { SceneFloat, type FloatView } from "../../platform/float/SceneFloat";
import { useOptionalSceneFloatStoreApi } from "../../platform/float/floatStore";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useRoiSelectionStoreApi } from "../annotations/roiSelectionStore";
import { StagedPane, useFloatStaging, type FloatStaging } from "../staging/FloatStaging";
import { FloatStagingScope } from "../staging/StageToggle";
import { useLayerRunStore, useLayerRunStoreApi, type LayerRunMenuRequest } from "./layerRunSlice";
import { scopedSelectionAt } from "./layerRunSnapshot";
import {
  ARRAY_LENS_IDENTIFIER,
  cutSize,
  keptAxes,
  pinSummary,
  runLensLabel,
  runLensObject,
  runPhrase,
  type KeptAxis,
  type LayerRunSelection,
  type RunKind,
  type RunScope,
} from "./layerRunTarget";

/**
 * Only what RUNS on the lens: it is not made yet, so nothing that would open,
 * share or delete it by id belongs here. By id, as strings — the sections are
 * rekuest's and kabinet's, each behind its own guard.
 */
const RUN_SECTIONS: SmartSectionSelection = {
  only: ["rekuest.shortcuts", "rekuest.actions", "kabinet.definitions"],
};

const RUN_SCOPES: readonly RunScope[] = ["view", "channel", "everything"];

const KIND_TITLE: Record<RunKind, string> = {
  slice: "This slice",
  selection: "This selection",
  channel: "This channel",
  everything: "Everything",
};

const KIND_ICON: Record<RunKind, LucideIcon> = {
  slice: SquareIcon,
  selection: BoxIcon,
  channel: LayersIcon,
  everything: DatabaseIcon,
};

/** Up-right of the click, clear of the cursor: as a shape's card sits. */
const BUTTON_POINTER_OFFSET_PX = 12;

/**
 * The float of a right-click on the image (`SceneContextMenu` opens it): the
 * annotation card's twin (`platform/float/SceneFloat`), pinned to the world
 * point clicked so it follows the camera.
 *
 * What it is about is a lens of what was on screen, not made yet — "this
 * slice" in 2D, "this selection" in 3D (the volume, or the crop box). Its body
 * is the same short menu as a shape's card:
 *
 * - **In the scene**: what a run from here staged, to keep or discard.
 * - **Run**: the actions that take that lens, as tiles, with a "Run on" picker
 *   for another shown layer at the same place and frame. mikro says what the
 *   lens would provide (`ArrayDataset.descriptorsSliced`), so a port's
 *   `Requires` narrows the list as on a real lens; the lens is made when an
 *   action runs (`materialize`), as "On the crop to this shape" makes its crop.
 * - **Details**: what the cut keeps along every axis.
 *
 * One float at a time: a shape's card or a mesh's replaces it, and it closes
 * like theirs (×, Escape, a press outside), discarding what nobody kept.
 */
export const LayerRunFloat = () => {
  const request = useLayerRunStore((s) => s.layerRunMenu);
  if (!request) return null;
  return <OpenLayerRunFloat key={request.serial} request={request} />;
};

type ScopedSelections = Record<RunScope, LayerRunSelection | null>;

const OpenLayerRunFloat = ({ request }: { request: LayerRunMenuRequest }) => {
  const runApi = useLayerRunStoreApi();
  const close = useCallback(() => {
    const state = runApi.getState();
    if (state.layerRunMenu?.serial === request.serial) state.closeLayerRunMenu();
  }, [runApi, request.serial]);

  const { layerId } = request;
  const { snapshot } = request;
  // Every scope's cut at once, as a STRING subscription: a layer edit (a
  // contrast drag) replaces the layer object per tick, but rarely changes a
  // cut — this re-renders only then.
  const selectionsKey = useSceneStore((s) => {
    const layer = s.layers.find((candidate) => candidate.id === layerId);
    return layer ? JSON.stringify(RUN_SCOPES.map((scope) => scopedSelectionAt(layer, snapshot, scope))) : null;
  });
  const selections = useMemo<ScopedSelections | null>(() => {
    if (!selectionsKey) return null;
    const [view, channel, everything] = JSON.parse(selectionsKey) as (LayerRunSelection | null)[];
    return { view, channel, everything };
  }, [selectionsKey]);
  const layerName = useSceneStore((s) => {
    const layer = s.layers.find((candidate) => candidate.id === layerId);
    return layer ? layerDisplayLabel(layer) : null;
  });
  const datasetName = useSceneStore(
    (s) => s.layers.find((candidate) => candidate.id === layerId)?.lens.dataset.name ?? null,
  );
  const view = selections?.view ?? null;

  // Gone (the layer was removed): so is the float.
  useEffect(() => {
    if (!view) close();
  }, [view, close]);
  // Another float opened (a shape's card, a mesh's): this one goes.
  const selectionApi = useRoiSelectionStoreApi();
  const floatApi = useOptionalSceneFloatStoreApi();
  useEffect(() => {
    const offShape = selectionApi.subscribe((state) => {
      if (state.menuRoi) close();
    });
    const offMesh = floatApi?.subscribe((state) => {
      if (state.target) close();
    });
    return () => {
      offShape();
      offMesh?.();
    };
  }, [selectionApi, floatApi, close]);

  const owner = `layer-run:${request.serial}`;
  const staging = useFloatStaging(owner);
  const [pane, setPane] = useState<string | null>(null);

  const anchor = useCallback(
    ({ viewProjection, viewport }: FloatView) => {
      const at = request.anchor;
      const point =
        at.kind === "world"
          ? projectToScreen(at.point[0], at.point[1], at.point[2], viewProjection, viewport)
          : at.point;
      return point
        ? {
            kind: "point" as const,
            point: { x: point.x + BUTTON_POINTER_OFFSET_PX, y: point.y - BUTTON_POINTER_OFFSET_PX },
          }
        : null;
    },
    [request.anchor],
  );

  if (!selections || !view || !layerName) return null;
  // The float is about what was clicked: the view's cut.
  const Icon = KIND_ICON[view.kind];
  const title = KIND_TITLE[view.kind];

  return (
    // Around the whole float: whatever an action run from here returns is
    // staged under it, and closing it discards what nobody kept.
    <FloatStagingScope owner={owner}>
      <SceneFloat
        anchor={anchor}
        expanded
        dismissable
        onDismiss={close}
        // A right-click elsewhere re-opens it there: that is the answer.
        sceneClaim={() => runApi.getState().layerRunMenu}
        button={
          <span
            // -1px: the surface's border is inside the 24px the avatar fills.
            className="-m-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            aria-label={title}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        }
        header={
          <>
            <span className="min-w-0 flex-1 truncate text-xs">
              <span className="font-medium">{title}</span>
              <span className="text-muted-foreground">{` of ${layerName}`}</span>
            </span>
            <Button variant="ghost" size="icon-xs" className="mr-0.5" aria-label="Close" onClick={close}>
              <XIcon />
            </Button>
          </>
        }
      >
        <LayerRunFloatMenu
          layerId={layerId}
          layerName={layerName}
          datasetName={datasetName}
          selections={selections}
          view={view}
          staging={staging}
          pane={pane}
          onPaneChange={setPane}
        />
      </SceneFloat>
    </FloatStagingScope>
  );
};

/** The pane id of a scope's Run row. */
const runPaneId = (scope: RunScope) => `run-${scope}`;

const LayerRunFloatMenu = ({
  layerId,
  layerName,
  datasetName,
  selections,
  view,
  staging,
  pane,
  onPaneChange,
}: {
  layerId: string;
  layerName: string;
  datasetName: string | null;
  selections: ScopedSelections;
  /** The view's cut: what the float is about, its summary and Details. */
  view: LayerRunSelection;
  staging: FloatStaging;
  pane: string | null;
  onPaneChange: (pane: string | null) => void;
}) => {
  const sceneApi = useSceneStoreApi();
  const spatialKey = useSceneStore((s) => {
    const layer = s.layers.find((candidate) => candidate.id === layerId);
    return layer ? `${layer.xAxis ?? ""}|${layer.yAxis ?? ""}|${layer.zAxis ?? ""}` : "";
  });
  const spatial = spatialKey.split("|").map((axis) => axis || null);
  // Read once per cut: the dataset does not change under an open float.
  const kept = useMemo(() => {
    const layer = sceneApi.getState().layers.find((candidate) => candidate.id === layerId);
    return layer ? keptAxes(view, layer.lens.dataset) : [];
  }, [sceneApi, layerId, view]);
  const size = cutSize(kept, spatial);
  const staged = staging.entries.length;

  // One Run row per scope the layer has here, the view's first: a layer
  // drawing several channels has no "this channel" row.
  const runRows: FloatMenuEntry[] = RUN_SCOPES.flatMap((scope) => {
    const selection = selections[scope];
    if (!selection) return [];
    // What tells the rows apart: the cut's size, the channel's index, the dataset.
    const hint = scope === "view" ? size : scope === "channel" ? pinSummary(selection.pins) : "all channels";
    return [
      {
        id: runPaneId(scope),
        label: `Run on ${runPhrase(selection.kind)}`,
        icon: KIND_ICON[selection.kind],
        hint: hint ?? undefined,
        content: ({ typed }: { typed?: string }) => (
          <div className="px-1.5 pb-2 pt-1.5">
            <RunPane
              layerName={layerName}
              datasetName={datasetName}
              selection={selection}
              autoFocus={!!typed}
              initialSearch={typed}
            />
          </div>
        ),
      },
    ];
  });

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
    ...runRows,
    {
      id: "details",
      label: "Details",
      icon: InfoIcon,
      hint: `${kept.length} axes`,
      content: () => <KeptAxes kept={kept} />,
    },
  ];

  const pins = pinSummary(view.pins);
  const facts = [
    pins && { icon: PinIcon, text: pins, title: "Pinned to" },
    view.cropped && { icon: CropIcon, text: "crop box", title: "Cut to the crop box" },
  ].filter((fact): fact is { icon: LucideIcon; text: string; title: string } => !!fact);

  return (
    <FloatMenu
      entries={entries}
      pane={pane}
      onPaneChange={onPaneChange}
      // Typing on the root searches what runs on the view's cut.
      typeTo={runPaneId("view")}
      // A right-click: the keyboard is the float's.
      autoFocus
      summary={
        facts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {facts.map((fact) => (
              <span key={fact.title} className="flex min-w-0 items-center gap-1" title={fact.title}>
                <fact.icon className="h-3 w-3 shrink-0" />
                <span className="truncate tabular-nums">{fact.text}</span>
              </span>
            ))}
          </div>
        ) : undefined
      }
    />
  );
};

/** Run: what takes the lens of the cut, asked of mikro before it is made. */
const RunPane = ({
  layerName,
  datasetName,
  selection,
  autoFocus,
  initialSearch,
}: {
  layerName: string;
  datasetName: string | null;
  selection: LayerRunSelection;
  autoFocus: boolean;
  initialSearch?: string;
}) => {
  const { data, previousData, error, refetch } = useGetSlicedDescriptorsQuery({
    variables: { dataset: selection.datasetId, slices: selection.slices },
  });
  // Picking another layer asks again; this one's tiles stay meanwhile.
  const descriptors = data?.arrayDataset.descriptorsSliced ?? (data ? null : previousData?.arrayDataset.descriptorsSliced);

  if (error) {
    return (
      <StatusPage
        variant="compact"
        icon={TriangleAlert}
        tone="warning"
        title={`Could not read ${runPhrase(selection.kind)}`}
        description={classifyError(error).message}
        actions={<RetryButton onRetry={() => refetch()} />}
      />
    );
  }
  if (descriptors === undefined) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>;
  }
  if (descriptors === null) {
    return (
      <p className="px-2 py-1 text-xs text-muted-foreground">
        {runPhrase(selection.kind).replace(/^./, (c) => c.toUpperCase())} lies outside {layerName}.
      </p>
    );
  }
  return (
    <RunActions
      layerName={layerName}
      datasetName={datasetName}
      selection={selection}
      descriptors={descriptors}
      autoFocus={autoFocus}
      initialSearch={initialSearch}
    />
  );
};

const RunActions = ({
  layerName,
  datasetName,
  selection,
  descriptors,
  autoFocus,
  initialSearch,
}: {
  layerName: string;
  datasetName: string | null;
  selection: LayerRunSelection;
  descriptors: unknown;
  autoFocus: boolean;
  initialSearch?: string;
}) => {
  const client = useMikro();
  const label = runLensLabel(selection, layerName, datasetName);
  const virtual = useMemo(() => runLensObject(selection, label, descriptors), [selection, label, descriptors]);
  const objects = useMemo(() => [virtual], [virtual]);

  // Awaited by every run path. The registry keeps one mutation per selection
  // (and forgets a failed one), so a second run on the same slice reuses the
  // lens — the server hands the same row back for the same cut anyway.
  const materialize = useCallback<NonNullable<SmartContextProps["materialize"]>>(async () => {
    let id: string;
    try {
      id = await lensRegistry(client).ensureArrayLens(selection.datasetId, selection.slices);
    } catch (error) {
      throw new Error(`Could not make the lens of ${runPhrase(selection.kind)}: ${classifyError(error).message}`);
    }
    return {
      objects: [structure(ARRAY_LENS_IDENTIFIER, id, { label: virtual.label, descriptors: virtual.descriptors })],
      partners: [],
    };
  }, [client, selection, virtual]);

  return (
    <FloatRunMenu
      objects={objects}
      partners={[]}
      sections={RUN_SECTIONS}
      materialize={materialize}
      // The pane's title already says what it runs on.
      line={null}
      searchPlaceholder={`Run on ${runPhrase(selection.kind)}…`}
      emptyText={`Nothing runs on ${runPhrase(selection.kind)}`}
      autoFocus={autoFocus}
      initialSearch={initialSearch}
      // A finished run leaves the float open: what it returns is staged here.
      onDone={() => {}}
    />
  );
};

/** Details: every axis of the dataset, and what the cut keeps of it. */
const KeptAxes = ({ kept }: { kept: readonly KeptAxis[] }) => (
  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 px-3 pb-2 pt-1 text-xs tabular-nums">
    {kept.map((axis) => (
      <div key={axis.axis} className="contents">
        <span className="font-medium">{axis.axis}</span>
        <span className="text-muted-foreground">
          {axis.count === axis.extent && axis.step === 1
            ? `all ${axis.extent}`
            : axis.count === 1
              ? `${axis.start} of ${axis.extent}`
              : `${axis.start}–${axis.stop - 1}${axis.step > 1 ? ` every ${axis.step}` : ""} of ${axis.extent}`}
        </span>
      </div>
    ))}
  </div>
);
