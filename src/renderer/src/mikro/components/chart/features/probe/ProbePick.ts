import { createContext, useContext } from "react";
import { objectsOf, type RowId, type RowObject } from "@/mikro/lib/attributes/attributeTypes";
import type { RowProbeHop } from "./useRowProbe";

/**
 * Which member of a pinned row is picked: a cluster's member, chosen by its
 * chip or by its line in a plot. One pick per pin, shared by both, so each
 * highlights what the other chose; the mesh the Probe tab shows follows it.
 */
export type ProbePicked = { hop: number; id: RowId };

export type ProbePick = {
  picked: ProbePicked | null;
  /** Pick `id` of the rows `hop` returned; null lets go. */
  pick: (hop: number, id: RowId | null) => void;
};

export const ProbePickContext = createContext<ProbePick | null>(null);
ProbePickContext.displayName = "ProbePickContext";

export const useProbePick = (): ProbePick | null => useContext(ProbePickContext);

export const isPicked = (picked: ProbePicked | null, hop: number, id: RowId): boolean =>
  picked !== null && picked.hop === hop && String(picked.id) === String(id);

export const MESH_OBJECT = "@mikro/meshobject";

/**
 * The mesh the Probe tab shows: the picked member's, when it is a mesh; else
 * the pinned row's own, when the row is one (a table keyed by a mesh
 * collection). A cluster with nothing picked shows none.
 */
export const meshToShow = (picked: ProbePicked | null, hops: readonly RowProbeHop[]): RowObject | null => {
  if (picked) {
    const entry = hops.find((candidate) => candidate.hop.index === picked.hop);
    const object = entry ? objectsOf(entry.hop, [picked.id]).find((o) => o.identifier === MESH_OBJECT) : undefined;
    return object ?? null;
  }
  const landing = hops.find((candidate) => candidate.meta.index === 0);
  if (!landing) return null;
  return objectsOf(landing.hop, landing.state.ids ?? []).find((o) => o.identifier === MESH_OBJECT) ?? null;
};
