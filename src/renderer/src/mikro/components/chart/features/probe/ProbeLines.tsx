import { ChartSpline, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProbeLinePlot, type ProbePlotLine } from "@/core/data/plot/chrome/ProbeLinePlot";
import { reportErrorAs } from "@/core/notify";
import { linkBuilder } from "@/core/smart/builder";
import { Button } from "@/core/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { useCreateTraceChartLayerMutation } from "@/mikro/api/graphql";
import type { ArrayHopLike } from "@/mikro/lib/attributes/attributeTypes";
import type { HopLines } from "@/mikro/lib/attributes/ui/AttributeBlocks";
import { useLensRegistry } from "@/mikro/lib/lenses/useLensRegistry";
import { useVisualizeLens } from "@/mikro/lib/visualize";
import { useChartStore } from "../../platform/stores/chartStore";
import { useProbePick } from "./ProbePick";

/**
 * An ARRAY hop's lines in the Probe tab: plotted (`ProbeLinePlot`), not the
 * scene's sparkline, with what can be done with one of them.
 *
 * One line — the pinned row's own trace — or one per member of a cluster,
 * drawn over each other; a click picks that member — the same pick as its
 * chip (`ProbePick`), so the Probe tab shows its mesh too. The picked (or only)
 * line can be laid out in a chart: a new one (`autoVisualize`), or as a trace
 * on this one. Both go through the line's own lens — the array at that one
 * position along its key axis (`ensureChannelLens`, idempotent) — which is a
 * lens like any other, so the lens' own actions ("Visualize", "Draw on Chart")
 * work on it too.
 */
export const ProbeLines = ({ hop, read, color }: { hop: ArrayHopLike; read: HopLines; color: string }) => {
  const pick = useProbePick();
  // The member picked anywhere in the tab, as this plot's line key, when it is
  // one of this hop's parent's rows.
  const parent = hop.parent ?? null;
  const selected =
    pick?.picked && parent !== null && pick.picked.hop === parent ? String(pick.picked.id) : null;
  const select = (key: string | null) => {
    if (parent === null || !pick) return;
    const line = key === null ? null : read.lines?.find((candidate) => String(candidate.id) === key);
    pick.pick(parent, line ? line.id : null);
  };
  const lines = useMemo<ProbePlotLine[]>(
    () =>
      read.lines
        ? read.lines.map((line) => ({ key: String(line.id), values: line.values, label: `#${String(line.id)}`, color }))
        : read.series
          ? [{ key: "line", values: read.series.values, label: hop.arrayDataset.name, color }]
          : [],
    [read, color, hop.arrayDataset.name],
  );
  const first = read.series ?? read.lines?.[0] ?? null;
  if (!first) return null;

  // The position along the key axis the chosen line was read at.
  const index = read.series
    ? read.series.index
    : (read.lines?.find((line) => String(line.id) === selected)?.index ?? null);

  return (
    <ProbeLinePlot
      lines={lines}
      axis={first.axis}
      stride={first.stride}
      selected={read.lines ? selected : null}
      onSelect={read.lines && pick && parent !== null ? select : undefined}
      actions={<ProbeLineActions hop={hop} index={index} several={!!read.lines} />}
    />
  );
};

const ProbeLineActions = ({ hop, index, several }: { hop: ArrayHopLike; index: number | null; several: boolean }) => {
  const navigate = useNavigate();
  const lenses = useLensRegistry();
  const chart = useChartStore((s) => s.chartId);
  const [busy, setBusy] = useState(false);
  // The lens a scene result is drawn on (a ref: `onScene` runs after the
  // mutation, and must see the lens it was asked for).
  const visualizedLens = useRef<string | null>(null);
  const [visualize] = useVisualizeLens((scene) => {
    const lens = visualizedLens.current;
    if (lens) navigate(`${linkBuilder("mikro/lenses")(lens)}?scene=${encodeURIComponent(scene)}`);
  });
  const [addTrace] = useCreateTraceChartLayerMutation({ refetchQueries: ["GetChart"] });

  const lineLens = () => {
    if (index === null) throw new Error("No line is chosen");
    return lenses.ensureChannelLens(hop.arrayDataset.id, [], hop.lookup.keyAxis, index);
  };
  const run = (work: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    work()
      .catch(reportErrorAs(failure))
      .finally(() => setBusy(false));
  };

  const disabled = index === null || busy;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="xs"
          variant="ghost"
          className="h-5 shrink-0 gap-1 px-1.5 font-sans text-[11px]"
          disabled={disabled}
          title={index === null && several ? "Click a line to choose it" : "Lay this line out in a chart"}
        >
          <ChartSpline className="h-3 w-3" />
          Chart
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const lens = await lineLens();
              visualizedLens.current = lens;
              await visualize(lens);
            }, "Couldn't chart this line")
          }
        >
          <ChartSpline className="mr-2 h-3.5 w-3.5" />
          In a new chart
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const lens = await lineLens();
              await addTrace({ variables: { input: { chart, lens } } });
            }, "Couldn't add the line to this chart")
          }
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add to this chart
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
