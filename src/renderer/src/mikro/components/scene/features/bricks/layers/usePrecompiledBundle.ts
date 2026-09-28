import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { useLatestRef } from "@/core/util/hooks/useLatestRef";

/**
 * Show a freshly built brick material only once its pipeline is compiled.
 *
 * A NodeMaterial is compiled lazily, inside the first `render()` that draws
 * it: WGSL generation plus a SYNCHRONOUS `device.createRenderPipeline` (three
 * uses the async variant only through `compileAsync`). For the raymarchers —
 * thousands of lines of WGSL — that is a visible hitch every time a layer
 * opens, a merge group changes membership, or a specialisation flips.
 *
 * So a new bundle goes through `renderer.compileAsync` on a probe mesh first,
 * and the component keeps drawing the PREVIOUS material meanwhile — but only
 * when that material belongs to the same pool structure: an old material over
 * a rebuilt pool would sample textures the pool has already disposed. Across
 * a pool change nothing draws for the few frames the compile takes.
 *
 * The probe compiles against the live scene (lights, clipping) and the
 * renderer's current target, which is what three's own pipeline cache keys
 * on; a draw into a differently-formatted target still reuses the compiled
 * shader modules, only its pipeline object is created on first use.
 *
 * This hook OWNS disposal of every bundle it is handed: one that is superseded
 * before it was ever shown, and the shown one when it is replaced or the
 * component unmounts. Disposal is deferred a microtask and cancelled when the
 * same bundle re-registers synchronously — StrictMode's dev double-invoke
 * would otherwise dispose a material that is still about to be used.
 */
export const usePrecompiledBundle = <T extends { material: THREE.Material }>(
  bundle: T | null,
  dispose: (bundle: T) => void,
  /** The pool structure the bundle was built for; `null` without a pool. */
  structureKey: string | null,
): T | null => {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const [shown, setShown] = useState<{ bundle: T; structureKey: string | null } | null>(null);
  // Layout-effect refs: updated before any passive cleanup below reads them.
  const shownRef = useLatestRef(shown);
  const disposeRef = useLatestRef(dispose);

  useEffect(() => {
    if (!bundle) {
      setShown(null);
      return;
    }
    pendingDispose.delete(bundle);
    let cancelled = false;
    const show = () => {
      if (cancelled) return;
      setShown({ bundle, structureKey });
      invalidate();
    };
    const compileAsync = (
      gl as unknown as {
        compileAsync?: (o: THREE.Object3D, c: THREE.Camera, s: THREE.Scene) => Promise<void>;
      }
    ).compileAsync;
    if (typeof compileAsync !== "function") {
      show();
    } else {
      const probe = new THREE.Mesh(PROBE_GEOMETRY, bundle.material);
      compileAsync.call(gl, probe, camera, scene).then(show, (error: unknown) => {
        // Never leave a layer blank over a compile hiccup: draw it, and let
        // the render path report whatever is really wrong.
        console.warn("[scene] material pre-compile failed; drawing it uncompiled", error);
        show();
      });
    }
    return () => {
      cancelled = true;
      // Never shown: nobody else will dispose it.
      if (shownRef.current?.bundle !== bundle) scheduleDispose(bundle, disposeRef.current);
    };
    // The camera and scene are only the compile context — a new camera must
    // not recompile a material that is already compiling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, gl]);

  useEffect(() => {
    if (!shown) return;
    pendingDispose.delete(shown.bundle);
    return () => scheduleDispose(shown.bundle, disposeRef.current);
  }, [shown]);

  if (!shown) return null;
  if (shown.structureKey !== structureKey) return null;
  return shown.bundle;
};

/** Any geometry with the brick meshes' vertex layout (position/normal/uv). */
const PROBE_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

const pendingDispose = new WeakSet<object>();

const scheduleDispose = <T extends object>(bundle: T, dispose: (bundle: T) => void): void => {
  pendingDispose.add(bundle);
  queueMicrotask(() => {
    if (pendingDispose.delete(bundle)) dispose(bundle);
  });
};
