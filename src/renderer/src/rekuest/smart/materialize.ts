import type { SmartContextProps } from "@/core/smart/extensions/types";

/**
 * The selection a row runs with: the menu's own, or — when the menu stands for
 * objects not made yet (`SmartContextProps.materialize`) — the ones made for
 * this run. Every run path awaits it before it builds arguments, so the
 * structures that only filtered the menu never reach a task.
 */
export const resolveRun = async <P extends Pick<SmartContextProps, "objects" | "partners" | "materialize">>(
  props: P,
): Promise<P> => (props.materialize ? { ...props, ...(await props.materialize()) } : props);

/** A failed `materialize`, as the row says it: the module's own words. */
export const materializeErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : "Could not prepare what this runs on.";
