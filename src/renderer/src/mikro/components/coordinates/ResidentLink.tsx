import { MikroArrayDataset, MikroSparseDataset, MikroTableDataset } from "@/core/linkers";
import {
  Aperture,
  Grid2x2,
  Grid3x3,
  Layers,
  Shapes,
  Table2,
  Tags,
  type LucideIcon,
  Share2,
} from "lucide-react";
import { ResidentFragment } from "../../api/graphql";
import { residentName } from "./residents";

/**
 * How one resident — the data LIVING IN a coordinate system — is drawn.
 *
 * `residents` is the whole vocabulary a space has left now that `kind` is gone,
 * so this is the one definition of what a resident looks like, shared by the
 * graph node and the coordinate system page. Both surfaces answering the same
 * question the same way is the point: a space's story is who lives in it.
 */

export type Resident = ResidentFragment;

type Kind = Resident["__typename"];

/** Same convention as the transformation kind → icon map. */
export const RESIDENT_ICON: Record<Kind, LucideIcon> = {
  ArrayDataset: Layers,
  TableDataset: Table2,
  AnnotationCollection: Tags,
  MeshCollection: Shapes,
  Lens: Aperture,
  DataArray: Grid2x2,
  SparseDataset: Grid3x3,
  NetworkCollection: Share2,
};

/** What to call the kind itself, in place of the raw `__typename`. */
export const RESIDENT_KIND_LABEL: Record<Kind, string> = {
  ArrayDataset: "array dataset",
  TableDataset: "table dataset",
  AnnotationCollection: "annotations",
  MeshCollection: "mesh collection",
  Lens: "lens",
  DataArray: "pyramid level",
  SparseDataset: "sparse dataset",
  NetworkCollection: "network collection",
};

/**
 * The resident's name, linked where a linker exists.
 *
 * There is no @mikro/annotationcollection, @mikro/meshcollection or
 * @mikro/dataarray linker, so those three name themselves rather than pretend
 * to be navigable. A Lens has no page of its own either, but it does have a
 * dataset — so it borrows that link.
 */
export const ResidentLink = (props: {
  resident: Resident;
  className?: string;
}) => {
  const { resident, className } = props;
  switch (resident.__typename) {
    case "ArrayDataset":
      return (
        <MikroArrayDataset.DetailLink object={resident} className={className}>
          {resident.name}
        </MikroArrayDataset.DetailLink>
      );
    case "TableDataset":
      return (
        <MikroTableDataset.DetailLink object={resident} className={className}>
          {resident.name}
        </MikroTableDataset.DetailLink>
      );
    case "SparseDataset":
      return (
        <MikroSparseDataset.DetailLink object={resident} className={className}>
          {resident.name}
        </MikroSparseDataset.DetailLink>
      );
    case "Lens":
      return (
        <span className={className}>
          a lens of{" "}
          <MikroArrayDataset.DetailLink object={resident.dataset}>
            {resident.dataset.name}
          </MikroArrayDataset.DetailLink>
        </span>
      );
    default:
      // AnnotationCollection names itself; DataArray has only a level and
      // MeshCollection only a version — `residentName` already knows how to
      // phrase all three.
      return <span className={className}>{residentName(resident)}</span>;
  }
};
