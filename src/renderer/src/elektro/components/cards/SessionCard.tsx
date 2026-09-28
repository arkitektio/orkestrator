import { AudioLines } from "lucide-react";
import React from "react";
import { Button } from "@/core/ui/button";
import { formatDisplay } from "@/core/util/quantities";
import { ElektroArrayDataset } from "@/core/linkers";
import type { NeuronModelSessionFragment } from "../../api/graphql";
import { useOpenClockOnTimeline } from "../../lib/useOpenClockOnTimeline";

/**
 * One session of a neuron model — one run, since a run IS its clock: the clock's
 * name, how long the run was, the datasets it produced, and the way onto its
 * timeline.
 *
 * "Open on timeline" goes THROUGH the clock: the experiment whose world is that
 * clock if one exists, else one staged over it (`findOrCreateExperimentForWorld`).
 * A session with no clock is the model's datasets timed onto none yet — listed,
 * but with no timeline to open.
 *
 * TaskCard's minimal row: one bordered box, no card inside it.
 */
const SessionCard = ({ session }: { session: NeuronModelSessionFragment }) => {
  const { open, opening, ready } = useOpenClockOnTimeline();
  const { clock, datasets } = session;
  // Every dataset of one run shares its integration; the first one says it.
  const duration = datasets.find((dataset) => dataset.simulation)?.simulation?.duration;

  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 truncate text-sm font-medium leading-none" title={clock?.name}>
          {clock ? clock.name : "Not timed yet"}
        </p>
        {duration && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {formatDisplay(duration)}
          </span>
        )}
      </div>

      {datasets.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
          {datasets.map((dataset) => (
            <ElektroArrayDataset.DetailLink
              key={dataset.id}
              object={dataset}
              className="max-w-full truncate font-mono text-muted-foreground"
            >
              {dataset.name}
            </ElektroArrayDataset.DetailLink>
          ))}
        </div>
      )}

      {clock && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 self-start text-xs"
          disabled={opening || !ready}
          onClick={() => open(clock)}
        >
          <AudioLines className="mr-1.5 h-3.5 w-3.5" />
          {opening ? "Opening…" : "Open on timeline"}
        </Button>
      )}
    </div>
  );
};

export default React.memo(SessionCard);
