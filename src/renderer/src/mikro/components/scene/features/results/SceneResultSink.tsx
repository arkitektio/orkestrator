import { useCallback, useRef, type ReactNode } from "react";

import { reportError, toast } from "@/core/notify";
import { SmartResultSink } from "@/core/smart/extensions/results";
import { uniqueStructures } from "@/core/smart/structure";
import type { Structure } from "@/core/types";
import { useMikro } from "@/mikro/api/funcs";
import { LAYER_KIND_INFO } from "@/mikro/forms/addLayer/engine";
import { stageLens, type StageOutcome } from "@/mikro/forms/addLayer/stageLens";
import { LENS_KINDS } from "@/mikro/lenses";
import { useLensRegistry } from "@/mikro/lib/lenses/useLensRegistry";

import { useSceneStore } from "../../platform/stores/sceneStore";

/** What the scene can draw of a returned lens: an array lens, through Add Layer's engine. */
const ARRAY_LENS = LENS_KINDS.ArrayLens.identifier;

/** What the scene says about one returned lens. */
export const stageMessage = (outcome: StageOutcome): { kind: "success" | "info"; text: string } =>
  outcome.status === "added"
    ? { kind: "success", text: `Added ${outcome.label} as ${LAYER_KIND_INFO[outcome.kind].title.toLowerCase()} layer` }
    : outcome.status === "present"
      ? { kind: "info", text: `${outcome.label} is already in this scene` }
      : { kind: "info", text: "The result was made, but cannot be placed in this scene" };

/**
 * Every menu of the scene itself — the viewport (a shape's card, the
 * right-click menu) and its sidebar tabs (the layer rows) — hands what its
 * runs return here, never the page around it: a page that hosts the scene's
 * stores (`Scene.Provider` around a ModelPage) runs its header's actions
 * outside this. Mounted under `SceneGuard`, so the scene's stores exist.
 *
 * What lands here
 * (`SmartResultSink`): an array lens an action made — a crop, a segmentation's
 * lens — is added to the scene as a layer, the way Add Layer would add it
 * (`stageLens`). One lens at a time, in the order the runs finish, so a second
 * channel takes the next colour after the first.
 */
export const SceneResultSink = ({ children }: { children?: ReactNode }) => {
  const scene = useSceneStore((s) => s.id);
  const client = useMikro();
  const registry = useLensRegistry();
  const queue = useRef<Promise<void>>(Promise.resolve());

  const onResults = useCallback(
    (results: Structure[]) => {
      if (!scene) return;
      const lenses = uniqueStructures(results.filter((result) => result.identifier === ARRAY_LENS));
      for (const lens of lenses) {
        queue.current = queue.current.then(async () => {
          try {
            const message = stageMessage(await stageLens(client, registry, { scene, lens: lens.id }));
            toast[message.kind](message.text);
          } catch (error) {
            reportError(error, "Couldn't add the result as a layer");
          }
        });
      }
    },
    [client, registry, scene],
  );

  return <SmartResultSink onResults={onResults}>{children}</SmartResultSink>;
};
