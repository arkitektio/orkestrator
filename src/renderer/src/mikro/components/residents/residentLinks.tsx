import type { ReactNode } from "react";
import {
  BoxIcon,
  Grid3x3Icon,
  ImageIcon,
  NetworkIcon,
  PenLineIcon,
  TableIcon,
  type LucideIcon,
} from "lucide-react";

import {
  MikroArrayDataset,
  MikroMeshCollection,
  MikroSparseDataset,
  MikroTableDataset,
} from "@/core/linkers";
import type { DerivedResidentFragment } from "@/mikro/api/graphql";

/**
 * A container named as a `...DerivedResident` — what was made from a shape,
 * what keys a table — as every surface draws one: its kind's icon, its name,
 * and the way to its page. Shared by the scene's floats and the table page.
 */

/** The containers a resident can be; a lens or a level is a part of one and is never listed. */
export type NamedResident = Extract<DerivedResidentFragment, { id: string }>;

export const isNamedResident = (resident: DerivedResidentFragment): resident is NamedResident => "id" in resident;

export const RESIDENT_ICON: Record<NamedResident["__typename"], LucideIcon> = {
  ArrayDataset: ImageIcon,
  TableDataset: TableIcon,
  SparseDataset: Grid3x3Icon,
  MeshCollection: BoxIcon,
  NetworkCollection: NetworkIcon,
  AnnotationCollection: PenLineIcon,
};

export const residentName = (resident: NamedResident): string => ("name" in resident ? resident.name : resident.label);

/** How a resident opens its page, given the link's props; networks and annotation collections have none. */
export type RenderResidentLink = (props: { className: string; title?: string; children: ReactNode }) => ReactNode;

export const residentLink = (resident: NamedResident): RenderResidentLink | undefined => {
  switch (resident.__typename) {
    case "ArrayDataset":
      return (props) => <MikroArrayDataset.DetailLink object={resident} {...props} />;
    case "TableDataset":
      return (props) => <MikroTableDataset.DetailLink object={resident} {...props} />;
    case "SparseDataset":
      return (props) => <MikroSparseDataset.DetailLink object={resident} {...props} />;
    case "MeshCollection":
      return (props) => <MikroMeshCollection.DetailLink object={resident} {...props} />;
    case "NetworkCollection":
    case "AnnotationCollection":
      return undefined;
  }
};
