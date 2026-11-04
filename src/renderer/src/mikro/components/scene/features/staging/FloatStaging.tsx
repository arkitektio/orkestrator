import { useCallback, useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon, LoaderIcon, PinIcon, XIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";

import { useStagedLayersStore, useStagedLayersStoreApi, type StagedLayer } from "../../platform/float/stagedLayerStore";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useLayerCardSlot } from "../../platform/layerui/layerCardSlot";
import { useStaging } from "./useStaging";

/**
 * A float's side of staging: what it staged, for as long as it is open.
 *
 * Closing the float — ×, Escape, a press outside, a click on another object,
 * the shape scrolling off the slab — DISCARDS everything it staged and did not
 * keep: a staged layer is the float's preview, and it goes with it. Keeping
 * is explicit, per layer or all at once, and a kept layer is a saved layer
 * that no longer belongs to the float.
 */
export const useFloatStaging = (owner: string) => {
  const entries = useStagedLayersStore(useShallow((state) => state.entries.filter((entry) => entry.owner === owner)));
  const stagedApi = useStagedLayersStoreApi();
  // On close (unmount), whatever was not kept goes. A Keep still in flight
  // finishes: its entry leaves once the saved layer has arrived.
  useEffect(
    () => () => {
      const state = stagedApi.getState();
      state.discard(state.entries.filter((entry) => entry.owner === owner && !entry.keeping).map((entry) => entry.key));
    },
    [stagedApi, owner],
  );
  return { entries, holding: entries.length > 0 };
};

export type FloatStaging = ReturnType<typeof useFloatStaging>;

/**
 * The float's "In the scene" pane: each staged layer's ordinary layer card,
 * inline (the viewport hands the cards in, `layerCardSlot`) and nothing else
 * per layer — a card's remove unstages it — then Keep all / Discard all.
 * Says plainly that closing discards the rest.
 */
export const StagedPane = ({ staging }: { staging: FloatStaging }) => {
  const { keep, discard } = useStaging();
  const Card = useLayerCardSlot();
  const [error, setError] = useState<unknown>(null);
  const keepKeys = (keys: string[]) => {
    setError(null);
    keep(keys).catch(setError);
  };
  const keys = staging.entries.map((entry) => entry.key);
  return (
    <div className="flex flex-col gap-2.5 px-2.5 pb-3 pt-1.5 text-xs">
      {Card ? (
        // Each staged layer with its ordinary layer card, inline: edited as a
        // saved one is, its writes held until Keep (`useStagedLayerMutation`).
        // Just the cards: a card's remove unstages its layer.
        <div className="flex flex-col gap-1.5">
          {staging.entries.map((entry) => (
            <Card
              key={entry.key}
              layerId={entry.key}
              onRemove={(id) => discard([id])}
              defaultExpanded={staging.entries.length === 1}
              headerActions={<KeepButton entry={entry} onKeep={() => keepKeys([entry.key])} />}
            />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {staging.entries.map((entry) => (
            <StagedRow key={entry.key} entry={entry} onKeep={() => keepKeys([entry.key])} onDiscard={() => discard([entry.key])} />
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <Button size="xs" onClick={() => keepKeys(keys)}>
          Keep all
        </Button>
        <Button size="xs" variant="ghost" onClick={() => discard(keys)}>
          Discard all
        </Button>
      </div>
      <p className="text-muted-foreground">Not saved: closing this discards what you have not kept.</p>
      <ErrorNote error={error} />
    </div>
  );
};

/**
 * Keep, in a staged layer's card title bar: saves the layer, with what its
 * card changed (`useStaging.keep` replays the held writes).
 */
const KeepButton = ({ entry, onKeep }: { entry: StagedLayer; onKeep: () => void }) => {
  const edits = entry.edits?.length ?? 0;
  return (
    <Button
      variant="ghost"
      size="xs"
      className="h-5 shrink-0 gap-1 px-1.5 text-[11px] text-primary hover:text-primary"
      title={edits > 0 ? `Keep in the scene, with ${edits} ${edits === 1 ? "change" : "changes"}` : "Keep in the scene"}
      disabled={entry.keeping}
      onClick={(event) => {
        // The title bar toggles the card; Keep is not that.
        event.stopPropagation();
        onKeep();
      }}
    >
      {entry.keeping ? <LoaderIcon className="h-3 w-3 animate-spin" /> : <PinIcon className="h-3 w-3" />}
      Keep
    </Button>
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
