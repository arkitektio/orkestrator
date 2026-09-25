import { useTrackRiver } from "../context";

export const useLatestNodeEvent = (node: string) =>
  useTrackRiver().runState?.latestBySource?.get(node);
