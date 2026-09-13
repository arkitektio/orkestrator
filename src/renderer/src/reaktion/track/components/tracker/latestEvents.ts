import { RunEventFragment } from "@/reaktion/api/graphql";

/**
 * Collapse a run's event list to the latest event per `source`, preserving
 * the order in which sources were first seen.
 *
 * O(n) with a Map. The previous reduce-with-find was O(n²) and ran on every
 * incoming event.
 *
 * @param maxT when given, events with `t > maxT` are ignored.
 */
export const latestEventPerSource = (
  events: (RunEventFragment | null | undefined)[] | null | undefined,
  maxT?: number,
): { events: RunEventFragment[]; highestT: number } => {
  const bySource = new Map<string, RunEventFragment>();
  let highestT = 0;

  for (const event of events || []) {
    if (!event) continue;
    if (maxT !== undefined && event.t > maxT) continue;
    const previous = bySource.get(event.source);
    if (previous && previous.t > event.t) continue;
    if (previous) highestT = Math.max(highestT, event.t);
    // `set` on an existing key keeps its insertion position.
    bySource.set(event.source, event);
  }

  return { events: Array.from(bySource.values()), highestT };
};
