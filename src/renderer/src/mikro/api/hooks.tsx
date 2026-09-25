import { useFrom_File_LikeMutation } from "@/mikro/api/graphql";

/**
 * Register an uploaded big-file store entry as a mikro file.
 *
 * `folder` files it straight into that folder — the mutation takes the id, so
 * dropping onto a folder page needs no move afterwards. Left out, the backend
 * puts it in the organization's default folder, as it always did. The folder's
 * own contents query is refetched alongside `GetFiles` so the new row appears
 * where it was dropped.
 */
export const useCreateFile = (folder?: string) => {
  const [createFile] = useFrom_File_LikeMutation({
    refetchQueries: folder ? ["GetFiles", "Children"] : ["GetFiles"],
  });

  const upload = async (file: File, key: string) => {
    await createFile({
      variables: {
        file: key,
        name: file.name,
        folder,
      },
    });
  };

  return upload;
};
