import { useEffect, useMemo } from "react";
import { workerPool } from "@/mikro-next/workers/pool";
import { assertWebGPUSupported } from "@/mikro-next/components/scene/platform/gpu/webgpuSupport";
import type { MikroClient } from "@/lib/zarr/store/types";
import { getGeneralAccess } from "./access";
import { useMikro } from "@/app/Arkitekt";
import { coldOpenTimeline } from "@/mikro-next/components/scene/platform/perf/coldOpenTimeline";

/**
 * Start the scene's setup work that does NOT depend on the scene.
 *
 * Opening an image is a strictly serial chain: `GetScene` → WebGPU adapter →
 * the general zarr grant → one `/zarr.json` per pyramid level → open arrays →
 * canvas → first chunk. The first three links are independent of each other and
 * of the scene's content, but today they run one after another because each sits
 * inside the `await` chain of the one before it.
 *
 * This hook starts all three the moment the route mounts, so they overlap the
 * `GetScene` round trip instead of queueing behind it. Nothing here changes what
 * the scope build does — it still awaits the same functions — it only changes
 * WHEN they start.
 *
 * ## Why this must be called above the query gate
 *
 * `asDetailQueryRoute` renders `<LoadingPage/>` until the query resolves, so a
 * hook called anywhere inside the page component cannot run during the round
 * trip it is meant to overlap. Callers must mount this OUTSIDE that gate.
 *
 * ## Why not at the module guard or app boot
 *
 * `Guard.Mikro` wraps every mikro route — folders, files, tables. Warming there
 * would mint a datalayer credential for users who never open a scene. Scoping it
 * to the scene route keeps the grant tied to an actual intent to view data.
 *
 * ## Why no kill switch
 *
 * The failure path is unchanged, structurally. `getGeneralAccess` collapses
 * concurrent callers onto one in-flight promise and clears that slot in a
 * `finally` regardless of outcome, so:
 *
 *   - a warm that SUCCEEDS is the cache the scope build then hits;
 *   - a warm that FAILS clears `inFlight` and leaves no poisoned state — the
 *     scope build re-mints and, if that fails too, surfaces the error through
 *     `phase: "error"` exactly as before.
 *
 * The `.catch()` below attaches to the *derived* promise, so it swallows only
 * this hook's unhandled rejection — the scope build still observes the original
 * rejection. Same for `assertWebGPUSupported`, whose memo (including its
 * rejection) is the same one `SceneProvider` awaits.
 */
export const useDatalayerWarmup = (client: MikroClient): void => {
  useEffect(() => {
    // Credentials: one mutation, cached app-lifetime per (client, kind).
    void getGeneralAccess(client).catch(() => {
      /* the scope build re-mints and owns the user-facing error */
    });

    // WebGPU adapter: memoized per session, so this only pays on the first
    // scene of a session — which is precisely the cold open being fixed.
    void assertWebGPUSupported().catch(() => {
      /* SceneProvider awaits the same memo and renders the failure */
    });

    // Zarr decode workers: module workers (zstd/blosc bundles) cost tens of ms
    // each to spawn and evaluate. Idempotent — only ever fills empty slots.
    // Whole pool, not a literal count: 8 left half of it cold on 16+ cores.
    workerPool.prewarm();
  }, [client]);
};

/**
 * Open a scene: start the cold-open timeline and warm the datalayer.
 *
 * The two belong together and must fire exactly once per scene open, which is
 * why they are one hook rather than two call sites. THREE pages mount a scene —
 * `ScenePage`, `ArrayDatasetPage` and `AnnotationPage` — and the first version
 * of this instrumentation was wired only into `ScenePage`. The consequence was
 * not merely a blind timeline: on the dominant route (the home page and the
 * standard side pane both link to `ArrayDatasetPage`) the warmup above never ran
 * at all, so the credential grant, WebGPU probe and worker prewarm stayed
 * serialized behind the scene query for exactly the users it was meant to help.
 *
 * Call it as early as the scene id is known. On `ScenePage` that is above the
 * route's query gate, so the warmup overlaps `GetScene` itself; on the other two
 * the id only exists after their own detail query resolves, so the timeline's
 * origin there is "we know which scene to open" rather than "the page mounted".
 *
 * Exactly ONE call per page — a second `begin()` would reset the timeline and
 * discard the stamps the first one collected.
 */
export const useSceneOpen = (sceneId: string | null | undefined): void => {
  const client = useMikro();

  // During render, not in an effect: the scene query fires in this same render
  // pass (or a child's), so an effect would start the clock after the thing it
  // is measuring. `useMemo` keyed on the id gives exactly one begin per scene.
  useMemo(() => coldOpenTimeline.begin(sceneId ?? null), [sceneId]);

  useDatalayerWarmup(client);
};
