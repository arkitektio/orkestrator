import { Action, ActionParams } from "@/core/smart/localactions/LocalActionProvider";
import { MapPinPlus, Pencil, Trash2 } from "lucide-react";

const PLACE = "@lokate/place";
const VISIT = "@lokate/visit";

/** The first selected id of one kind; a mixed selection is narrowed here. */
const firstOf = (state: ActionParams["state"], identifier: string) =>
  state.left.find((structure) => structure.identifier === identifier && structure.id)?.id;

/** lokate's local actions (an `actions` builtin): editing places, naming a stay. */
export const LOKATE_ACTIONS: Record<string, Action> = {
  "lokate-edit-place": {
    title: "Edit place",
    description: "Rename it, move its pin or change its radius",
    icon: Pencil,
    conditions: [{ type: "identifier", identifier: PLACE }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("lokateplace", { id: String(firstOf(state, PLACE)) }, { size: "medium" });
    },
  },
  "lokate-delete-place": {
    title: "Delete place",
    description: "Remove it from all your phones",
    icon: Trash2,
    conditions: [{ type: "identifier", identifier: PLACE }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("lokatedeleteplace", { id: String(firstOf(state, PLACE)) }, { size: "small" });
    },
  },
  "lokate-save-visit-as-place": {
    title: "Save as place",
    description: "Name the spot of this stay",
    icon: MapPinPlus,
    conditions: [{ type: "identifier", identifier: VISIT }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("lokateplace", { visit: String(firstOf(state, VISIT)) }, { size: "medium" });
    },
  },
};
