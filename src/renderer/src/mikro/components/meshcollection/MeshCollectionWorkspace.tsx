import { BoxIcon, Eye } from "lucide-react";

import { reportErrorAs } from "@/core/notify";
import { Button } from "@/core/ui/button";
import {
  useCreateSceneFromLensMutation,
  useSetLensDefaultSceneMutation,
  type ListSceneFragment,
} from "../../api/graphql";
import { InvertedText } from "../lens/InvertedText";
import { SceneSwitcher } from "../scene/SceneSwitcher";
import { useWorkspaceScene } from "../scene/workspaceScene";

/** What a mesh page needs of its collection: its whole lens, and the scenes that draws in. */
export type WorkspaceCollection = {
  id: string;
  label: string;
  fullLens?: {
    id: string;
    defaultScene?: ListSceneFragment | null;
    scenes: ListSceneFragment[];
  } | null;
};

/**
 * The scene a mesh collection's pages open: the one its whole lens nominates
 * (`createSceneFromLens` nominates the first), else the first it is drawn in;
 * `?scene=` picks another. Shared by the collection's page and each mesh's.
 */
export const useMeshCollectionScene = (collection: WorkspaceCollection) =>
  useWorkspaceScene({
    scenes: collection.fullLens?.scenes ?? [],
    landOn: collection.fullLens?.defaultScene?.id,
  });

/**
 * Over the canvas, top-left: the page's title, what it is, and which of the
 * collection's scenes is showing — the array dataset page's title card, for
 * meshes.
 */
export const MeshTitleOverlay = ({
  title,
  subtitle,
  collection,
  activeSceneId,
  onSelectScene,
  sceneLoading,
}: {
  title: string;
  subtitle: string;
  collection: WorkspaceCollection;
  activeSceneId: string | undefined;
  onSelectScene: (id: string) => void;
  sceneLoading: boolean;
}) => {
  const [setDefault, { loading: nominating }] = useSetLensDefaultSceneMutation({
    refetchQueries: ["GetMeshCollection", "GetMeshObject"],
  });
  const lens = collection.fullLens;
  return (
    <div className="pointer-events-auto absolute left-6 top-4 flex w-[50%] flex-col gap-2 rounded-lg">
      <div className="flex flex-col gap-0.5">
        <h1 className="min-w-0 text-3xl font-semibold leading-tight">
          <InvertedText>{title}</InvertedText>
        </h1>
        <div className="flex items-center gap-2 font-mono text-xs">
          <InvertedText>{subtitle}</InvertedText>
        </div>
      </div>
      {lens && (
        <SceneSwitcher
          scenes={lens.scenes}
          activeSceneId={activeSceneId}
          defaultSceneId={lens.defaultScene?.id}
          onSelectScene={onSelectScene}
          nominating={nominating}
          onMakeDefault={(scene) =>
            setDefault({ variables: { lens: lens.id, scene } }).catch(
              reportErrorAs("Couldn't make this the default scene"),
            )
          }
        />
      )}
      {sceneLoading && <InvertedText className="text-xs">Loading scene…</InvertedText>}
    </div>
  );
};

/**
 * Where the renderer would be while the collection is in no scene: what it
 * is, and the one action that follows — open it in a scene of its own space.
 */
export const MeshCollectionBackdrop = ({
  collection,
  onSceneCreated,
}: {
  collection: WorkspaceCollection;
  onSceneCreated: (sceneId: string) => void;
}) => {
  const [createScene, { loading }] = useCreateSceneFromLensMutation({
    // The lens nominates this first scene; awaited, so the page lands on it.
    refetchQueries: ["GetMeshCollection", "GetMeshObject"],
    awaitRefetchQueries: true,
    onCompleted: (result) => onSceneCreated(result.createSceneFromLens.id),
  });
  const lens = collection.fullLens;
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <BoxIcon className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{collection.label}</h2>
        <p className="text-sm text-muted-foreground">These meshes are in no scene yet.</p>
        <Button
          disabled={!lens || loading}
          onClick={() =>
            lens &&
            void createScene({ variables: { input: { lens: lens.id } } }).catch(
              reportErrorAs("Couldn't open the meshes in a scene"),
            )
          }
        >
          <Eye className="mr-2 h-4 w-4" />
          {loading ? "Opening…" : "Open in a scene"}
        </Button>
      </div>
    </div>
  );
};
