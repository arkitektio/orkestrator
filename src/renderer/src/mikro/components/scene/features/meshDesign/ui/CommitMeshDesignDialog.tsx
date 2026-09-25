import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDatalayerEndpoint, useMikro } from "@/app/Arkitekt";
import { useDialog } from "@/app/dialog";
import { commitMeshDesign, type CommitProgress, type CommitResult, type WorldSystemLike } from "../commit/commitDesign";
import { DESIGN_TRIANGLE_BUDGET, totalTriangles, type DesignMesh, type DesignOrigin } from "../store/meshDesignStore";

/**
 * The commit dialog — registered as `commitmeshdesign` in `app/dialog.tsx`.
 *
 * Dialogs render at the app root, OUTSIDE any `SceneProvider`, so nothing
 * scene-scoped can be read here: the toolbar hands the session over as props
 * and takes the outcome back through callbacks. The mutations run under the
 * provider's own `Guard`.
 */
export type CommitMeshDesignDialogProps = {
  sceneId: string;
  world: WorldSystemLike;
  meshes: readonly DesignMesh[];
  origin: DesignOrigin | null;
  onProgress: (progress: CommitProgress) => void;
  onCommitted: (result: CommitResult) => void;
  onFailed: (message: string) => void;
};

export const CommitMeshDesignDialog = ({ sceneId, world, meshes, origin, onProgress, onCommitted, onFailed }: CommitMeshDesignDialogProps) => {
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();
  const { closeDialog } = useDialog();
  const [version, setVersion] = useState(() => new Date().toISOString().slice(0, 19).replace("T", " "));
  const [progress, setProgress] = useState<CommitProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const triangles = totalTriangles(meshes);
  const busy = progress !== null && !error;

  const commit = async () => {
    if (!datalayer) {
      setError("No datalayer endpoint configured");
      return;
    }
    abort.current = new AbortController();
    setError(null);
    const report = (p: CommitProgress) => {
      setProgress(p);
      onProgress(p);
    };
    try {
      const result = await commitMeshDesign({
        client,
        datalayer,
        sceneId,
        world,
        meshes,
        origin,
        version,
        onProgress: report,
        signal: abort.current.signal,
      });
      onCommitted(result);
      closeDialog();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message);
      onFailed(message);
    }
  };

  const uploadPct =
    progress && "upload" in progress && progress.upload.bytesTotal > 0
      ? Math.round((100 * progress.upload.bytesDone) / progress.upload.bytesTotal)
      : null;

  return (
    <div className="flex flex-col gap-3 p-1">
      <div>
        <h3 className="text-sm font-semibold">{origin ? "Commit as a new version" : "Commit mesh collection"}</h3>
        <p className="text-xs text-muted-foreground">
          {meshes.length} mesh{meshes.length === 1 ? "" : "es"}, {triangles.toLocaleString()} triangles, baked into one fabriks
          collection and added to this scene as a mesh layer.
          {origin ? ` Derived from collection ${origin.collectionId} (${origin.version}).` : ""}
        </p>
        {triangles > DESIGN_TRIANGLE_BUDGET && (
          <p className="text-xs text-amber-300/90">
            A designed collection has no level of detail yet — it is drawn in full. Consider simplifying before committing.
          </p>
        )}
      </div>
      <label className="flex flex-col gap-1 text-xs">
        Version
        <Input value={version} onChange={(event) => setVersion(event.target.value)} disabled={busy} />
      </label>
      <div className="max-h-40 overflow-y-auto rounded border border-white/10 text-xs">
        {meshes.map((mesh) => (
          <div key={mesh.id} className="flex items-center gap-2 px-2 py-0.5">
            <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${mesh.hue} 65% 55%)` }} />
            <span className="flex-1 truncate">{mesh.name}</span>
            <span className="text-muted-foreground">#{mesh.objectId}</span>
            <span className="w-20 text-right tabular-nums text-muted-foreground">
              {(mesh.current.indices.length / 3).toLocaleString()} tri
            </span>
          </div>
        ))}
      </div>
      {progress && !error && (
        <div className="text-xs text-muted-foreground">
          {progress.message}
          {uploadPct !== null ? ` ${uploadPct}%` : ""}
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => closeDialog()} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => void commit()} disabled={busy || meshes.length === 0 || !version.trim()}>
          {busy ? "Committing…" : "Commit"}
        </Button>
      </div>
    </div>
  );
};
