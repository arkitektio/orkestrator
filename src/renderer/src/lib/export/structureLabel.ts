import { smartRegistry } from "@/providers/smart/registry";
import { Structure } from "@/types";

/** What a structure is called, for the export dialog and the toasts. */
export const structureLabel = ({ identifier, object }: Structure): string => {
  const named = object.label ?? object.name;
  return typeof named === "string" && named
    ? named
    : `${smartRegistry.getDisplayName(identifier)} ${object.id}`;
};
