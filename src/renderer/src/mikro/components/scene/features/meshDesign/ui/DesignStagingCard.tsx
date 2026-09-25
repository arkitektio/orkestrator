import { useState } from "react";
import { Eye, EyeOff, Plus, Redo2, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useDialog } from "@/app/dialog";
import { useModeStore } from "../../../platform/stores/modeStore";
import { useSceneStore, useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useBrushSkeletonStoreApi } from "../../annotations/enhancers/brushSkeletonStore";
import { useRoiSelectionStoreApi } from "../../annotations/roiSelectionStore";
import { loftSelectedPolygons } from "../tools/loftAction";
import { tubeFromSelectedPath } from "../tools/tubeFromPathAction";
import { simplifyGeometry } from "../ops/simplify";
import {
  DESIGN_TRIANGLE_BUDGET,
  totalTriangles,
  useMeshDesignStore,
  useMeshDesignStoreApi,
  type DesignMesh,
} from "../store/meshDesignStore";

/**
 * The design session as a STAGING entry in the sidebar's layer panel: the
 * uncommitted meshes behave like a layer (they render in the scene), so they
 * are listed where layers are listed — with the management verbs (rename,
 * simplify, visibility, remove, commit) that were crowding the in-viewport
 * HUD. The HUD (`MeshDesignToolbar`) keeps only the gesture surface: hints
 * and the held-tool pickers, next to where the pointer is.
 *
 * Deliberately NOT a `cardRegistry` entry: those render server `SceneLayer`s
 * and this is session state — pretending otherwise would hand it controls
 * (opacity, colormaps, delete-on-server) that mean nothing here.
 */

