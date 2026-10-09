import { LovekitCall } from "@/core/linkers";

/** The `?join=1` the call page reads once, to connect as soon as it opens. */
export const JOIN_PARAM = "join";

/** The call page; with `join`, connecting on arrival. */
export const callLink = (id: string, options: { join?: boolean } = {}) =>
  `${LovekitCall.linkBuilder(id)}${options.join ? `?${JOIN_PARAM}=1` : ""}`;

/**
 * What a call about these structures is called when nobody named it:
 * "Call about Image" for one, "Call about 3 objects" for several.
 */
export const callTitle = (structures: readonly { identifier: string; label?: string }[]): string => {
  if (structures.length === 1) {
    const [only] = structures;
    const name = only.label ?? only.identifier.split("/").pop() ?? only.identifier;
    return `Call about ${name}`;
  }
  return `Call about ${structures.length} objects`;
};
