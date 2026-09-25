import { Structure } from "@/core/types";
import { SelectionState, SelectionStore } from "./store";

export type SelectionContextType = SelectionStore | null;

export type SelectionSnapshot = Pick<
  SelectionState,
  | "selection"
  | "bselection"
  | "isMultiSelecting"
  | "setSelection"
  | "setBSelection"
  | "unselect"
  | "setIsMultiSelecting"
  | "registerSelectables"
  | "toggleSelection"
  | "toggleBSelection"
  | "unregisterSelectables"
> & {
  focus?: Structure;
  removeSelection: () => void;
};
