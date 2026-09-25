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
import { Network, Ruler } from "lucide-react";
import React from "react";
import { toast } from "sonner";
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

  const handleRelationCreation = async () => {
    for (const object of props.left.objects) {
      try {
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

        toast.success("Relation created successfully!");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create relation",
        );
      }
    }
  };

  return (
    <CommandActionRow
      value={props.category.id}
      onSelect={handleRelationCreation}
      title={props.category.label}
      description={props.category.graph.name}
      icon={Network}
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

  const handleRelationCreation = async () => {
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
      toast.success("Relation created successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create relation",
      );
    }
  };

  return (
    <CommandActionRow
      value={props.category.id}
      onSelect={handleRelationCreation}
      title={props.category.label}
      description={props.category.graph.name}
      icon={Network}
    />
  );
};
