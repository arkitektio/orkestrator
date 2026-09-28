import { CreateEntityWithPropertiesDialog } from "./dialogs/CreateEntityWithProperties";
import { CreateNewMeasurement } from "./dialogs/CreateNewMeasurement";
import { CreateNewRelation } from "./dialogs/CreateNewRelation";
import { RelateStructures } from "./dialogs/RelateStructures";
import { SetAsMeasurement } from "./dialogs/SetAsMeasurement";
import CreateEntityCategoryForm from "./forms/CreateEntityCategoryForm";
import CreateEntityForm from "./forms/CreateEntityForm";
import CreateGraphForm from "./forms/CreateGraphForm";
import CreateNaturalEventCategoryForm from "./forms/CreateNaturalEventCategoryForm";
import CreateProtocolEventCategoryForm from "./forms/CreateProtocolEventCategoryForm";
import { TForm as CreateRelationCategoryForm } from "./forms/CreateRelationCategoryForm";
import { TForm as CreateStructureRelationCategoryForm } from "./forms/CreateStructureRelationCategoryForm";
import UpdateEntityCategoryForm from "./forms/UpdateEntityCategoryForm";

/**
 * kraph's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const KRAPH_DIALOGS = {
  relatestructure: RelateStructures,
  createnewrelation: CreateNewRelation,
  createnewmeasurement: CreateNewMeasurement,
  setasmeasurement: SetAsMeasurement,
  createentitywithproperties: CreateEntityWithPropertiesDialog,
  createentitycategory: CreateEntityCategoryForm,
  createprotocoleventcategory: CreateProtocolEventCategoryForm,
  createentity: CreateEntityForm,
  editentitycategory: UpdateEntityCategoryForm,
  creategraph: CreateGraphForm,
  createnaturaleventcategory: CreateNaturalEventCategoryForm,
  createrelationcategory: CreateRelationCategoryForm,
  createstructurerelationcategory: CreateStructureRelationCategoryForm,
};