const MeshRow = ({ mesh, selected }: { mesh: DesignMesh; selected: boolean }) => {
  const api = useMeshDesignStoreApi();
  const [ratio, setRatio] = useState(mesh.simplifyRatio);
  const [busy, setBusy] = useState(false);
  // Re-sync the slider when the store's ratio moves under it (a reset, an
  // import) — adjusted during render, the React-sanctioned form of "derive
  // state from a prop", rather than in an effect.
  const [seenRatio, setSeenRatio] = useState(mesh.simplifyRatio);
  if (seenRatio !== mesh.simplifyRatio) {
    setSeenRatio(mesh.simplifyRatio);
    setRatio(mesh.simplifyRatio);
  }

  const applyRatio = async (value: number) => {
    setBusy(true);
    try {
      const current = await simplifyGeometry(mesh.original, value);
      if (api.getState().meshes.some((m) => m.id === mesh.id)) api.getState().setCurrent(mesh.id, current, value);
    } catch (error) {
      api.getState().setStatus("editing", `Simplification failed: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const triangles = mesh.current.indices.length / 3;
  return (
    <div
      className={`flex items-center gap-2 rounded px-1 py-0.5 ${selected ? "bg-white/10" : ""}`}
      onClick={() => api.getState().select(mesh.id)}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `hsl(${mesh.hue} 65% 55%)` }} />
      {selected && (
        <span className="rounded bg-emerald-500/30 px-1 text-[9px] uppercase text-emerald-200" title="Strokes add to this mesh">
          active
        </span>
      )}
      <input
        className="w-0 min-w-10 flex-1 bg-transparent text-[10px] outline-none"
        value={mesh.name}
        onChange={(event) => api.getState().renameMesh(mesh.id, event.target.value)}
        onClick={(event) => event.stopPropagation()}
      />
      <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
        {triangles.toLocaleString()} tri
      </span>
      <div className="w-20 shrink-0" title="Simplify — how much of the extracted detail to keep" onClick={(event) => event.stopPropagation()}>
        <Slider
          min={0.02}
          max={1}
          step={0.02}
          value={[ratio]}
          disabled={busy}
          onValueChange={([value]) => setRatio(value)}
          onValueCommit={([value]) => void applyRatio(value)}
        />
      </div>
      <Button
        size="xs"
        variant="ghost"
        className="h-5 w-5 shrink-0 p-0"
        title={mesh.visible ? "Hide" : "Show"}
        onClick={(event) => {
          event.stopPropagation();
          api.getState().setVisible(mesh.id, !mesh.visible);
        }}
      >
        {mesh.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </Button>
      <Button
        size="xs"
        variant="ghost"
        className="h-5 w-5 shrink-0 p-0"
        title="Remove from the design"
        onClick={(event) => {
          event.stopPropagation();
          api.getState().removeMesh(mesh.id);
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export const DesignStagingCard = () => {
  const interactionMode = useModeStore((s) => s.interactionMode);
  const meshes = useMeshDesignStore((s) => s.meshes);
  const selectedId = useMeshDesignStore((s) => s.selectedId);
  const status = useMeshDesignStore((s) => s.status);
  const origin = useMeshDesignStore((s) => s.origin);
  const reset = useMeshDesignStore((s) => s.reset);
  const undo = useMeshDesignStore((s) => s.undo);
  const redo = useMeshDesignStore((s) => s.redo);
  const canUndo = useMeshDesignStore((s) => s.history.length > 0);
  const canRedo = useMeshDesignStore((s) => s.future.length > 0);
  const newMesh = useMeshDesignStore((s) => s.newMesh);
  const designApi = useMeshDesignStoreApi();
  const brushApi = useBrushSkeletonStoreApi();
  const sceneApi = useSceneStoreApi();
  const roiSelectionApi = useRoiSelectionStoreApi();
  const sceneId = useSceneStore((s) => s.id);
  const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
  const world = useSceneStore((s) => s.transformContext.worldCoordinateSystem);
  const { openDialog } = useDialog();

  // The staging entry exists while there is a session to manage — in any
  // interaction mode (reviewing before commit shouldn't require holding M) —
  // or while DESIGN is active with an empty session (so the actions are
  // discoverable).
  if (meshes.length === 0 && interactionMode !== "DESIGN") return null;

  const triangles = totalTriangles(meshes);
  const committing = status === "baking" || status === "uploading" || status === "committing";

  return (
    <div className="pointer-events-auto mb-1 flex flex-col gap-0.5 rounded-md border border-emerald-500/25 bg-background/80 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase text-emerald-200/90" title="Uncommitted design session — commits as one mesh collection">
          Design staging
        </span>
        <span
          className={`text-[10px] tabular-nums ${triangles > DESIGN_TRIANGLE_BUDGET ? "text-amber-300/90" : "text-muted-foreground"}`}
          title={
            triangles > DESIGN_TRIANGLE_BUDGET
              ? "A designed collection is drawn in full — simplify before committing"
              : "Triangles across the session"
          }
        >
          {triangles.toLocaleString()} tri
        </span>
      </div>
      {origin && (
        <span className="text-[10px] text-muted-foreground" title="Committing writes a NEW collection derived from this one">
          editing {origin.collectionId} ({origin.version})
        </span>
      )}
      {meshes.length === 0 ? (
        <span className="text-[10px] text-muted-foreground">Nothing staged — hold C/V/S in the scene to add a mesh.</span>
      ) : (
        meshes.map((mesh) => <MeshRow key={mesh.id} mesh={mesh} selected={mesh.id === selectedId} />)
      )}
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <Button
          size="xs"
          variant="default"
          disabled={committing || !world || meshes.length === 0}
          onClick={() => {
            if (!world) return;
            brushApi.getState().clear();
            // Dialogs render outside the scene scope: hand the session over
            // as props, take the outcome back through callbacks.
            openDialog(
              "commitmeshdesign",
              {
                sceneId,
                world,
                meshes: designApi.getState().meshes,
                origin: designApi.getState().origin,
                onProgress: (progress) => designApi.getState().setStatus(progress.status, progress.message),
                onCommitted: () => {
                  // A new version replaces the old on screen: hide the layer
                  // this session was loaded from (session-local; the server
                  // keeps both versions).
                  const source = designApi.getState().origin?.layerId;
                  if (source) patchSceneLayer(source, { visible: false });
                  designApi.getState().reset();
                },
                onFailed: (message) => designApi.getState().setStatus("error", message),
              },
              { size: "small" },
            );
          }}
        >
          {committing ? "Committing…" : origin ? "Commit as new version" : "Commit collection"}
        </Button>
        <Button size="xs" variant="ghost" className="h-6 w-6 p-0" title="Undo the last sculpt (⌘Z)" disabled={committing || !canUndo} onClick={undo}>
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="xs" variant="ghost" className="h-6 w-6 p-0" title="Redo (⇧⌘Z)" disabled={committing || !canRedo} onClick={redo}>
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="xs" variant="outline" disabled={committing || meshes.length === 0} onClick={reset}>
          Discard all
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button size="xs" variant="outline" title="Start a new mesh — the next C/V stroke goes there" onClick={() => newMesh()}>
          <Plus className="h-3 w-3" />
          <span className="text-[10px]">New mesh</span>
        </Button>
        <Button
          size="xs"
          variant="outline"
          title="Loft the selected polygon annotations (traced on different slices) into a mesh"
          onClick={() =>
            void loftSelectedPolygons(
              designApi.getState(),
              brushApi.getState(),
              sceneApi.getState(),
              roiSelectionApi.getState().selectedRois,
            )
          }
        >
          <span className="text-[10px]">Loft</span>
        </Button>
        <Button
          size="xs"
          variant="outline"
          title="Sweep the selected path annotation into a tube at the brush radius"
          onClick={() =>
            void tubeFromSelectedPath(
              designApi.getState(),
              brushApi.getState(),
              sceneApi.getState(),
              roiSelectionApi.getState().selectedRois,
            )
          }
        >
          <span className="text-[10px]">Tube</span>
        </Button>
      </div>
    </div>
  );
};
