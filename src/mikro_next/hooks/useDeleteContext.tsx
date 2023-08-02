import { useDeleteContextMutation } from "../api/graphql";
import { withMikro } from "../MikroNextContext";

export const useDeleteContext = () => {
  const [deletem] = withMikro(useDeleteContextMutation)();

  const handleRemoveModel = (id: string) => {
    return deletem({
      variables: { id },
      update(cache) {
        const normalizedId = cache.identify({ id, __typename: "Context" });
        cache.evict({ id: normalizedId });
        cache.gc();
      },
    });
  };

  return handleRemoveModel;
};

export default useDeleteContext;
