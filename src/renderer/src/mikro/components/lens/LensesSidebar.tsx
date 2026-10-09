import { useDialog } from "@/core/dialogs/registry";
import { MikroLens } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { Plus } from "lucide-react";
import { GetArrayDatasetQuery } from "../../api/graphql";
import { lensLabel, lensTitle } from "../../lenses";
import { SnapshotBackdrop } from "../cards/SnapshotBackdrop";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

const rowClass = (active: boolean) =>
  cn(
    "flex flex-row items-center gap-2 rounded-md border p-2 transition-colors hover:bg-accent/50",
    active ? "border-primary/60 bg-accent/40" : "border-border/60",
  );

/**
 * The selections of one dataset, and which of them this page is about.
 *
 * The whole array first — one row, however many lenses that cut nothing the
 * dataset happens to carry — then every part cut out of it.
 * Each row is the LENS as an object (drag it onto a scene or a chart, right-click
 * it for its actions), and a link to its own page: the same shell over another
 * selection, so following one reads as switching rather than leaving.
 *
 * A list rather than a grid of cards: these are siblings to pick between, and
 * what tells them apart is one line of slices, not a picture.
 */
export const LensesSidebar = ({
  dataset,
  activeLensId,
}: {
  dataset: PageDataset;
  /** The lens on screen. */
  activeLensId: string;
}) => {
  const { openDialog } = useDialog();
  // The whole array is the dataset's `fullLens`; its duplicates forward to it,
  // so that one row stands for all of them.
  const lenses = [...(dataset.fullLens ? [dataset.fullLens] : []), ...dataset.lenses];

  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-4">
      {lenses.map((lens) => (
        <MikroLens.Smart key={lens.id} object={lens}>
          <div className={rowClass(lens.id === activeLensId)}>
            <SnapshotBackdrop
              snapshot={lens.latestSnapshot}
              className="h-9 w-9 shrink-0 rounded"
            />
            <div className="flex min-w-0 flex-col">
              <MikroLens.DetailLink
                object={lens}
                className="truncate text-sm font-medium hover:underline"
              >
                {lensTitle(lens)}
              </MikroLens.DetailLink>
              <span className="truncate font-mono text-[0.625rem] text-muted-foreground">
                {lensLabel(lens)}
              </span>
            </div>
          </div>
        </MikroLens.Smart>
      ))}

      {dataset.lenses.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nothing has been cut out of this dataset yet. A lens selects part of
          it — a few planes, a region, a timepoint — to look at or to hand to a
          task on its own.
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="mt-1 w-fit"
        onClick={() =>
          openDialog("createlens", { dataset: dataset.id }, { size: "medium" })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        New lens
      </Button>
    </div>
  );
};
