import { useState } from "react";

import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";

import { useStagedLayersStore } from "../../platform/float/stagedLayerStore";
import { StagedRow } from "./FloatStaging";
import { useStaging } from "./useStaging";

/**
 * The layer panel's "Staged" group: every layer a float staged, shown in the
 * scene and saved nowhere.
 *
 * Staged layers get no editable card: a card's edits are writes to a layer
 * row, and these have none. Show/hide, keep and discard are all they offer;
 * a kept layer comes back as an ordinary card. A layer whose float went away
 * without asking (its shape scrolled off the slab) is still here.
 */
export const StagedLayersCard = () => {
  const entries = useStagedLayersStore((state) => state.entries);
  const { keep, discard } = useStaging();
  const [error, setError] = useState<unknown>(null);
  if (entries.length === 0) return null;

  const keepKeys = (keys: string[]) => {
    setError(null);
    keep(keys).catch(setError);
  };

  return (
    <section className="mb-1 flex flex-col gap-1 rounded-md border border-dashed border-border px-2 py-1.5 text-xs" aria-label="Staged layers">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 font-medium">Staged</span>
        <span className="text-muted-foreground">Not saved</span>
        <Button size="xs" variant="outline" onClick={() => keepKeys(entries.map((entry) => entry.key))}>
          Keep all
        </Button>
        <Button size="xs" variant="ghost" onClick={() => discard(entries.map((entry) => entry.key))}>
          Discard all
        </Button>
      </div>
      <ul className="flex flex-col gap-0.5">
        {entries.map((entry) => (
          <StagedRow key={entry.key} entry={entry} onKeep={() => keepKeys([entry.key])} onDiscard={() => discard([entry.key])} />
        ))}
      </ul>
      <ErrorNote error={error} />
    </section>
  );
};
