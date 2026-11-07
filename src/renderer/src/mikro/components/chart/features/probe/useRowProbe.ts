import { useEffect, useState } from "react";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import {
  hopMetaOf,
  type AttributeHopLike,
  type HopMeta,
  type PlanRowsState,
  type RowPlanLike,
} from "@/mikro/lib/attributes/attributeTypes";
import type { PinnedRow } from "../../platform/stores/chartStore";

/** How many of a MANY hop's rows (a cluster's members) are read and shown before "Show all". */
export const MEMBERS_SHOWN = 50;

export type RowProbeHop = { hop: AttributeHopLike; meta: HopMeta; state: PlanRowsState };

export type RowProbeState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; error: unknown }
  /** `plan` null: the table's own row is not executable (nothing to show). */
  | { phase: "ready"; plan: RowPlanLike | null; hops: readonly RowProbeHop[] };

/**
 * What a pinned row reaches: the table's row plan (`rowPlan`, fetched once per
 * table by the attribute service), run from the row's id — the row itself, a
 * cluster's members, the same row in a derived table — hop by hop, as the
 * scene runs an attribute plan from a voxel.
 *
 * Latest wins: a new pin (or "Show all") supersedes a run still in flight.
 * Hops settle as they go, so the blocks fill in rather than appear at once.
 */
export const useRowProbe = (pin: PinnedRow | null, all: boolean): RowProbeState => {
  const service = useAttributeServiceOrNull();
  const [state, setState] = useState<RowProbeState>({ phase: "idle" });
  const table = pin?.table ?? null;
  const id = pin?.id ?? null;

  useEffect(() => {
    if (!service || table === null || id === null) {
      setState({ phase: "idle" });
      return;
    }
    let stale = false;
    setState({ phase: "loading" });
    (async () => {
      const plan = await service.rowPlanFor(table);
      if (stale) return;
      if (!plan) {
        setState({ phase: "ready", plan: null, hops: [] });
        return;
      }
      const settled = new Map<string, PlanRowsState>();
      const publish = () =>
        setState({
          phase: "ready",
          plan,
          hops: plan.hops.flatMap((hop) => {
            const meta = hopMetaOf(plan, hop);
            const hopState = settled.get(meta.hopKey);
            return hopState ? [{ hop, meta, state: hopState }] : [];
          }),
        });
      await service.executeRowPlan(plan, id, {
        isStale: () => stale,
        manyLimit: all ? null : MEMBERS_SHOWN,
        onHop: (key, hopState) => {
          if (stale) return;
          settled.set(key, hopState);
          publish();
        },
      });
    })().catch((error: unknown) => {
      if (!stale) setState({ phase: "error", error });
    });
    return () => {
      stale = true;
    };
  }, [service, table, id, all]);

  return state;
};
