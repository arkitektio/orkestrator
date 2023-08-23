import { useDeleteModelMutation } from "../api/graphql";
import { withMikro } from "../MikroNextContext";

export const useDeleteModel = () => {
  const [deleteModel] = withMikro(useDeleteModelMutation)();

  const handleRemoveModel = (id: string) => {
    return deleteModel({
      variables: { id },
      update(cache) {
        const normalizedId = cache.identify({ id, __typename: "Model" });
        cache.evict({ id: normalizedId });
        cache.gc();
      },
    });
  };

  return handleRemoveModel;
};
