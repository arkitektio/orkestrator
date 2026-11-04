import { useCallback, useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon, LoaderIcon, PinIcon, XIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";

import { useOptionalSceneFloatStoreApi, useSceneFloatStore } from "../../platform/float/floatStore";
import { useStagedLayersStore, type StagedLayer } from "../../platform/float/stagedLayerStore";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useStaging } from "./useStaging";

/**
 * A float's side of staging: what it staged, and the close that asks first.
 *
 * While the float owns staged layers it HOLDS the scene (`floatStore.hold`):
 * a click that would replace or close it is deferred, and so is the float's
 * own close (×, Escape, a press outside). Either one shows the bar — "Keep N
 * layers in the scene?" — and only Keep or Discard completes it; Cancel keeps
 * the float and drops the deferred click.
 *
 * An unmount nobody asked for (the shape scrolled off the slab) discards
 * nothing: the hold is released and the layers stay staged, listed in the
 * layer panel's "Staged" group, and back in this float when it reopens.
 */
export const useFloatStaging = (owner: string, onClose: () => void) => {
  const entries = useStagedLayersStore(useShallow((state) => state.entries.filter((entry) => entry.owner === owner)));
  const floatApi = useOptionalSceneFloatStoreApi();
  const switchPending = useSceneFloatStore((state) => state.hold === owner && state.pendingSwitch !== null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const { keep, discard } = useStaging();
  const holding = entries.length > 0;

  useEffect(() => {
    if (!floatApi) return;
    if (holding) floatApi.getState().setHold(owner);
    else floatApi.getState().releaseHold(owner);
  }, [floatApi, holding, owner]);
  useEffect(() => () => floatApi?.getState().releaseHold(owner), [floatApi, owner]);

  /** Close, or ask first while it holds staged layers. */
  const requestClose = useCallback(() => {
    if (holding) setAsking(true);
    else onClose();
  }, [holding, onClose]);

  /** Keep or discard everything, then finish what asked: a deferred click, or the close. */
  const settle = useCallback(
    async (answer: "keep" | "discard") => {
      const pending = floatApi?.getState().takePending() ?? null;
      setError(null);
      setBusy(true);
      try {
        const keys = entries.map((entry) => entry.key);
        if (answer === "keep") await keep(keys);
        else discard(keys);
      } catch (reason) {
        setError(reason);
        setBusy(false);
        return;
      }
      setBusy(false);
      setAsking(false);
      if (pending) pending();
      else onClose();
    },
    [discard, entries, floatApi, keep, onClose],
  );

  const cancel = useCallback(() => {
    floatApi?.getState().takePending();
    setAsking(false);
  }, [floatApi]);

  return {
    entries,
    holding,
    requestClose,
    asked: holding && (asking || switchPending),
    settle,
    cancel,
    busy,
    error,
    setError,
  };
};

export type FloatStaging = ReturnType<typeof useFloatStaging>;

/**
 * The float's footer: each staged layer (show/hide, keep, discard), and the
 * keep-or-discard bar when a close or a switch asked.
 */
export const FloatStagingFooter = ({ staging }: { staging: FloatStaging }) => {
  const { keep, discard } = useStaging();
  if (!staging.holding) return null;
  const count = staging.entries.length;
  const noun = count === 1 ? "layer" : "layers";

  const keepOne = (key: string) => {
    staging.setError(null);
    keep([key]).catch(staging.setError);
  };

  return (
    <div className="flex flex-col gap-1 border-t border-border/60 px-2.5 pb-2 pt-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Staged in the scene</span>
        <span className="text-muted-foreground">Not saved</span>
      </div>
      <ul className="flex max-h-32 flex-col gap-0.5 overflow-y-auto">
        {staging.entries.map((entry) => (
          <StagedRow key={entry.key} entry={entry} onKeep={() => keepOne(entry.key)} onDiscard={() => discard([entry.key])} />
        ))}
      </ul>
      {staging.asked ? (
        <div className="mt-1 flex flex-col gap-1.5 rounded-md bg-muted/60 p-2" role="alertdialog" aria-label="Keep staged layers">
          <span>{`Keep ${count} ${noun} in the scene?`}</span>
          <div className="flex items-center gap-1.5">
            <Button size="xs" disabled={staging.busy} onClick={() => void staging.settle("keep")}>
              {staging.busy && <LoaderIcon className="mr-1 h-3 w-3 animate-spin" />}
              Keep
            </Button>
            <Button size="xs" variant="outline" disabled={staging.busy} onClick={() => void staging.settle("discard")}>
              Discard
            </Button>
            <Button size="xs" variant="ghost" disabled={staging.busy} onClick={staging.cancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              staging.setError(null);
              keep(staging.entries.map((entry) => entry.key)).catch(staging.setError);
            }}
          >
            Keep all
          </Button>
          <Button size="xs" variant="ghost" onClick={() => discard(staging.entries.map((entry) => entry.key))}>
            Discard all
          </Button>
        </div>
      )}
      <ErrorNote error={staging.error} />
    </div>
  );
};

/** One staged layer: its name, whether it is drawn, keep, discard. */
export const StagedRow = ({
  entry,
  onKeep,
  onDiscard,
}: {
  entry: StagedLayer;
  onKeep: () => void;
  onDiscard: () => void;
}) => {
  const [visible, setVisible] = useStagedVisibility(entry.key);
  return (
    <li className="flex min-w-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={visible ? "Hide" : "Show"}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeIcon /> : <EyeOffIcon />}
      </Button>
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Keep in the scene"
        title="Keep in the scene"
        disabled={entry.keeping}
        onClick={onKeep}
      >
        {entry.keeping ? <LoaderIcon className="animate-spin" /> : <PinIcon />}
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Discard" title="Discard" disabled={entry.keeping} onClick={onDiscard}>
        <XIcon />
      </Button>
    </li>
  );
};

/**
 * A staged layer's session visibility, where the scene keeps it: on the
 * normalized state for a lens-backed layer, on the fragment for the rest. A
 * Keep carries it into the create (`useStaging.keep`).
 */
export const useStagedVisibility = (key: string): [boolean, (visible: boolean) => void] => {
  const sceneApi = useSceneStoreApi();
  const visible = useSceneStore((state) => {
    const layer = state.layers.find((candidate) => candidate.id === key) ?? state.sceneLayers.find((candidate) => candidate.id === key);
    return layer?.visible !== false;
  });
  const setVisible = useCallback(
    (next: boolean) => {
      const state = sceneApi.getState();
      const brick = state.layers.find((candidate) => candidate.id === key);
      if (brick) state.updateLayer({ ...brick, visible: next });
      state.patchSceneLayer(key, { visible: next });
    },
    [key, sceneApi],
  );
  return [visible, setVisible];
};
