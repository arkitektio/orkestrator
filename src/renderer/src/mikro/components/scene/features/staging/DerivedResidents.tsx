import {
  MikroArrayDataset,
  MikroMeshCollection,
  MikroSparseDataset,
  MikroTableDataset,
} from "@/core/linkers";
import type { DerivedResidentFragment } from "@/mikro/api/graphql";

import { StageToggle } from "./StageToggle";

/**
 * What was computed from a shape or a mesh object (`...DerivedResident`), as
 * the scene's floats list it: a link to each container, its kind, and — in a
 * float — the toggle that shows it in the scene for now.
 */

/** The containers a derivation can leave from; a lens or a level is a part of one and is never listed. */
export type NamedResident = Extract<DerivedResidentFragment, { id: string }>;

export const isNamedResident = (resident: DerivedResidentFragment): resident is NamedResident => "id" in resident;

export const RESIDENT_NOUN: Record<NamedResident["__typename"], string> = {
  ArrayDataset: "Dataset",
  TableDataset: "Table",
  SparseDataset: "Sparse dataset",
  MeshCollection: "Meshes",
  NetworkCollection: "Network",
  AnnotationCollection: "Annotations",
};

/**
 * Inside a float, a derivation can be shown in the scene for now: a dataset
 * through its whole lens (residents never list it), a surface through its
 * collection's. Tables, sparse data and networks are not drawn this way.
 */
export const ResidentStageToggle = ({ resident }: { resident: NamedResident }) => {
  if (resident.__typename === "ArrayDataset" && resident.fullLens) {
    return <StageToggle source={{ kind: "array", lens: resident.fullLens.id, label: resident.name }} />;
  }
  if (resident.__typename === "MeshCollection" && resident.fullLens) {
    return <StageToggle source={{ kind: "mesh", lens: resident.fullLens.id, label: resident.label }} />;
  }
  return null;
};

export const ResidentLink = ({ resident }: { resident: NamedResident }) => {
  const className = "min-w-0 truncate";
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
    case "MeshCollection":
      return (
        <MikroMeshCollection.DetailLink object={resident} className={className}>
          {resident.label}
        </MikroMeshCollection.DetailLink>
      );
    // No page of their own to open.
    case "NetworkCollection":
      return <span className={className}>{resident.label}</span>;
    case "AnnotationCollection":
      return <span className={className}>{resident.name}</span>;
  }
};
