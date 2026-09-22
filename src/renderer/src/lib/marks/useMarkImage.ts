/**
 * useMarkImage.ts — a generated app mark as an `<img>` source.
 *
 * Sync on a cache hit, scheduled on a miss. The synchronous hit is the point of
 * the module-level cache: going grid → detail → back repaints the icons with no
 * flash, where a render-on-mount hook would re-encode every one of them.
 */
import { useEffect, useState } from "react";
import {
  cacheGet,
  markKey,
  markPixels,
  markSimple,
  requestMark,
  type MarkRequest,
} from "./markCache";

export interface UseMarkImageInput {
  name: string;
  identifier?: string;
  /** base64 float16 — kabinet does not expose one yet; see `markText`. */
  embedding?: string | null;
  /** The icon's CSS size in px; drives both resolution and level of detail. */
  size: number;
}

export interface UseMarkImageResult {
  src: string | null;
  pending: boolean;
}

/** Pass `null` to skip the work entirely, e.g. when a real logo is showing. */
export function useMarkImage(input: UseMarkImageInput | null): UseMarkImageResult {
  const request: MarkRequest | null = input
    ? {
        name: input.name,
        identifier: input.identifier,
        embedding: input.embedding,
        px: markPixels(input.size),
        simple: markSimple(input.size),
      }
    : null;
  const key = request ? markKey(request) : null;

  const [src, setSrc] = useState<string | null>(() => (key ? (cacheGet(key) ?? null) : null));

  useEffect(() => {
    if (!key || !request) {
      setSrc(null);
      return;
    }
    const hit = cacheGet(key);
    if (hit !== undefined) {
      setSrc(hit);
      return;
    }
    setSrc(null);
    let live = true;
    const release = requestMark(request, (result) => {
      if (live) setSrc(result);
    });
    return () => {
      live = false;
      release();
    };
    // `key` is the full identity of the request; re-running on the object
    // itself would fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { src, pending: key !== null && src === null };
}
