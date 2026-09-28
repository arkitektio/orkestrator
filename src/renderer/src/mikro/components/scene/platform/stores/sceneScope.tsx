import { SceneFragment } from "@/mikro/api/graphql";
import {
  Fragment,
  createContext,
  useContext,
  type ReactNode,
} from "react";

/**
 * Where the scene's store scope stands, and the gate that reads it.
 *
 * Lives in `platform/` rather than beside `SceneProvider` because gating on
 * scope readiness is not a shell concern: any feature that reads a scene store
 * and can render before the scope exists needs `SceneGuard`, and a feature may
 * not import from `shell/`. The provider still OWNS the value — it builds the
 * scope and publishes the status; this module only declares the contract.
 */

/** Carries the scene fragment, so consumers need no separate scene prop. */
export type SceneScopeStatus =
  | { phase: "no-scene"; scene: null; error: null }
  | { phase: "initializing"; scene: SceneFragment; error: null }
  | { phase: "error"; scene: SceneFragment; error: Error }
  | { phase: "ready"; scene: SceneFragment; error: null };

export const SceneScopeStatusContext = createContext<SceneScopeStatus | null>(null);
SceneScopeStatusContext.displayName = "SceneScopeStatusContext";

export const useSceneScopeStatus = (): SceneScopeStatus => {
  const status = useContext(SceneScopeStatusContext);
  if (!status) {
    throw new Error("Missing SceneProvider");
  }
  return status;
};

/**
 * Renders children only when the scene scope is ready — the ONLY sanctioned way
 * to gate store consumers. The scoped store hooks keep throwing on a missing
 * provider (softening them would hide real composition bugs), so anything that
 * reads a scene store and can render while the scope is absent must sit under a
 * guard: the viewport does this for the canvas tree, and sidebar tabs do it for
 * themselves.
 *
 * Children are keyed on the scene id so a scene switch can never feed new
 * stores into components primed for the old scene — they remount instead
 * (the "remount, don't repopulate" invariant).
 */
export const SceneGuard = (props: {
  fallback?: ReactNode;
  children: ReactNode;
}) => {
  const status = useSceneScopeStatus();
  if (status.phase !== "ready") return <>{props.fallback ?? null}</>;
  return <Fragment key={status.scene.id}>{props.children}</Fragment>;
};
