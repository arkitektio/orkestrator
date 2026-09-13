import { useDialog } from "@/app/dialog";
import { CommandItem } from "@/components/ui/command";
import {
  ListMeasurementCategoryWithGraphFragment,
  ListRelationCategoryFragment,
  ListStructureRelationCategoryWithGraphFragment,
  useAssertRelationExistsMutation,
  useAssertStructureExistsMutation,
  useAssertStructureRelationExistsMutation,
  useGetDetailInstanceQuery,
  useListApplicableMeasurementCategoriesQuery,
  useListCandidateRelationCategoriesQuery,
  useListCandidateStructureRelationCategoriesQuery,
  useListGraphsQuery,
} from "@/kraph/api/graphql";
import {
  useApplicableRelationCategories,
  useApplicableStructureRelationCategories,
} from "@/kraph/lib/applicableCategories";
import { Structure } from "@/types";
import { CommandGroup } from "cmdk";
import { GitBranchPlus, Network, Ruler } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { CommandActionRow } from "../CommandActionRow";
import type { PassDownProps } from "../types";

/**
 * The kraph slice of the smart context menu: what you can record about the thing
 * you picked, or about the pair you dragged together.
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

const relateHeading = (
  <span className="font-light text-xs w-full items-center ml-2 w-full inline-flex gap-2">
    <span>Relate</span>
  </span>
);

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
              object: object.object.id,
              identifier: object.identifier,
            },
          },
        });

        const right = await createStructure({
          variables: {
            input: {
              object: props.right.object.id,
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
            sourceId: props.source.object.id,
            targetId: props.target.object.id,
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

/**
 * Both ends arrive as bare uuids, and which relation categories apply depends on
 * the two entities' *categories* — which are view-grain and so exist only inside
 * a graph. `instance(id:) { drawnIn }` bridges that: it says which views draw
 * each claim and under which category. A relation is offered only for a graph
 * that draws both ends, which is also the only graph that could record it.
 */
export const EntityRelationActions = (props: PassDownProps) => {
  const partner = props.partners?.at(0);
  const object = props.objects.at(0);

  const { data: sourceInstance } = useGetDetailInstanceQuery({
    variables: { id: object?.object.id ?? "" },
    skip: !object,
  });
  const { data: targetInstance } = useGetDetailInstanceQuery({
    variables: { id: partner?.object.id ?? "" },
    skip: !partner,
  });

  // The first graph that draws both. Two claims with no view in common cannot be
  // related there, and saying so by offering nothing is the honest answer.
  const shared = React.useMemo(() => {
    const targets = new Map(
      (targetInstance?.instance.drawnIn ?? []).map((drawing) => [
        drawing.graph.id,
        drawing,
      ]),
    );
    for (const drawing of sourceInstance?.instance.drawnIn ?? []) {
      const counterpart = targets.get(drawing.graph.id);
      if (counterpart) {
        return {
          graphId: drawing.graph.id,
          sourceCategoryId: drawing.category.id,
          targetCategoryId: counterpart.category.id,
        };
      }
    }
    return undefined;
  }, [sourceInstance, targetInstance]);

  const { data, error } = useListCandidateRelationCategoriesQuery({
    variables: {
      search: props.filter && props.filter !== "" ? props.filter : undefined,
    },
    fetchPolicy: "cache-and-network",
  });

  const candidates = React.useMemo(
    () =>
      (data?.relationCategories ?? []).filter(
        (category) => category.graph.id === shared?.graphId,
      ),
    [data, shared],
  );

  const { applicable } = useApplicableRelationCategories(
    candidates,
    shared?.sourceCategoryId,
    shared?.targetCategoryId,
  );

  if (!object || !partner) {
    return null;
  }

  return (
    <CommandGroup heading={relateHeading}>
      {applicable.map((category) => (
        <EntityRelateButton
          key={category.id}
          category={category}
          source={object}
          target={partner}
        />
      ))}
      {error && (
        <CommandItem value="error" className="flex-1">
          <span className="text-red-500">Error: {error.message}</span>
        </CommandItem>
      )}
    </CommandGroup>
  );
};

