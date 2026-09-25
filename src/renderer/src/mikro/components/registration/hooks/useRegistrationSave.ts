import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  CreatableTransformKind,
  PlacementValidity,
  useCreateTransformationMutation,
  useDeleteTransformationMutation,
  useGetRegistrationEdgeQuery,
  useUpdateTransformationMutation,
} from "../../../api/graphql";
import { spatialAxisTriple } from "@/core/lib/scene/coords/transformGraph";
import { useSceneWorld } from "../../scene/sceneHost";
import { describeSession } from "../math/constraints";
import { classifyPlacement, type RegistrationEdgeLike } from "../math/eligibility";
import { planSave, type SavePlan } from "../math/saveMath";
import { fitLandmarks } from "../math/solvers";
import { useRegistration, useRegistrationApi } from "../store/context";
import { completePairs } from "../store/registrationStore";

// The same set the Register form refetches, for the same reason: an edge write
// changes both systems' neighbourhoods and moves anything drawn in a scene
// whose world is reachable through it — `GetScene` re-resolves every layer's
// `pathToWorld` / `asAffine` server-side, and THAT is what re-places the layer.
const REFETCH = {
  refetchQueries: ["GetScene", "GetCoordinateSystem", "GetCoordinateGraph"],
  awaitRefetchQueries: true,
};

/** How long the scene gets to show the saved edge before we stop waiting. */
const SAVE_WATCHDOG_MS = 8000;

const axisOrder = (axes: readonly { name: string; order: number }[] | null | undefined): string[] =>
  [...(axes ?? [])].sort((a, b) => a.order - b.order).map((axis) => axis.name);

/**
 * The edge under the session, what saving would do to it, and the save itself.
 *
 * The scene fragment carries enough of the edge to START a session; whether the
 * edge may actually be rewritten (`selector`, `valueRelation`) and the axis
 * lists a save needs arrive with `GetRegistrationEdge`. Until it resolves the
 * plan is null and saving is unavailable — the session can still be previewed.
 */
export const useRegistrationSave = () => {
  const api = useRegistrationApi();
  const world = useSceneWorld();
  const session = useRegistration((state) => state.session);
  // The pre-drag delta while a gesture is in flight: stable, so the plan (and
  // this hook's consumers) do not recompute at pointer rate.
  const delta = useRegistration((state) => state.gestureStart ?? state.delta);
  const constraint = useRegistration((state) => state.constraint);
  const landmarks = useRegistration((state) => state.landmarks);

  const { data, loading, error } = useGetRegistrationEdgeQuery({
    variables: { id: session?.edgeId ?? "" },
    skip: !session,
    // The edge is exactly what this session rewrites; never plan against a
    // cached copy from before somebody else's refinement.
    fetchPolicy: "cache-and-network",
  });

  const edge = session && data?.transformation.id === session.edgeId ? data.transformation : null;

  const verdict = useMemo(() => {
    if (!edge || !session || !world.id) return null;
    return classifyPlacement({
      pathToWorld: [{ inverted: session.inverted, transformation: edge as unknown as RegistrationEdgeLike }],
      asAffine: {},
      worldId: world.id,
    });
  }, [edge, session, world.id]);

  const name = useMemo(() => {
    const pairs = completePairs(landmarks);
    const fit = pairs.length ? fitLandmarks(pairs, constraint) : null;
    return describeSession({
      constraint,
      landmarkPairs: pairs.length || undefined,
      rms: fit?.ok ? fit.rms : null,
      unit: world.unit === "px" ? null : world.unit,
    });
  }, [landmarks, constraint, world.unit]);

  const plan: SavePlan | null = useMemo(() => {
    if (!edge || !session) return null;
    if (verdict?.status === "refused") return { kind: "refuse", reason: verdict.reason };
    const dataSide = session.inverted ? edge.output : edge.input;
    return planSave({
      step: { inverted: session.inverted, transformation: edge as unknown as RegistrationEdgeLike },
      delta,
      worldSpatial: world.spatialTriple,
      dataSpatial: spatialAxisTriple(dataSide),
      inputOrder: axisOrder(edge.input?.axes),
      outputOrder: axisOrder(edge.output?.axes),
      name,
    });
  }, [edge, session, verdict, delta, world.spatialTriple, name]);

  const [update] = useUpdateTransformationMutation();
  const [create, { client }] = useCreateTransformationMutation();
  const [remove] = useDeleteTransformationMutation();
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    if (!plan || plan.kind === "noop" || plan.kind === "refuse") return;
    const store = api.getState();
    if (store.session?.phase !== "editing") return;
    store.markSaving();

    let created = false;
    try {
      if (plan.kind === "update") {
        await update({
          variables: { input: { ...plan.variables, validity: PlacementValidity.Manual } },
          ...REFETCH,
        });
      } else {
        // Create FIRST: a transient rival edge is legal, a transient gap would
        // un-place the layer. One refetch, after both, so the scene never
        // resolves the path while the two edges coexist.
        await create({
          variables: {
            input: {
              ...plan.create,
              validity: PlacementValidity.Manual,
              transform: { ...plan.create.transform, kind: CreatableTransformKind.ByDimension },
            },
          },
        });
        created = true;
        await remove({ variables: { input: { id: plan.deleteId } }, ...REFETCH });
      }
      toast.success("Registration saved");

      // The session leaves `saving` when the SCENE shows the new edge state
      // (`SessionWatcher` → `rebase`). If it never does, do not sit there
      // forever holding a preview that may no longer match the server.
      if (watchdog.current) clearTimeout(watchdog.current);
      watchdog.current = setTimeout(() => {
        if (api.getState().session?.phase !== "saving") return;
        toast.warning("Saved, but the scene did not report the new placement. Reopen the scene to see it.");
        api.getState().end();
      }, SAVE_WATCHDOG_MS);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      toast.error(
        created
          ? `The new registration was created, but the old one could not be removed: ${message}. Both now exist — delete the older edge from the coordinate system's page.`
          : `Could not save the registration: ${message}`,
      );
      if (created) {
        // The graph changed under the session (two rival edges). Whatever the
        // server now resolves, the draft was computed against a state that is
        // gone: drop it and show the scene as the server sees it.
        api.getState().end();
        void client.refetchQueries({ include: REFETCH.refetchQueries });
      } else {
        api.getState().markEditing();
      }
    }
  }, [api, plan, update, create, remove, client]);

  return { edge, loading, error, verdict, plan, save };
};
