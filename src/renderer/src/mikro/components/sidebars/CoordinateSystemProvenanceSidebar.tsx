import { useGetCoordinateSystemProvenanceQuery } from "../../api/graphql";
import { ProvenanceSection } from "./ProvenanceSection";

/**
 * The space's edit history, on its own round trip.
 *
 * Its own tab rather than a section of Info because of what it records here: a
 * re-registration moves everything placed in this space at once, without
 * touching a single stored coordinate. When a layer looks wrong, this is the
 * list that says whether the space moved under it — a question worth a tab.
 *
 * `cache-and-network` so reopening it after a task ran shows what the task
 * recorded rather than the answer from before it started.
 */
export const CoordinateSystemProvenanceSidebar = ({ id }: { id: string }) => {
  const { data, error, loading } = useGetCoordinateSystemProvenanceQuery({
    variables: { id },
    fetchPolicy: "cache-and-network",
  });

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">
            Could not load provenance: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        {loading ? "Loading provenance…" : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <ProvenanceSection entries={data.coordinateSystem.provenanceEntries} />
    </div>
  );
};
