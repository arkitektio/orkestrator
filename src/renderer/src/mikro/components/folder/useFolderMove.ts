import { useMikro } from "@/core/app/Arkitekt";
import { getRefetchableQueriesForEntities } from "@/core/lib/localactions/helpers/refetch";
import {
  usePutArrayDatasetsInFolderMutation,
  usePutFilesInFolderMutation,
} from "@/mikro/api/graphql";

/**
 * What is being filed. Two kinds because the server takes two mutations —
 * `putFilesInFolder` and `putArrayDatasetsInFolder` — over otherwise identical
 * `{selfs, other}` input.
 */
export type FolderMoveSubject =
  | { kind: "file"; ids: string[] }
  | { kind: "arrayDataset"; ids: string[] };

/** The cache typename each kind resolves to, for invalidation. */
const TYPENAME: Record<FolderMoveSubject["kind"], string> = {
  file: "File",
  arrayDataset: "ArrayDataset",
};

/**
 * The one place that knows how to move things between folders.
 *
 * Shared by the picker dialog and the page button so both invalidate the same
 * things: whatever is on screen showing a moved item, plus the destination —
 * which does not mention it yet and so would not match on its own.
 */
export const useFolderMove = () => {
  const client = useMikro();
  const [putFiles, files] = usePutFilesInFolderMutation();
  const [putArrayDatasets, arrayDatasets] = usePutArrayDatasetsInFolderMutation();

  const moveOptions = (subject: FolderMoveSubject, folder: string) => ({
    variables: { selfs: subject.ids, other: folder },
    refetchQueries: getRefetchableQueriesForEntities(client, [
      ...subject.ids.map((id) => ({ typename: TYPENAME[subject.kind], id })),
      { typename: "Folder", id: folder },
    ]).map(({ query, variables }) => ({ query, variables })),
  });

  // Not exposed as "pick a mutation function": the two hooks return different
  // TData, so a caller holding the union cannot hand it to anything expecting
  // one `MutationFunction`. Callers get a plain promise instead.
  const move = (subject: FolderMoveSubject, folder: string) =>
    subject.kind === "file"
      ? putFiles(moveOptions(subject, folder))
      : putArrayDatasets(moveOptions(subject, folder));

  return { move, loading: files.loading || arrayDatasets.loading };
};

/** "3 files" / "this dataset" — the subject as a sentence fragment. */
export const describeSubject = (subject: FolderMoveSubject) => {
  const noun = subject.kind === "file" ? "file" : "dataset";
  return subject.ids.length > 1
    ? `${subject.ids.length} ${noun}s`
    : `this ${noun}`;
};
