import { useCallback, useRef, type ReactNode } from "react";

import { reportError, toast } from "@/core/notify";
import { SmartResultSink, resultOriginKey, type ResultOrigin } from "@/core/smart/extensions/results";
import { uniqueStructures } from "@/core/smart/structure";
import type { Structure } from "@/core/types";
import { CreateMeshLayerDocument, DeleteLayerDocument } from "@/mikro/api/graphql";
import { useMikro } from "@/mikro/api/funcs";
import { LAYER_KIND_INFO } from "@/mikro/forms/addLayer/engine";
import { stageLens, type StageOutcome } from "@/mikro/forms/addLayer/stageLens";
import { LENS_KINDS } from "@/mikro/lenses";
import { useLensRegistry } from "@/mikro/lib/lenses/useLensRegistry";

import { useSceneStore } from "../../platform/stores/sceneStore";

/** What the scene can draw of a returned lens: an array lens, through Add Layer's engine. */
const ARRAY_LENS = LENS_KINDS.ArrayLens.identifier;
/** A surface an action extracted: drawn as a mesh layer over the whole lens it returned. */
const MESH_LENS = LENS_KINDS.MeshLens.identifier;
/** A shape an action drew: it lives in a collection the scene already shows, so a refetch shows it. */
const ANNOTATION = "@mikro/annotation";

type MikroClient = ReturnType<typeof useMikro>;

/** What the scene says about one returned lens. */
export const stageMessage = (outcome: StageOutcome): { kind: "success" | "info"; text: string } =>
  outcome.status === "added"
    ? { kind: "success", text: `Added ${outcome.label} as ${LAYER_KIND_INFO[outcome.kind].title.toLowerCase()} layer` }
    : outcome.status === "present"
      ? { kind: "info", text: `${outcome.label} is already in this scene` }
      : { kind: "info", text: "The result was made, but cannot be placed in this scene" };

/**
 * A returned mesh lens as a mesh layer. The server refuses a lens with no path
 * to the scene's world, and that refusal is the "cannot be placed" answer.
 */
export const stageMeshLens = async (
  client: MikroClient,
  input: { scene: string; lens: string },
): Promise<string | null> => {
  const created = (await client.mutate({
    mutation: CreateMeshLayerDocument,
    variables: { input: { scene: input.scene, lens: input.lens } },
    refetchQueries: ["GetScene"],
  } as unknown as Parameters<MikroClient["mutate"]>[0])) as { data?: { createMeshLayer?: { id: string } | null } };
  return created.data?.createMeshLayer?.id ?? null;
};

/**
 * Which layers each run added, by `resultOriginKey`: the same action on the
 * same objects. A rerun, typically the same action with other settings,
 * replaces them. Only layers this sink added are ever removed; the datasets
 * behind them stay.
 */
export class RerunLayers {
  private readonly added = new Map<string, string[]>();

  /** Record what a run added; answers the layers of its previous run to remove now. */
  replace(origin: ResultOrigin | undefined, layers: string[]): string[] {
    if (!origin || layers.length === 0) return [];
    const key = resultOriginKey(origin);
    const previous = this.added.get(key) ?? [];
    this.added.set(key, layers);
    return previous.filter((layer) => !layers.includes(layer));
  }
}

/**
 * Every menu of the scene itself — the viewport (a shape's card, the
 * right-click menu) and its sidebar tabs (the layer rows) — hands what its
 * runs return here, never the page around it: a page that hosts the scene's
 * stores (`Scene.Provider` around a ModelPage) runs its header's actions
 * outside this. Mounted under `SceneGuard`, so the scene's stores exist.
 *
 * What lands here (`SmartResultSink`):
 * - an array lens an action made (a crop, a segmentation's labels) is added
 *   the way Add Layer would add it (`stageLens`);
 * - a mesh lens (an extracted surface) becomes a mesh layer;
 * - an annotation (a refined path) is shown by refetching the scene's shapes.
 *
 * One run at a time, in the order the runs finish, so a second channel takes
 * the next colour after the first. A rerun of the same action on the same
 * objects removes the layers its previous run added (`RerunLayers`): tuning
 * an action from a shape's card then leaves one result, not a stack of them.
 */
export const SceneResultSink = ({ children }: { children?: ReactNode }) => {
  const scene = useSceneStore((s) => s.id);
  const client = useMikro();
  const registry = useLensRegistry();
  const queue = useRef<Promise<void>>(Promise.resolve());
  const reruns = useRef(new RerunLayers());

  const onResults = useCallback(
    (results: Structure[], origin?: ResultOrigin) => {
      if (!scene) return;
      const lenses = uniqueStructures(results.filter((result) => result.identifier === ARRAY_LENS));
      const meshes = uniqueStructures(results.filter((result) => result.identifier === MESH_LENS));
      const annotations = results.some((result) => result.identifier === ANNOTATION);

      queue.current = queue.current.then(async () => {
        const added: string[] = [];
        for (const lens of lenses) {
          try {
            const outcome = await stageLens(client, registry, { scene, lens: lens.id });
            if (outcome.status === "added" && outcome.layer) added.push(outcome.layer);
            const message = stageMessage(outcome);
            toast[message.kind](message.text);
          } catch (error) {
            reportError(error, "Couldn't add the result as a layer");
          }
        }
        for (const mesh of meshes) {
          try {
            const layer = await stageMeshLens(client, { scene, lens: mesh.id });
            if (layer) added.push(layer);
            toast.success("Added the surface as a mesh layer");
          } catch (error) {
            reportError(error, "Couldn't add the surface as a layer");
          }
        }
        if (annotations) {
          await client.refetchQueries({ include: ["GetSceneAnnotations"] }).catch((error: unknown) => {
            reportError(error, "Couldn't show the returned shape");
          });
        }

        const stale = reruns.current.replace(origin, added);
        for (const layer of stale) {
          try {
            await client.mutate({
              mutation: DeleteLayerDocument,
              variables: { input: { id: layer } },
              refetchQueries: ["GetScene"],
            } as unknown as Parameters<MikroClient["mutate"]>[0]);
          } catch {
            // Already removed by hand: nothing to replace.
          }
        }
        if (stale.length > 0) toast.info("Replaced the previous run's result");
      });
    },
    [client, registry, scene],
  );

  return <SmartResultSink onResults={onResults}>{children}</SmartResultSink>;
};
