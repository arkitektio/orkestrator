import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { useDialog } from "@/core/dialogs/registry";
import { lensSmart } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { Plus } from "lucide-react";
import {
  DetailLensFragment,
  GetArrayDatasetQuery,
  LensKind,
  ListLensFragment,
  Ordering,
  useListLensesQuery,
} from "../../api/graphql";
import { containerFilter, describeLens, isWholeLens, lensSnapshot } from "../../lenses";
import { useLiveLenses } from "../../lib/lenses/useLiveLenses";
import { SnapshotBackdrop } from "../cards/SnapshotBackdrop";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

const rowClass = (active: boolean) =>
  cn(
    "flex flex-row items-center gap-2 rounded-md border p-2 transition-colors hover:bg-accent/50",
    active ? "border-primary/60 bg-accent/40" : "border-border/60",
  );

/**
 * The selections of one container, and which of them this page is about.
 *
 * The whole container first, then every part cut out of it. Each row is the
 * LENS as an object (drag it onto a scene or a chart, right-click it for its
 * actions), and a link to its own page: the same shell over another selection,
 * so following one reads as switching rather than leaving.
 *
 * A list rather than a grid of cards: these are siblings to pick between, and
 * what tells them apart is one line of slices or windows, not a picture.
 *
 * Every kind is one `lenses(filters: { <container>: id })` query, a page of
 * the newest: a task can cut a container into hundreds. An array lens' whole
 * row is its dataset's `fullLens`, which the page already holds, so the array
 * query asks for the cut ones only.
 */
export const LensesSidebar = ({
  lens,
  dataset,
}: {
  /** The lens on screen. */
  lens: DetailLensFragment;
  /** The array lens' dataset. Absent for every other kind. */
  dataset?: PageDataset;
}) =>
  dataset ? <DatasetLenses lens={lens} dataset={dataset} /> : <ContainerLenses lens={lens} />;

/** How many of a container's lenses the sidebar lists: the newest. */
export const SIBLING_LIMIT = 100;
const NEWEST = [{ createdAt: Ordering.Desc }];

const DatasetLenses = ({ lens, dataset }: { lens: DetailLensFragment; dataset: NonNullable<PageDataset> }) => {
  const { data, error, refetch } = useListLensesQuery({
    variables: { filters: { dataset: dataset.id, sliced: true }, ordering: NEWEST, pagination: { limit: SIBLING_LIMIT } },
  });
  // Someone else cutting this dataset while the page is open adds a row.
  useLiveLenses({ kind: LensKind.Array, container: dataset.id });

  if (error) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) return null;
  return (
    <LensRows
      // The whole array is the dataset's `fullLens`; its duplicates forward to
      // it, so that one row stands for all of them.
      lenses={[...(dataset.fullLens ? [dataset.fullLens] : []), ...data.lenses]}
      lens={lens}
      capped={data.lenses.length >= SIBLING_LIMIT}
    />
  );
};

const ContainerLenses = ({ lens }: { lens: DetailLensFragment }) => {
  const filters = containerFilter(lens);
  const { data, error, refetch } = useListLensesQuery({
    variables: { filters, ordering: NEWEST, pagination: { limit: SIBLING_LIMIT } },
  });
  // Someone else cutting this container while the page is open adds a row.
  useLiveLenses({ kind: describeLens(lens).info.kind, container: describeLens(lens).container.id });

  if (error) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  // Whole first, as the array list has it.
  const lenses = [...data.lenses].sort(
    (a, b) => Number(isWholeLens(b)) - Number(isWholeLens(a)),
  );
  return <LensRows lenses={lenses} lens={lens} capped={data.lenses.length >= SIBLING_LIMIT} />;
};

const LensRows = ({
  lenses,
  lens: active,
  capped = false,
}: {
  lenses: readonly ListLensFragment[];
  lens: DetailLensFragment;
  /** A full page came back: older lenses exist and are not listed. */
  capped?: boolean;
}) => {
  const { openDialog } = useDialog();
  const { info } = describeLens(active);

  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-4">
      {lenses.map((lens) => {
        const { title, label } = describeLens(lens);
        const LensSmart = lensSmart(lens.__typename);
        return (
          <LensSmart.Smart key={lens.id} object={lens}>
            <div className={rowClass(lens.id === active.id)}>
              <SnapshotBackdrop
                snapshot={lensSnapshot(lens)}
                className="h-9 w-9 shrink-0 rounded"
              />
              <div className="flex min-w-0 flex-col">
                <LensSmart.DetailLink
                  object={lens}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {title}
                </LensSmart.DetailLink>
                <span className="truncate font-mono text-[0.625rem] text-muted-foreground">
                  {label}
                </span>
              </div>
            </div>
          </LensSmart.Smart>
        );
      })}

      {capped && (
        <p className="text-xs text-muted-foreground">
          The newest {SIBLING_LIMIT} lenses. Older ones are on the lens list.
        </p>
      )}

      {lenses.every(isWholeLens) && (
        <p className="text-xs text-muted-foreground">
          Nothing has been cut out of this {info.container.toLowerCase()} yet. A
          lens selects part of it to look at or to hand to a task on its own.
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="mt-1 w-fit"
        // A fresh cut of the container, starting at the whole of it.
        onClick={() => openDialog("createlens", containerFilter(active), { size: "medium" })}
      >
        <Plus className="mr-2 h-4 w-4" />
        New lens
      </Button>
    </div>
  );
};
