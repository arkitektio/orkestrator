import { useCallback } from "react";
import { useDialog } from "@/core/dialogs/registry";
import { reportError, toast } from "@/core/notify";
import { useMikro } from "@/mikro/api/funcs";
import { preflightDeletes } from "./preflight";

/**
 * Delete annotations the way mikro wants them deleted: ask first
 * (`preflightDeleteAnnotation`), and when shapes or data were made from them,
 * say what would go too (the `cascadedelete` dialog) and delete only once
 * the user agrees -- with `cascade: true`. Nothing made from them: the delete goes straight away, as
 * a shape delete always did (a Backspace in the scene).
 *
 * `run` is the caller's own delete (its cache upkeep, its selection), handed
 * the ids to delete, whether to cascade, and the shape ids the cascade takes
 * along so it can drop them from its lists too.
 */
export const useLineageSafeAnnotationDelete = () => {
  const client = useMikro();
  const { openDialog } = useDialog();

  return useCallback(
    async (ids: readonly string[], run: (ids: string[], cascade: boolean, alsoGone: string[]) => Promise<void>): Promise<void> => {
      if (ids.length === 0) return;
      let summary;
      try {
        summary = await preflightDeletes(client, "Annotation", ids);
      } catch (error) {
        reportError(error, "Couldn't check what deleting would take along");
        return;
      }
      if (summary.truncated || summary.blockers.length > 0) {
        toast.error(ids.length === 1 ? "This annotation can't be deleted" : "These annotations can't be deleted", {
          description: summary.truncated ? "More was made from it than one delete may take along. Delete what was made from it first." : summary.blockers.join(" "),
        });
        return;
      }
      const skipped = new Set(summary.skipIds);
      const own = ids.filter((id) => !skipped.has(id));
      const alsoGone = [
        ...ids.filter((id) => skipped.has(id)),
        ...summary.casualtyKeys.filter((key) => key.startsWith("annotation:")).map((key) => key.slice("annotation:".length)),
      ];
      if (summary.casualtyCount === 0) {
        await run(own, false, alsoGone);
        return;
      }
      openDialog("cascadedelete", {
        title: ids.length === 1 ? "Delete this annotation and what was made from it?" : `Delete ${ids.length} annotations and what was made from them?`,
        description: summary.description,
        confirmLabel: `Delete all ${ids.length + summary.casualtyCount}`,
        onConfirm: () => run(own, true, alsoGone),
      });
    },
    [client, openDialog],
  );
};
