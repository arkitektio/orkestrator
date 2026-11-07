import { useGetMeshObjectSourceQuery } from "@/mikro/api/graphql";
import { describeError } from "@/core/notify";
import { useWebGPUGate } from "@/core/data/scene/gpu/useWebGPUGate";
import type { ViewerWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { parseMeshObjectId } from "../components/meshcollection/meshObjectId";
import { ViewerNotice } from "./EmbeddedScene";
import { MeshObjectCanvas } from "./MeshObjectCanvas";
import { useMeshObjectGeometry } from "./meshObjectGeometry";

/**
 * The viewer for `@mikro/meshobject` (`<collection>:<object>`): that one
 * surface, alone and orbitable, off any scene. A canvas root, so black and in
 * the dark scope; it fills the box it is given.
 */
const MeshObjectViewer = ({ id, className }: ViewerWidgetProps) => {
  const parsed = parseMeshObjectId(id);
  const gate = useWebGPUGate();
  const { data, error: queryError } = useGetMeshObjectSourceQuery({
    variables: { collection: parsed?.collection ?? "", object: parsed?.object ?? 0 },
    skip: !parsed,
  });
  const meshObject = data?.meshObject;
  const state = useMeshObjectGeometry(meshObject?.collection ?? null, meshObject?.objectId ?? null);

  const box = cn("dark h-full w-full bg-black text-foreground", className);
  const notice = (text: string) => <ViewerNotice className={box}>{text}</ViewerNotice>;

  if (!parsed) return notice("This is not a mesh object.");
  if (gate.phase === "unsupported") return notice(gate.message ?? "This viewer needs WebGPU.");
  if (queryError) return notice(describeError(queryError).message);
  if (state.phase === "unavailable") return notice("No storage is configured to read meshes from.");
  if (state.phase === "error") return notice(describeError(state.error).message);
  if (gate.phase === "checking" || state.phase === "loading") return notice("Loading mesh…");
  const read = state.read;
  if (read.kind === "absent") return notice("This mesh is not in its collection.");
  if (read.kind === "too-large") {
    return notice(`Too large to preview here (${read.indexCount.toLocaleString()} indices). Open it in its scene.`);
  }
  return (
    <div className={box}>
      <MeshObjectCanvas geometry={read.geometry} />
    </div>
  );
};

export default MeshObjectViewer;
