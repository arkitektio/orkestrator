import { smartRegistry } from "@/providers/smart/registry";
import { Structure } from "@/types";

/** What a structure is called, for the export dialog and the toasts. */
export const structureLabel = ({ identifier, id, label }: Structure): string =>
  label || `${smartRegistry.getDisplayName(identifier)} ${id}`;
