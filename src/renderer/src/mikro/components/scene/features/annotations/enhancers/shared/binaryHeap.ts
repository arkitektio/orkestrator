/**
 * Minimal binary min-heap over (priority, node) pairs, backed by two typed
 * arrays rather than an array of objects — the search frontier is the hottest
 * allocation site in both the vector trace and the geodesic reference, and a
 * heap of `{priority, node}` objects churns one per push.
 *
 * It existed twice, byte-identical bar a factored-out `grow()` and two local
 * names: `traceSearch.NodeHeap` and `geodesicReference.MinHeap`, the latter's
 * docblock openly calling itself "`traceSearch.NodeHeap` restated". Both
 * consumers live under `enhancers/`, so this stays here rather than being
 * demoted to `platform/` — one feature is not yet a shared vocabulary.
 *
 * `pop()` answers -1 when empty; both callers rely on that rather than on an
 * `undefined` check.
 */
export class MinHeap {
  private priorities: Float64Array;
  private nodes: Int32Array;
  private length = 0;

  constructor(capacity: number) {
    this.priorities = new Float64Array(Math.max(16, capacity));
    this.nodes = new Int32Array(Math.max(16, capacity));
  }

  get size(): number {
    return this.length;
  }

  private grow(): void {
    const priorities = new Float64Array(this.priorities.length * 2);
    priorities.set(this.priorities);
    this.priorities = priorities;
    const nodes = new Int32Array(this.nodes.length * 2);
    nodes.set(this.nodes);
    this.nodes = nodes;
  }

  push(priority: number, node: number): void {
    if (this.length === this.nodes.length) this.grow();
    let child = this.length;
    this.length += 1;
    this.priorities[child] = priority;
    this.nodes[child] = node;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (this.priorities[parent] <= this.priorities[child]) break;
      this.swap(parent, child);
      child = parent;
    }
  }

  /** Lowest-priority node, or -1 when empty. */
  pop(): number {
    if (this.length === 0) return -1;
    const top = this.nodes[0];
    this.length -= 1;
    if (this.length > 0) {
      this.priorities[0] = this.priorities[this.length];
      this.nodes[0] = this.nodes[this.length];
      let parent = 0;
      for (;;) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;
        if (left < this.length && this.priorities[left] < this.priorities[smallest]) {
          smallest = left;
        }
        if (right < this.length && this.priorities[right] < this.priorities[smallest]) {
          smallest = right;
        }
        if (smallest === parent) break;
        this.swap(parent, smallest);
        parent = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const priority = this.priorities[a];
    this.priorities[a] = this.priorities[b];
    this.priorities[b] = priority;
    const node = this.nodes[a];
    this.nodes[a] = this.nodes[b];
    this.nodes[b] = node;
  }
}
