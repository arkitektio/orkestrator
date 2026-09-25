import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { MikroArrayDataset, MikroTableDataset } from "@/linkers";
import { Boxes, FileType2, Grid3x3, Shapes, Table2 } from "lucide-react";
import { FileLinkFragment } from "../../api/graphql";

/**
 * The rows of a file↔container relation — `File.derivedContainers` (what was
 * converted OUT of these bytes) and `File.exportedFrom` (what these bytes were
 * written FROM), and the same relation seen from the container side as
 * `sourceFiles` / `exports`.
 *
 * One component for all four because they are one relation read in two
 * directions from two ends, and the row is identical: a container, which side
 * came first, and the series of a multi-series file it concerns.
 *
 * **Not a derivation.** A file has no coordinate system, so these links claim no
 * geometry and place nothing — which is exactly why they are a section of their
 * own rather than more edges in `DerivedFromSection`. They say only that the
 * file's bytes and that container's data are the same thing.
 */

type QueryContainer = FileLinkFragment["container"];

/**
 * What a container is CALLED, which the union does not answer uniformly:
 * `MeshCollection` has no `name` field in the schema at all (id, version and
 * specVersion only), so its label has to be built rather than read.
 */
const containerLabel = (container: QueryContainer): string => {
  switch (container.__typename) {
    case "MeshCollection":
      return `Mesh collection · v${container.version}`;
    default:
      return container.name;
  }
};

const containerIcon = (container: QueryContainer) => {
  switch (container.__typename) {
    case "ArrayDataset":
      return Grid3x3;
    case "TableDataset":
      return Table2;
    case "MeshCollection":
      return Boxes;
    case "AnnotationCollection":
      return Shapes;
    default:
      return FileType2;
  }
};

/**
 * Linkers exist for two of the four members of `FileLinkContainer`, so the other
 * two render as text. A name nobody can click is still a true answer, and
 * inventing a route for a model with no detail page would not be.
 */
const ContainerName = ({ container }: { container: QueryContainer }) => {
  const label = containerLabel(container);

  switch (container.__typename) {
    case "ArrayDataset":
      return (
        <MikroArrayDataset.DetailLink
          object={container}
          className="break-all text-sm font-medium"
        >
          {label}
        </MikroArrayDataset.DetailLink>
      );
    case "TableDataset":
      return (
        <MikroTableDataset.DetailLink
          object={container}
          className="break-all text-sm font-medium"
        >
          {label}
        </MikroTableDataset.DetailLink>
      );
    default:
      return <span className="break-all text-sm font-medium">{label}</span>;
  }
};

export const FileLinksSection = ({
  title,
  links,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  links: readonly FileLinkFragment[];
  emptyTitle: string;
  emptyDescription: string;
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row items-baseline justify-between gap-2">
        <div className="text-xs font-semibold">{title}</div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {links.length}
        </span>
      </div>

      {links.length === 0 ? (
        <Empty>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </Empty>
      ) : (
        links.map((link) => {
          const Icon = containerIcon(link.container);

          return (
            <div
              key={link.id}
              className="flex flex-row items-start gap-2 rounded-md border border-border/60 p-2"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col gap-1">
                <ContainerName container={link.container} />

                <div className="flex flex-row flex-wrap items-center gap-x-2 text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                  {/* The series is part of the link's IDENTITY — one multi-series
                      LIF has one link per series, so without it two rows to the
                      same file read as a duplicate of each other. */}
                  {link.seriesIdentifier && <span>{link.seriesIdentifier}</span>}
                  {link.valueRelation && <span>· {link.valueRelation}</span>}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
