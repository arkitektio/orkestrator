import { MikroArrayDataset, MikroSparseDataset, MikroTableDataset } from "@/core/linkers";
import type { ReactNode } from "react";
import type { LensSubjectFragment } from "../../api/graphql";
import { CONTAINER_SUBROUTE, describeLens } from "../../lenses";

/**
 * The container a lens selects from, linked where that container has a page.
 *
 * Arrays, tables and sparse datasets do. Mesh, network and annotation
 * collections have no page of their own, so they name themselves rather than
 * pretend to be navigable: for those kinds the lens IS the page.
 */
export const LensContainerLink = ({
  lens,
  className,
  children,
}: {
  lens: LensSubjectFragment;
  className?: string;
  /** Replaces the container's name as the link's content. */
  children?: ReactNode;
}) => {
  const content = children ?? describeLens(lens).container.name;
  switch (lens.__typename) {
    case "ArrayLens":
      return (
        // The dataset's own address opens the whole array; its container page,
        // where its other lenses are listed, is one subroute further.
        <MikroArrayDataset.DetailLink
          object={lens.dataset}
          subroute={CONTAINER_SUBROUTE}
          className={className}
        >
          {content}
        </MikroArrayDataset.DetailLink>
      );
    case "TableLens":
      return (
        <MikroTableDataset.DetailLink object={lens.tableDataset} className={className}>
          {content}
        </MikroTableDataset.DetailLink>
      );
    case "SparseLens":
      return (
        <MikroSparseDataset.DetailLink object={lens.sparseDataset} className={className}>
          {content}
        </MikroSparseDataset.DetailLink>
      );
    default:
      return <span className={className}>{content}</span>;
  }
};
