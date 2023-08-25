import { BsTrash } from "react-icons/bs";
import { useDeleteSampleMutation } from "../../mikro/api/graphql";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { MateFinder } from "../types";

export type DeleteFunction = typeof useDeleteSampleMutation;
export type DeletableObject = {
  __typename?: string | undefined;
  id: string;
};

export type DeleteObjectFinder = (object: DeletableObject) => MateFinder;

export function buildDeleteMate(
  xfunction: DeleteFunction
): () => DeleteObjectFinder {
  return () => {
    const { confirm } = useConfirm();

    const [deleteItem] = xfunction({} as any);

    return (object: DeletableObject) => async (options) => {
      if (options.partnersIncludeSelf) {
        return [
          {
            action: async (event) => {
              for (const partner of event.partners) {
                await confirm({
                  message: `Are you sure you want to delete this ${object.__typename}?`,
                });

                deleteItem({
                  variables: { id: partner.id },
                  update(cache: any, result: any, options: any) {
                    if (object.__typename) {
                      const normalizedId = cache.identify(object);
                      cache.evict({ id: normalizedId });
                      cache.gc();
                    }
                  },
                });
              }
            },
            label: (
              <>
                <BsTrash />
              </>
            ),
            description: `Delete this ${object.__typename}`,
          },
        ];
      }
    };
  };
}
