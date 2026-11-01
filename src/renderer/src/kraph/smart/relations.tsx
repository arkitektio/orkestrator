import { useDialog } from "@/core/dialogs/registry";
import { ListMeasurementCategoryWithGraphFragment } from "@/kraph/api/graphql";
import { useKraph } from "@/kraph/api/funcs";
import { measureTerm } from "@/kraph/lib/measureTerm";
import { useRecentTerms, type RecentTerm } from "@/kraph/lib/recentTerms";
import { History, Ruler } from "lucide-react";
import React from "react";
import { describeError, toast } from "@/core/notify";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import type { PassDownProps } from "@/core/smart/extensions/types";

/**
 * The rows of the kraph slice of the smart context menu: what you can record
 * about the thing you picked. The section (which rows apply, and the query
 * behind them) is a descriptor in `./sections.tsx`.
 */

export const CreateMeasurementButton = (props: {
  category: ListMeasurementCategoryWithGraphFragment;
  left: PassDownProps;
  children: React.ReactNode;
}) => {
  const dialog = useDialog();

  return (
    <CommandActionRow
      value={props.category.id}
      onSelect={() => {
        dialog.openDialog(
          "setasmeasurement",
          { left: props.left.objects, category: props.category },
          { size: "large" },
        );
      }}
      title={<div className="font-light">{props.category.label}</div>}
      description={props.category.graph.name}
      icon={Ruler}
    />
  );
};

/**
 * A sentence you said before, offered again: one click records the selection
 * measuring a fresh instance of its word (`measureTerm`) and moves it back to
 * the top of the recents.
 */
export const MeasureRecentTermRow = (props: { term: RecentTerm; left: PassDownProps }) => {
  const client = useKraph();
  const recents = useRecentTerms();
  const [running, setRunning] = React.useState(false);
  const [failure, setFailure] = React.useState<{ title: string; detail?: string } | null>(null);
  const word = props.term.label || props.term.key;
  const measure = props.term.measure;
  const label = measure ? `${measure.label || measure.key} of ${word}` : word;

  const say = async () => {
    if (running) return;
    setRunning(true);
    setFailure(null);
    try {
      await measureTerm(client, props.left.objects, props.term.key, measure?.key);
      recents.record({
        key: props.term.key,
        label: props.term.label,
        color: props.term.color,
        measure,
      });
      toast.success(`Measures ${label}`);
    } catch (error) {
      // The row says it, where it was chosen.
      setFailure({ title: `Couldn't measure ${label}`, detail: describeError(error).message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <CommandActionRow
      value={`recent-term-${measure?.key ?? ""}-${props.term.key}`}
      onSelect={say}
      title={label}
      description="measures · recent"
      icon={History}
      running={running}
      failure={failure}
    />
  );
};
