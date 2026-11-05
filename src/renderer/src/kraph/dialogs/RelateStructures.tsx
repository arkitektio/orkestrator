import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { Structure } from "@/core/types";
import {
  ListStructureRelationCategoryWithGraphFragment,
  useAssertStructureRelationExistsMutation,
  useAssertStructureExistsMutation,
  useListStructureRelationCategoryQuery
} from "@/kraph/api/graphql";
import {
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { ErrorNote } from "@/core/ui/error-note";

export const RelateStructures = (props: {
  left: Structure[];
  right: Structure[];
}) => {
  const { data, error } = useListStructureRelationCategoryQuery({
    variables: {},
    fetchPolicy: "network-only",
  });

  // `ensureStructure` is gone: `assertStructureExists` is idempotent on the
  // (identifier, object) pair, so asserting twice records one structure.
  const [ensureStructure] = useAssertStructureExistsMutation();

  const [createSRelation] = useAssertStructureRelationExistsMutation();

  const { submit: handleRelationCreation, submitting } = useDialogSubmit(
    async (category: ListStructureRelationCategoryWithGraphFragment) => {
      const leftStructure = props.left.at(0);
      const rightStructure = props.right.at(0);

      if (!leftStructure || !rightStructure) {
        throw new Error("Missing source or target structure");
      }

      const left = await ensureStructure({
        variables: {
          input: {
            identifier: leftStructure.identifier,
            object: leftStructure.id,
          },
        },
      });

      const right = await ensureStructure({
        variables: {
          input: {
            identifier: rightStructure.identifier,
            object: rightStructure.id,
          },
        },
      });

      if (!left.data || !right.data) {
        throw new Error("Failed to assert structures");
      }

      await createSRelation({
        variables: {
          input: {
            sourceId: left.data.assertStructureExists.structure.id,
            targetId: right.data.assertStructureExists.structure.id,
            term: category.term?.key ?? category.key,
          },
        },
      });
    },
    { errorTitle: "Couldn't relate the structures" },
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Relate structures</DialogTitle>
        <DialogDescription>Pick how the first structure relates to the second.</DialogDescription>
      </DialogHeader>
      <DialogBody className="gap-2">
        <ErrorNote error={error} title="Couldn't load the relation categories" />
        {!data && !error && <div className="text-muted-foreground">Loading...</div>}

        {data?.structureRelationCategories?.map((category) => (
          <button
            type="button"
            key={category.id}
            disabled={submitting}
            className="p-2 border rounded-lg w-full text-left hover:bg-muted disabled:opacity-50"
            onClick={() => handleRelationCreation(category)}
          >
            <div className="font-medium">{category.label}</div>
            <div className="text-muted-foreground">{category.description}</div>
          </button>
        ))}
      </DialogBody>
    </>
  );
};
