import { prefersSize } from "@/core/modules/host/dialogNeeds";
import { LightPath3DDialog } from "./components/lightpath/LightPath3DDialog";
import { CommitMeshDesignDialog } from "./components/scene/features/meshDesign/ui/CommitMeshDesignDialog";
import { AddChartLayerForm } from "./forms/AddChartLayerForm";
import { AddLayerForm } from "./forms/AddLayerForm";
import { AddToCollaborationForm } from "./forms/AddToCollaborationForm";
import { CreateCollaborationForm } from "./forms/CreateCollaborationForm";
import { ShareCollaborationForm } from "./forms/ShareCollaborationForm";
import { CalibrateForm } from "./forms/CalibrateForm";
import { CreateChartForm } from "./forms/CreateChartForm";
import { CreateFolderForm } from "./forms/CreateFolderForm";
import { CreateLensForm } from "./forms/CreateLensForm";
import { MoveToFolderForm } from "./forms/MoveToFolderForm";
import { RegisterForm } from "./forms/RegisterForm";
import { RenameLensForm } from "./forms/RenameLensForm";
import { UpdateFolderForm } from "./forms/UpdateFolderForm";
import { UploadCadModelForm } from "./forms/UploadCadModelForm";
import { AgentUploadFileForm } from "./forms/AgentUploadFileForm";

/**
 * mikro's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const MIKRO_DIALOGS = {
  // the scene's mesh designer commit (features/meshDesign)
  commitmeshdesign: CommitMeshDesignDialog,
  // the metadata panel's light path, to turn around (components/lightpath)
  lightpath3d: LightPath3DDialog,
  addchartlayer: AddChartLayerForm,
  addlayer: AddLayerForm,
  // collaborations: what a guest is granted (forms/*Collaboration*)
  addtocollaboration: AddToCollaborationForm,
  createcollaboration: CreateCollaborationForm,
  sharecollaboration: ShareCollaborationForm,
  register: RegisterForm,
  calibrate: CalibrateForm,
  createchart: CreateChartForm,
  createmikrofolder: CreateFolderForm,
  createlens: CreateLensForm,
  renamelens: RenameLensForm,
  movetofolder: MoveToFolderForm,
  updatefolder: UpdateFolderForm,
  uploadcadmodel: UploadCadModelForm,
  // a file the Orkestrator agent's `upload_file` asks the person for (awaited)
  agentuploadfile: prefersSize("small", AgentUploadFileForm),
};
