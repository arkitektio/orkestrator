import { useNodeRunEvent } from "../context";

export const useLatestNodeEvent = (node: string) => useNodeRunEvent(node);
