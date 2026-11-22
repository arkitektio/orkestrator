import { RunStatus } from "@/fluss/api/graphql";

export type RunEventLike = {
  create?: { id: string; status: RunStatus } | null;
  update?: { id: string; status: RunStatus } | null;
  delete?: string | null;
};

/** What one run event does to the "running now" list: nothing, drop a row, or re-read it. */
export const activeRunChange = (
  listed: readonly { id: string }[],
  event: RunEventLike | undefined | null,
): { kind: "none" } | { kind: "remove"; id: string } | { kind: "refetch" } => {
  if (!event) return { kind: "none" };
  const isListed = (id: string) => listed.some((run) => run.id === id);
  if (event.delete) return isListed(event.delete) ? { kind: "remove", id: event.delete } : { kind: "none" };
  const run = event.create ?? event.update;
  if (!run) return { kind: "none" };
  if (run.status === RunStatus.Running) return isListed(run.id) ? { kind: "none" } : { kind: "refetch" };
  return isListed(run.id) ? { kind: "remove", id: run.id } : { kind: "none" };
};
