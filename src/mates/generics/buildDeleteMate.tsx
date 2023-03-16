import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { useDeleteSampleMutation } from "../../mikro/api/graphql";
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

    return (object: DeletableObject) => (type, isSelf) => {
      if (isSelf) {
        return [
          {
            action: async (self, partner) => {
              await confirm({
                message: `Are you sure you want to delete this ${object.__typename}?`,
              });

              deleteItem({
                variables: { id: partner[0].object },
                update(cache: any, result: any, options: any) {
                  if (object.__typename) {
                    const normalizedId = cache.identify(object);
                    cache.evict({ id: normalizedId });
                    cache.gc();
                  }
                },
              });
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
      if (type == "list:@mikro/omerofile") {
        return [
          {
            action: async (self, partners) => {
              await confirm({
                message: "Are you sure you want to delete all these contexts?",
              });

              for (let partner of partners) {
                await deleteItem({
                  variables: { id: partner.object },
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
                <BsTrash /> Delete All
              </>
            ),
            description: "Delete all contexts",
          },
        ];
      }
    };
  };
}
