import * as React from "react";
import * as THREE from "three";
import { useSceneNotice, useSceneStoreApi } from "@arkitektio/bsx/renderer/bloks/scene/context";
import { stageMatrix, strayReferences, type MountFrame } from "./frame";

/**
 * The references the mounts of one stage are in, so a stage holding two spaces
 * can say it does: each frame sits at the origin, and they line up only by chance.
 */
type References = {
  set: (id: string, reference: string | null) => void;
  drop: (id: string) => void;
  subscribe: (listener: () => void) => () => void;
  stray: () => string[];
};

const createReferences = (): References => {
  const byMount = new Map<string, string | null>();
  const listeners = new Set<() => void>();
  let stray: string[] = [];
  const changed = () => {
    stray = strayReferences([...byMount.values()]);
    listeners.forEach((listener) => listener());
  };
  return {
    set: (id, reference) => {
      if (byMount.get(id) === reference) return;
      byMount.set(id, reference);
      changed();
    },
    drop: (id) => {
      if (byMount.delete(id)) changed();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    stray: () => stray,
  };
};

const MountReferencesContext = React.createContext<References | null>(null);

const NONE: string[] = [];
const noSubscription = () => () => {};
const noStray = () => NONE;

/** The group a mount's content stands in: what a scene publishes its camera relative to. */
const MountObjectContext = React.createContext<THREE.Object3D | null>(null);

export const useMountObject = (): THREE.Object3D | null => React.useContext(MountObjectContext);

/** What a mount's content says once it has something to frame (a quad with a size). */
const MountReadyContext = React.createContext<(ready: boolean) => void>(() => {});

/** Call with true once the mount's content has a size: the stage frames it then, not while it is empty. */
export const useMountReady = (ready: boolean) => {
  const markReady = React.useContext(MountReadyContext);
  React.useEffect(() => {
    markReady(ready);
    return () => markReady(false);
  }, [markReady, ready]);
};

/** Given by a stage to the mounts inside it. */
export const MountReferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const references = React.useMemo(createReferences, []);
  return <MountReferencesContext.Provider value={references}>{children}</MountReferencesContext.Provider>;
};

const useStrayReferenceNotice = (id: string, reference: string | null) => {
  const references = React.useContext(MountReferencesContext);
  React.useEffect(() => {
    if (!references) return;
    references.set(id, reference);
    return () => references.drop(id);
  }, [references, id, reference]);
  const stray = React.useSyncExternalStore(references?.subscribe ?? noSubscription, references?.stray ?? noStray);
  // Said once, by the first mount of the first reference.
  const speaks = stray.length > 0 && reference === stray[0];
  useSceneNotice(
    speaks ? "Mounts in different spaces" : null,
    speaks ? `${stray.join(", ")} each sit at the origin; place one with a Transform.` : undefined,
  );
};

/**
 * A mount in a stage: its children are in the mount's own space (its length
 * unit, z up), placed by `frame`, its mikro-style `transform` and `output` (`stageMatrix`). Once its
 * content says it is ready (`useMountReady`) the group is registered as placed, so
 * the stage frames it like a model; an empty one would be framed as a speck.
 */
export const MountGroup = ({
  id,
  frame,
  transform,
  output,
  children,
}: {
  id: string;
  frame: MountFrame;
  transform?: unknown;
  output?: unknown;
  children: React.ReactNode;
}) => {
  const store = useSceneStoreApi();
  const placementKey = JSON.stringify([transform ?? null, output ?? null]);
  const frameKey = JSON.stringify(frame);
  // Keyed by value: a state rebuilt around the same numbers moves nothing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolved = React.useMemo(() => stageMatrix(frame, transform, output), [frameKey, placementKey]);
  useSceneNotice(resolved.error ? "A mount could not be placed" : null, resolved.error ?? undefined);
  useStrayReferenceNotice(id, frame.reference ?? null);

  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  const [ready, setReady] = React.useState(false);
  React.useLayoutEffect(() => {
    if (!group) return;
    group.matrix.set(...(resolved.rows.flat() as Parameters<THREE.Matrix4["set"]>));
    group.matrixWorldNeedsUpdate = true;
  }, [group, resolved]);

  React.useEffect(() => {
    if (!group || !ready) return;
    const key = `mount:${id}`;
    store.getState().setPlaced(key, group);
    return () => store.getState().setPlaced(key, null);
  }, [group, ready, id, store]);

  return (
    <group ref={setGroup} matrixAutoUpdate={false}>
      <MountObjectContext.Provider value={group}>
        <MountReadyContext.Provider value={setReady}>{children}</MountReadyContext.Provider>
      </MountObjectContext.Provider>
    </group>
  );
};
