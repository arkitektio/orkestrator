import {
  useDeleteContextMutation,
  useDeleteModelMutation,
} from "../api/graphql";
import { MutationHookOptions } from "@apollo/client";
import { withMikro } from "../MikroContext";

export function withDelete<
  T extends (options: any) => any,
  F extends { id: string; __typename?: string | undefined }
>(func: T, object: F): T {
  const Wrapped = (nana: any) => {
    return (func = func({
      ...nana,
      update(cache: any, result: any, options: any) {
        if (object.__typename) {
          const normalizedId = cache.identify(object);
          cache.evict({ id: normalizedId });
          cache.gc();
        }
      },
    }));
  };
  return Wrapped as T;
}
