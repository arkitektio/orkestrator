import {
  RESIDENT_ICON,
  isNamedResident,
  residentLink,
  residentName,
  type NamedResident,
} from "../../../residents/residentLinks";
import { DerivedItem } from "./DerivedItem";

export { isNamedResident, type NamedResident };

/**
 * What was computed from a shape or a mesh object (`...DerivedResident`), as
 * the scene's floats list it: one button per container (`DerivedItem`) — a
 * dataset or a surface shows itself in the scene, everything else opens its
 * page.
 */
export const ResidentItem = ({ resident }: { resident: NamedResident }) => {
  const label = residentName(resident);
  const source =
    resident.__typename === "ArrayDataset" && resident.fullLens
      ? { kind: "array" as const, lens: resident.fullLens.id, label }
      : resident.__typename === "MeshCollection" && resident.fullLens
        ? { kind: "mesh" as const, lens: resident.fullLens.id, label }
        : undefined;
  return <DerivedItem icon={RESIDENT_ICON[resident.__typename]} label={label} source={source} renderLink={residentLink(resident)} />;
};
