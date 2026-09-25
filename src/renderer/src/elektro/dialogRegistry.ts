import { NeuronEditorHelp } from "./components/NeuronEditorHelp";
import { AddExperimentLayerForm } from "./forms/AddExperimentLayerForm";
import { PlaceExperimentLayerForm } from "./forms/PlaceExperimentLayerForm";

/**
 * elektro's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const ELEKTRO_DIALOGS = {
      addexperimentlayer: AddExperimentLayerForm,
      placeexperimentlayer: PlaceExperimentLayerForm,
      neuroneditorhelp: NeuronEditorHelp,
};
