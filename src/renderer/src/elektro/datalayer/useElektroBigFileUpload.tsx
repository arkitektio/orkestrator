import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { uploadToStore, type UploadOptions } from "@/core/datalayer/hooks/useUpload";
import type { UploadRefs } from "@/core/datalayer/UploadProvider";
import { useElektro } from "@/elektro/api/funcs";
import {
  FinishBigfileUploadDocument,
  FinishBigfileUploadMutation,
  FinishBigfileUploadMutationVariables,
  RequestBigfileUploadDocument,
  RequestBigfileUploadMutation,
  RequestBigfileUploadMutationVariables,
  useFrom_File_LikeMutation,
} from "@/elektro/api/graphql";
import { useCallback } from "react";

/**
 * Uploads a file to the datalayer under a grant elektro issues, and tells
 * elektro when it is done. Resolves to the store id `useCreateFile` takes.
 */
export const useElektroBigFileUpload = () => {
  const client = useElektro();
  const datalayerEndpoint = useDatalayerEndpoint();

  return useCallback(
    async (file: File, options?: UploadOptions) => {
      if (!client) {
        throw Error("No client configured");
      }
      if (!datalayerEndpoint) {
        throw Error("No datalayer endpoint configured");
      }

      const { data } = await client.mutate<
        RequestBigfileUploadMutation,
        RequestBigfileUploadMutationVariables
      >({
        mutation: RequestBigfileUploadDocument,
        variables: { input: { originalFileName: file.name } },
      });

      const grant = data?.requestBigfileUpload;
      if (!grant) {
        throw Error("Failed to get an upload grant");
      }

      await uploadToStore(file, datalayerEndpoint, grant, options);

      await client.mutate<
        FinishBigfileUploadMutation,
        FinishBigfileUploadMutationVariables
      >({
        mutation: FinishBigfileUploadDocument,
        variables: { input: { storeId: grant.store } },
      });

      return grant.store;
    },
    [client, datalayerEndpoint],
  );
};

/**
 * Register an uploaded big-file store entry as an elektro file. Returns the
 * file, which is what the upload island's row links to (elektro has no folder
 * page to link beside it).
 */
export const useCreateFile = () => {
  const [createFile] = useFrom_File_LikeMutation({
    refetchQueries: ["GetFiles"],
  });

  return async (file: File, key: string): Promise<UploadRefs | void> => {
    const { data } = await createFile({
      variables: { file: key, fileName: file.name },
    });
    const created = data?.fromFileLike;
    if (!created) return;
    return {
      object: { identifier: "@elektro/file", id: created.id, label: created.name },
    };
  };
};
