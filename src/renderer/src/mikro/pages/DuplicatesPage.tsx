import { PageLayout } from "@/core/layout/PageLayout";
import { renderQueryState } from "@/core/layout/routes/queryState";
import { Button } from "@/core/ui/button";
import { useState } from "react";
import { useFileDuplicateGroupsQuery } from "../api/graphql";
import { DuplicateFileRow } from "../components/file/DuplicateFileRow";
import { MIKRO_HELP } from "../help";
import { formatBytes } from "../specs";

const PAGE = 50;

/**
 * The files of the organization that hold the same bytes, at `/mikro/duplicates`:
 * one group per digest, the most bytes stored more than once first. Read only —
 * deleting a copy is the file's own menu. A file whose digest mikro has not
 * computed yet is in no group until it has.
 */
export const DuplicatesPage = () => {
  const [limit, setLimit] = useState(PAGE);
  const query = useFileDuplicateGroupsQuery({
    variables: { pagination: { limit } },
    fetchPolicy: "cache-and-network",
  });

  const fallback = renderQueryState(query);
  if (fallback !== undefined) return <>{fallback}</>;

  const groups = query.data!.fileDuplicateGroups;
  const redundant = groups.reduce((sum, group) => sum + group.redundantBytes, 0);

  return (
    <PageLayout title="Duplicates" help={MIKRO_HELP.duplicates}>
      <div className="flex flex-col gap-4 p-3">
        <p className="text-sm text-muted-foreground">
          {groups.length === 0
            ? "No two files hold the same bytes."
            : `${groups.length}${groups.length === limit ? "+" : ""} sets of identical files; keeping one of each would free ${formatBytes(redundant)}.`}
        </p>

        {groups.map((group) => (
          <section key={group.digest} className="flex flex-col gap-2 border-b pb-3 last:border-b-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">
                {group.files.length} copies of {formatBytes(group.size)}
              </span>
              <span className="truncate font-mono text-xs text-muted-foreground" title={group.digest}>
                {group.digest.slice(0, 16)}…
              </span>
            </div>
            <div className="flex flex-col gap-2 pl-1">
              {group.files.map((file) => (
                <DuplicateFileRow key={file.id} file={file} />
              ))}
            </div>
          </section>
        ))}

        {groups.length === limit && (
          <Button variant="ghost" className="self-start" onClick={() => setLimit((current) => current + PAGE)}>
            Show more
          </Button>
        )}
      </div>
    </PageLayout>
  );
};

export default DuplicatesPage;
