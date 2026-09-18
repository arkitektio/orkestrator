import { evictAcross, type Residency } from "./traceResidency";
import type { TileKey } from "./tileAddress";

/**
 * ONE decoded-bytes budget for every trace layer of a scope — mikro's single
 * brick budget, over time.
 *
 * Each `TraceTileDriver` registers its residency (a getter: a re-placed layer
 * replaces it) and what its current plan protects; after a tile lands it asks
 * the budget to `enforce`, which evicts across ALL members, furthest from the
 * focus first. Per-layer budgets let four traces hold four budgets' worth.
 */
export const DEFAULT_SCOPE_TRACE_BYTES = 384 * 1024 * 1024;

type Member = { residency: () => Residency; protectedKeys: () => ReadonlySet<TileKey> };

export class TraceMemoryBudget {
  private readonly members = new Map<string, Member>();

  constructor(readonly budgetBytes = DEFAULT_SCOPE_TRACE_BYTES) {}

  register(id: string, member: Member): () => void {
    this.members.set(id, member);
    return () => {
      if (this.members.get(id) === member) this.members.delete(id);
    };
  }

  /** Bytes held by every member. */
  get residentBytes(): number {
    let total = 0;
    for (const member of this.members.values()) total += member.residency().bytes;
    return total;
  }

  /** Evict across members until under budget; returns the bytes freed. */
  enforce(focus: number): number {
    return evictAcross(
      [...this.members.values()].map((m) => ({ residency: m.residency(), protectedKeys: m.protectedKeys() })),
      this.budgetBytes,
      focus,
    );
  }
}
