import { useDialog } from "@/core/dialogs/registry";
import {
  ListMeasurementCategoryWithGraphFragment,
  ListRelationCategoryFragment,
  ListStructureRelationCategoryWithGraphFragment,
  useAssertRelationExistsMutation,
  useAssertStructureExistsMutation,
  useAssertStructureRelationExistsMutation,
} from "@/kraph/api/graphql";
import { Structure } from "@/core/types";
import { useKraph } from "@/kraph/api/funcs";
import { measureTerm } from "@/kraph/lib/measureTerm";
import { useRecentTerms, type RecentTerm } from "@/kraph/lib/recentTerms";
import { History, Network, Ruler } from "lucide-react";
import React from "react";
import { describeError, toast } from "@/core/notify";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import type { PassDownProps } from "@/core/smart/extensions/types";

/**
 * The rows of the kraph slice of the smart context menu: what you can record
 * about the thing you picked, or about the pair you dragged together. The
 * sections (which rows apply, and the queries and probes behind them) are
 * descriptors in `./sections.tsx`.
 *
 * This used to read `materializedRelationEdges` and its two siblings —
 * precomputed (source × edge × target) rows. They were removed as a cache with
 * no invalidation, and the removal fixed a live bug: nothing refreshed the table
 * when a category was added, and `createRelationCategory` never populated it at
 * all, so relation categories made through the API had zero rows permanently and
 * the Relate menu was silently empty for them.
 *
 * The candidates now come from the graph's *schema* (its edge categories, which
 * are the size of the schema rather than of the evidence) and admission is
 * decided by the server through `matchesDescriptor` — the same predicate the
 * writer applies, so the menu cannot offer a pairing the write would refuse.
 */

const termOf = (category: { key: string; term?: { key: string } | null }) =>
  category.term?.key ?? category.key;

export const StructureRelateButton = (props: {
  category: ListStructureRelationCategoryWithGraphFragment;
  left: PassDownProps;
  right: Structure;
  children: React.ReactNode;
}) => {
  const [createSRelation] = useAssertStructureRelationExistsMutation();
  const [createStructure] = useAssertStructureExistsMutation();
  const [running, setRunning] = React.useState(false);
  const [failure, setFailure] = React.useState<{ title: string; detail?: string } | null>(null);

  const handleRelationCreation = async () => {
    if (running) return;
    setRunning(true);
    setFailure(null);
    const total = props.left.objects.length;
    let done = 0;
    try {
      for (const object of props.left.objects) {
        const left = await createStructure({
          variables: {
            input: {
              object: object.id,
              identifier: object.identifier,
            },
          },
        });

        const right = await createStructure({
          variables: {
            input: {
              object: props.right.id,
              identifier: props.right.identifier,
            },
          },
        });

        if (
          !left.data?.assertStructureExists.structure.id ||
          !right.data?.assertStructureExists.structure.id
        ) {
          throw new Error("Failed to ensure structures for relation creation");
        }

        await createSRelation({
          variables: {
            input: {
              sourceId: left.data.assertStructureExists.structure.id,
              targetId: right.data.assertStructureExists.structure.id,
              term: termOf(props.category),
            },
          },
        });

        done += 1;
      }
      // The menu stays open and shows nothing of the new edge: say it was made.
      toast.success(
        total === 1
          ? `Related as ${props.category.label}`
          : `Related ${total} as ${props.category.label}`,
      );
    } catch (error) {
      setFailure({
        title: done > 0 ? `Related ${done} of ${total}, then failed` : "Couldn't relate them",
        detail: describeError(error).message,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <CommandActionRow
      value={props.category.id}
      onSelect={handleRelationCreation}
      title={props.category.label}
      description={props.category.graph.name}
      icon={Network}
      running={running}
      failure={failure}
    />
  );
};

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
 * A word you measured something as before, offered again: one click records
 * the selection measuring a fresh instance of it (`measureTerm`) and moves the
 * word back to the top of the recents.
 */
export const MeasureRecentTermRow = (props: { term: RecentTerm; left: PassDownProps }) => {
  const client = useKraph();
  const recents = useRecentTerms();
  const [running, setRunning] = React.useState(false);
  const [failure, setFailure] = React.useState<{ title: string; detail?: string } | null>(null);
  const label = props.term.label || props.term.key;

  const measure = async () => {
    if (running) return;
    setRunning(true);
    setFailure(null);
    try {
      await measureTerm(client, props.left.objects, props.term.key);
      recents.record({ key: props.term.key, label: props.term.label, color: props.term.color });
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
      value={`recent-term-${props.term.key}`}
      onSelect={measure}
      title={label}
      description="measures · recent"
      icon={History}
      running={running}
      failure={failure}
    />
  );
};

/**
 * Relating two entities is a claim like any other: it names the word, not a
 * category row, so both endpoints are entity ids and the term comes off the
 * category. No structure has to be ensured first — entities already are nodes.
 */
export const EntityRelateButton = (props: {
  category: ListRelationCategoryFragment & { graph: { name: string } };
  source: Structure;
  target: Structure;
}) => {
  const [assertRelation] = useAssertRelationExistsMutation();
  const [running, setRunning] = React.useState(false);
  const [failure, setFailure] = React.useState<{ title: string; detail?: string } | null>(null);

  const handleRelationCreation = async () => {
    if (running) return;
    setRunning(true);
    setFailure(null);
    try {
      await assertRelation({
        variables: {
          input: {
            sourceId: props.source.id,
            targetId: props.target.id,
            term: termOf(props.category),
          },
        },
      });
      toast.success(`Related as ${props.category.label}`);
    } catch (error) {
      setFailure({ title: "Couldn't relate them", detail: describeError(error).message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <CommandActionRow
      value={props.category.id}
      onSelect={handleRelationCreation}
      title={props.category.label}
      description={props.category.graph.name}
      icon={Network}
      running={running}
      failure={failure}
    />
  );
};
