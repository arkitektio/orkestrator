import { ErrorNote } from "@/core/ui/error-note";
import { GitBranch } from "lucide-react";
import { useGetFileDerivedQuery } from "../../api/graphql";
import ArrayDatasetList from "../lists/ArrayDatasetList";
import { FileLinksSection } from "../sidebars/FileLinksSection";

/**
 * What these bytes became, and what they were written from: every kind of
 * container a converter wrote out of the file, not only the array datasets.
 *
 * The links come from `GetFileDerived` (one round trip, both directions). The
 * array datasets keep their thumbnail cards through `ArrayDatasetList`, but
 * that list only mounts when the links say there is one, so a file nothing was
 * converted out of shows no empty card. Tables, mesh and annotation
 * collections are rows; so is the container an export was written from.
 *
 * The whole section renders nothing when there is nothing to list, and nothing
 * while loading: it sits below the facts and the preview, and a spinner there
 * would only push the page around.
 */
export const FileOutcomes = ({ fileId }: { fileId: string }) => {
  // cache-and-network so coming back after a converter ran shows what it wrote
  // rather than the answer from before it started.
  const { data, error, refetch } = useGetFileDerivedQuery({
    variables: { id: fileId },
    fetchPolicy: "cache-and-network",
  });

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <ErrorNote error={error} title="Couldn't load what was made from this file" />
        <button
          type="button"
          onClick={() => void refetch().catch(() => undefined)}
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!data) return null;

  const converted = data.file.derivedContainers;
  const exportedFrom = data.file.exportedFrom;
  const hasArrays = converted.some((link) => link.container.__typename === "ArrayDataset");
  const others = converted.filter((link) => link.container.__typename !== "ArrayDataset");

  if (!hasArrays && others.length === 0 && exportedFrom.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-bold tracking-tight">What it became</h2>
      </div>

      {hasArrays && (
        <ArrayDatasetList
          filters={{ sourceFile: fileId }}
          title={<div className="pb-1 text-xs font-semibold">Array datasets</div>}
          defaultLimit={10}
        />
      )}

      <FileLinksSection
        title={hasArrays ? "Other containers" : "Converted into"}
        links={others}
      />

      <FileLinksSection title="Exported from" links={exportedFrom} />
    </section>
  );
};
