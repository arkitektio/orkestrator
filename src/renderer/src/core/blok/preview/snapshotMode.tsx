import * as React from "react";

/**
 * Whether a blok is being drawn for its preview, and how a part of it says
 * whether it is ready to be drawn.
 *
 * A preview is taken once the drawing has settled. A mutation observer cannot
 * see what a component is still waiting for (a model loading, an image
 * resolving, a canvas not yet painted), so the component says so itself with
 * `useBlokReady`:
 *
 * - `pending` holds the capture back until it turns `ready`;
 * - `ready` lets it go (and is what a component that never reports is);
 * - `failed` means the drawing is not what the blok looks like (a model that
 *   cannot load, an asset that is not there): nothing is kept, and the card
 *   keeps its fallback.
 *
 * Outside a preview drawing it does nothing.
 */
export type BlokReadiness = "pending" | "ready" | "failed";

export type BlokReadySignal = {
  /** Holds the capture back; the returned function lets it go. */
  hold: () => () => void;
  /** Gives the drawing up. */
  fail: (reason: string) => void;
};

const BlokReadyContext = React.createContext<BlokReadySignal | null>(null);

export const BlokReadyProvider = BlokReadyContext.Provider;

/** True inside a preview drawing: animations off, canvases keep what they drew. */
export const useBlokSnapshotMode = (): boolean => React.useContext(BlokReadyContext) !== null;

/** Reports whether this part of the blok is ready to be drawn into its preview. */
export const useBlokReady = (readiness: BlokReadiness, reason?: string): void => {
  const signal = React.useContext(BlokReadyContext);
  React.useEffect(() => {
    if (!signal) return;
    if (readiness === "pending") return signal.hold();
    if (readiness === "failed") signal.fail(reason ?? "A part of this blok could not be drawn.");
    return undefined;
  }, [signal, readiness, reason]);
};
