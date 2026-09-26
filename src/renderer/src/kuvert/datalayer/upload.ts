import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { uploadToStore, UploadOptions } from "@/core/datalayer/hooks/useUpload";
import { useCallback } from "react";
import { useKuvert } from "../api/funcs";
import {
  FinishBigfileUploadDocument,
  FinishBigfileUploadMutation,
  FinishBigfileUploadMutationVariables,
  RequestBigfileUploadDocument,
  RequestBigfileUploadMutation,
  RequestBigfileUploadMutationVariables,
} from "../api/graphql";

/**
 * Upload one file to send as an attachment: a grant from kuvert, the bytes
 * through the Electron uploader, then `finishBigfileUpload`. Resolves to the
 * store id `sendMessage` takes in `attachments`.
 */
export const useAttachmentUpload = () => {
  const client = useKuvert();
  const datalayer = useDatalayerEndpoint();

  return useCallback(
    async (file: File, options?: UploadOptions) => {
      if (!datalayer) throw new Error("No datalayer configured: attachments cannot be sent");
      const { data } = await client.mutate<RequestBigfileUploadMutation, RequestBigfileUploadMutationVariables>({
        mutation: RequestBigfileUploadDocument,
        variables: {
          input: { originalFileName: file.name, fileSize: file.size, contentType: file.type || null },
        },
      });
      const grant = data?.requestBigfileUpload;
      if (!grant) throw new Error("The server gave no upload grant");
      await uploadToStore(file, datalayer, grant, options);
      await client.mutate<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>({
        mutation: FinishBigfileUploadDocument,
        variables: { input: { storeId: grant.store } },
      });
      return grant.store;
    },
    [client, datalayer],
  );
};
