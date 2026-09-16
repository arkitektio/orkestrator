import { UseModelForDialog } from "@/alpaka/dialogs/UseModelForDialog";
import { AlpakaReplyerAssignForm } from "@/alpaka/forms/AlpakaReplyerAssignForm";
import { AddUserToOrganizationDialog } from "@/dialogs/AddUserToOrganization";
import { ChatDialog } from "@/dialogs/ChatDialog";
import { CreateEntityWithPropertiesDialog } from "@/dialogs/CreateEntityWithProperties";
import { CreateNewMeasurement } from "@/dialogs/CreateNewMeasurement";
import { CreateNewRelation } from "@/dialogs/CreateNewRelation";
import { NotifyDialog } from "@/dialogs/NotifyDialog";
import { RelateStructures } from "@/dialogs/RelateStructures";
import { ReportBugDialog } from "@/dialogs/ReportBugDialog";
import { ReportClientBugDialog } from "@/dialogs/ReportClientBugDialog";
import { SetAsMeasurement } from "@/dialogs/SetAsMeasurement";
import { CreateRepoForm } from "@/kabinet/forms/CreateRepoForm";
import CreateEntityCategoryForm from "@/kraph/forms/CreateEntityCategoryForm";
import CreateEntityForm from "@/kraph/forms/CreateEntityForm";
import CreateGraphForm from "@/kraph/forms/CreateGraphForm";
import CreateNaturalEventCategoryForm from "@/kraph/forms/CreateNaturalEventCategoryForm";
import CreateProtocolEventCategoryForm from "@/kraph/forms/CreateProtocolEventCategoryForm";
import { TForm as CreateRelationCategoryForm } from "@/kraph/forms/CreateRelationCategoryForm";
import { TForm as CreateStructureRelationCategoryForm } from "@/kraph/forms/CreateStructureRelationCategoryForm";
import UpdateEntityCategoryForm from "@/kraph/forms/UpdateEntityCategoryForm";
import { NeuronEditorHelp } from "@/elektro/components/NeuronEditorHelp";
import { AddProfileDialog } from "@/app/components/profile/AddProfileDialog";
import { createDialogProvider } from "@/lib/generic/providers/DialogProvider";
import { CreateOrganizationForm } from "@/lok-next/dialogs/CreateOrganization";
import { CreateRedeemTokenForm } from "@/lok-next/forms/CreateRedeemTokenForm";
import { CreateServiceInstanceForm } from "@/lok-next/forms/CreateServiceInstance";
import { UpdateServiceInstanceForm } from "@/lok-next/forms/UpdateServiceInstanceForm";
import { AddLayerForm } from "@/mikro-next/forms/AddLayerForm";
import { CommitMeshDesignDialog } from "@/mikro-next/components/scene/features/meshDesign/ui/CommitMeshDesignDialog";
import { CalibrateForm } from "@/mikro-next/forms/CalibrateForm";
import { RegisterForm } from "@/mikro-next/forms/RegisterForm";
import { CreateFolderForm as CreateMikroFolderForm } from "@/mikro-next/forms/CreateFolderForm";
import { MoveToFolderForm } from "@/mikro-next/forms/MoveToFolderForm";
import { UpdateFolderForm } from "@/mikro-next/forms/UpdateFolderForm";
import { CreateDatasetForm as CreateOmeroDatasetForm } from "@/omero-ark/forms/CreateDatasetForm";
import { CreateProjectForm } from "@/omero-ark/forms/CreateProjectForm";
import { CreateWorkspaceForm } from "@/reaktion/components/forms/CreateWorkspaceForm";
import { ExportModelForm } from "@/elektro/forms/ExportModelForm";
import { CreateShortcutDialog } from "@/rekuest/components/dialogs/CreateShortcutDialog";
import { ActionAssignForm } from "@/rekuest/forms/ActionAssignForm";
import { ImplementationAssignForm } from "@/rekuest/forms/ImplementationAssignForm";
import { UpdateAgentForm } from "@/rekuest/forms/UpdateAgentForm";

export const { DialogProvider, useDialog, registry } = createDialogProvider({
  actionassign: ActionAssignForm,
  addprofile: AddProfileDialog,
  alpakareplyerassign: AlpakaReplyerAssignForm,
  implementationassign: ImplementationAssignForm,
  relatestructure: RelateStructures,
  createnewrelation: CreateNewRelation,
  createnewmeasurement: CreateNewMeasurement,
  setasmeasurement: SetAsMeasurement,
  createshortcut: CreateShortcutDialog,
  updateagent: UpdateAgentForm,
  notifyusers: NotifyDialog,
  addusertoorganization: AddUserToOrganizationDialog,
  createentitywithproperties: CreateEntityWithPropertiesDialog,
  createentitycategory: CreateEntityCategoryForm,
  createprotocoleventcategory: CreateProtocolEventCategoryForm,
  createentity: CreateEntityForm,
  chat: ChatDialog,
  reportbug: ReportBugDialog,
  reportclientbug: ReportClientBugDialog,
  editentitycategory: UpdateEntityCategoryForm,
  usemodelfor: UseModelForDialog,
  createorganization: CreateOrganizationForm,
  // mikro scene: the mesh designer's commit (features/meshDesign)
  commitmeshdesign: CommitMeshDesignDialog,
  // elektro
  exportelektromodel: ExportModelForm,
  // kraph
  creategraph: CreateGraphForm,
  createnaturaleventcategory: CreateNaturalEventCategoryForm,
  createrelationcategory: CreateRelationCategoryForm,
  createstructurerelationcategory: CreateStructureRelationCategoryForm,
  // lok-next
  createserviceinstance: CreateServiceInstanceForm,
  updateserviceinstance: UpdateServiceInstanceForm,
  createredeemtoken: CreateRedeemTokenForm,
  // kabinet
  createrepo: CreateRepoForm,
  // omero-ark
  createproject: CreateProjectForm,
  createomeroarkcataset: CreateOmeroDatasetForm,
  // reaktion
  createworkspace: CreateWorkspaceForm,
  // elektro
  neuroneditorhelp: NeuronEditorHelp,
  // mikro-next
  addlayer: AddLayerForm,
  register: RegisterForm,
  calibrate: CalibrateForm,
  createmikrofolder: CreateMikroFolderForm,
  movetofolder: MoveToFolderForm,
  updatefolder: UpdateFolderForm,
});
