import { prefersSize } from "@/core/modules/host/dialogNeeds";
import { CreateEntityWithPropertiesDialog } from "./dialogs/CreateEntityWithProperties";
import { CreateNewMeasurement } from "./dialogs/CreateNewMeasurement";
import { CreateNewRelation } from "./dialogs/CreateNewRelation";
import { MeasureTermDialog } from "./dialogs/MeasureTerm";
import { RelateStructures } from "./dialogs/RelateStructures";
import { SetAsMeasurement } from "./dialogs/SetAsMeasurement";
import CreateEntityCategoryForm from "./forms/CreateEntityCategoryForm";
import CreateEntityForm from "./forms/CreateEntityForm";
import CreateGraphForm from "./forms/CreateGraphForm";
import CreateNaturalEventCategoryForm from "./forms/CreateNaturalEventCategoryForm";
import CreateProtocolEventCategoryForm from "./forms/CreateProtocolEventCategoryForm";
import CreateTermForm from "./forms/CreateTermForm";
import { TForm as CreateRelationCategoryForm } from "./forms/CreateRelationCategoryForm";
import { TForm as CreateStructureRelationCategoryForm } from "./forms/CreateStructureRelationCategoryForm";
import UpdateEntityCategoryForm from "./forms/UpdateEntityCategoryForm";
import { AddToTodoForm } from "./forms/todos/AddToTodoForm";
import { AssignTodoForm } from "./forms/todos/AssignTodoForm";
import { ScheduleTodoForm } from "./forms/todos/ScheduleTodoForm";
import { CreateTodoItemForm } from "./forms/todos/CreateTodoItemForm";
import { CreateTodoListForm } from "./forms/todos/CreateTodoListForm";
import { CreateProjectForm } from "./forms/projects/CreateProjectForm";
import { EditProjectForm } from "./forms/projects/EditProjectForm";

/**
 * kraph's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const KRAPH_DIALOGS = {
  relatestructure: RelateStructures,
  createnewrelation: CreateNewRelation,
  // Three panes side by side: no natural width to fit.
  createnewmeasurement: prefersSize("large", CreateNewMeasurement),
  setasmeasurement: SetAsMeasurement,
  measureterm: MeasureTermDialog,
  createentitywithproperties: CreateEntityWithPropertiesDialog,
  createentitycategory: CreateEntityCategoryForm,
  createprotocoleventcategory: CreateProtocolEventCategoryForm,
  createentity: CreateEntityForm,
  editentitycategory: UpdateEntityCategoryForm,
  creategraph: CreateGraphForm,
  createnaturaleventcategory: CreateNaturalEventCategoryForm,
  createrelationcategory: CreateRelationCategoryForm,
  createstructurerelationcategory: CreateStructureRelationCategoryForm,
  createterm: CreateTermForm,
  createkraphproject: CreateProjectForm,
  editkraphproject: EditProjectForm,
  createtodolist: CreateTodoListForm,
  createtodoitem: CreateTodoItemForm,
  addtotodo: AddToTodoForm,
  assigntodo: AssignTodoForm,
  scheduletodo: ScheduleTodoForm,
};
