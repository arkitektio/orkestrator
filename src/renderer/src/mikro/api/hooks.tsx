import type { UploadRefs } from "@/core/datalayer/UploadProvider";
import { useFrom_File_LikeMutation } from "@/mikro/api/graphql";

/**
 * Register an uploaded big-file store entry as a mikro file.
 *
 * `folder` files it straight into that folder — the mutation takes the id, so
 * dropping onto a folder page needs no move afterwards. Left out, the backend
 * puts it in the organization's default folder, as it always did. The folder's
 * own contents query is refetched alongside `GetFiles` so the new row appears
 * where it was dropped.
 *
 * Returns the file and the folder it landed in (the default one is only known
 * from the answer), which is what the upload island's row links to.
 */
export const useCreateFile = (folder?: string) => {
  const [createFile] = useFrom_File_LikeMutation({
    refetchQueries: folder ? ["GetFiles", "Children"] : ["GetFiles"],
  });

  const upload = async (file: File, key: string): Promise<UploadRefs | void> => {
    const { data } = await createFile({
      variables: {
        file: key,
        name: file.name,
        folder,
      },
    });
    const created = data?.fromFileLike;
    if (!created) return;
    return {
      object: { identifier: "@mikro/file", id: created.id, label: created.name },
      container: created.folder
        ? { identifier: "@mikro/folder", id: created.folder.id, label: created.folder.name }
        : undefined,
    };
  };

  return upload;
};
