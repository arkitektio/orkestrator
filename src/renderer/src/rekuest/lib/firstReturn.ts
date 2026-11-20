import { structure } from "@/core/smart/structure";
import type { Structure } from "@/core/types";
import { PortKind } from "../api/graphql";

type ReturnPort = { key: string; identifier?: string | null; kind: PortKind };

/**
 * What a finished run's card links to: the first structure it returned, by
 * the action's return ports in order and the run's `latestReturns` by key.
 * Null when the action returns no structure, or the run returned none (a
 * structure travels as its id: a string, or a number).
 */
export const firstReturnedStructure = (
  ports: readonly ReturnPort[],
  returns: unknown,
): Structure | null => {
  if (!returns || typeof returns !== "object") return null;
  for (const port of ports) {
    if (port.kind !== PortKind.Structure || !port.identifier) continue;
    const value = (returns as Record<string, unknown>)[port.key];
    if (typeof value === "string" || typeof value === "number") {
      return structure(port.identifier, String(value));
    }
  }
  return null;
};
