import { RunEventFragment } from "../api/graphql";

export type RunState = {
  /** Latest event per source, in first-seen order. */
  events?: RunEventFragment[];
  /** Same events keyed by `source` for O(1) per-node lookups. */
  latestBySource?: ReadonlyMap<string, RunEventFragment>;
  t: number;
};