export const StructureRelationActions = (props: PassDownProps) => {
  const firstPartner = props.partners?.at(0);
  const firstObject = props.objects.at(0);
  const dialog = useDialog();

  const { data, error } = useListCandidateStructureRelationCategoriesQuery({
    variables: {
      search: props.filter && props.filter !== "" ? props.filter : undefined,
    },
    fetchPolicy: "cache-and-network",
  });

  // `StructureRelationCategoryFilter` has no `sourceIdentifier` / `targetIdentifier`
  // (only `MeasurementCategoryFilter` kept one), so admission is probed against
  // the two structure kinds instead.
  const { applicable } = useApplicableStructureRelationCategories(
    data?.structureRelationCategories,
    firstObject?.identifier,
    firstPartner?.identifier,
  );

  return (
    <CommandGroup heading={relateHeading}>
      {firstPartner &&
        applicable.map((category) => (
          <StructureRelateButton
            category={category}
            right={firstPartner}
            left={props}
            key={category.id}
          >
            {category.label}
          </StructureRelateButton>
        ))}
      {error && (
        <CommandItem value="error" className="flex-1">
          <span className="text-red-500">Error: {error.message}</span>
        </CommandItem>
      )}
      <CommandItem
        value="no-relation"
        onSelect={() =>
          dialog.openDialog("createnewrelation", {
            left: props.objects,
            right: props.partners || [],
          })
        }
        className="flex-1"
      >
        <GitBranchPlus className="mr-2 h-4 w-4" />
        Create new Relation
      </CommandItem>
    </CommandGroup>
  );
};

export const MeasurementActions = (props: PassDownProps) => {
  const firstObject = props.objects.at(0);
  const dialog = useDialog();

  const { data: pinnedGraphs } = useListGraphsQuery({
    variables: {
      filters: { pinned: true },
    },
    fetchPolicy: "cache-and-network",
  });

  if (!firstObject) {
    return null;
  }

  if (!pinnedGraphs?.graphs.length) {
    return null;
  }

  return (
    <CommandGroup
      heading={
        <span className="font-light text-xs w-full items-center ml-2 w-full inline-flex gap-2">
          <Ruler className="h-3.5 w-3.5" />
          <span>Create Measurement Category</span>
        </span>
      }
    >
      {pinnedGraphs.graphs.map((graph) => (
        <CommandActionRow
          key={graph.id}
          value={`create-measurement-${graph.id}`}
          onSelect={() =>
            dialog.openDialog("createnewmeasurement", {
              left: props.objects,
              right: props.partners || [],
              graph: graph.id,
            })
          }
          title={`In "${graph.name}"`}
          description={graph.description ?? undefined}
          icon={Ruler}
        />
      ))}
    </CommandGroup>
  );
};

/**
 * Measurements need no probe: `MeasurementCategoryFilter.sourceIdentifier`
 * survived the materialized-edge removal and answers "which measurements accept
 * this structure kind" directly, in one query.
 */
export const ApplicableMeasurements = (props: PassDownProps) => {
  const firstPartner = props.partners?.at(0);
  const firstObject = props.objects.at(0);

  const { data, error } = useListApplicableMeasurementCategoriesQuery({
    variables: {
      search: props.filter && props.filter !== "" ? props.filter : undefined,
      sourceIdentifier: firstObject?.identifier || "",
    },
    fetchPolicy: "cache-and-network",
  });

  if (firstPartner || !firstObject) {
    return null;
  }

  return (
    <CommandGroup
      heading={
        <span className="font-light text-xs w-full items-center ml-2 w-full inline-flex gap-2">
          <span>Measures</span>
        </span>
      }
    >
      {data?.measurementCategories.map((category) => (
        <CreateMeasurementButton
          category={category}
          left={props}
          key={category.id}
        >
          {category.graph.name}
        </CreateMeasurementButton>
      ))}
      {error && (
        <CommandItem value="error" className="flex-1">
          <span className="text-red-500">Error: {error.message}</span>
        </CommandItem>
      )}
    </CommandGroup>
  );
};

export const ApplicableRelations = (props: PassDownProps) => {
  const firstPartner = props.partners?.at(0);
  const firstObject = props.objects.at(0);

  if (!firstPartner && !firstObject) {
    return null;
  }

  if (!firstPartner && firstObject) {
    return <ApplicableMeasurements {...props} />;
  }

  if (
    firstPartner?.identifier === "@kraph/entity" &&
    firstObject?.identifier === "@kraph/entity"
  ) {
    return <EntityRelationActions {...props} />;
  }

  return <StructureRelationActions {...props} />;
};
