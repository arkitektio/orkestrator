import { CommitMeshDesignDialog } from "./components/scene/features/meshDesign/ui/CommitMeshDesignDialog";
import { AddLayerForm } from "./forms/AddLayerForm";
import { CalibrateForm } from "./forms/CalibrateForm";
import { CreateFolderForm } from "./forms/CreateFolderForm";
import { MoveToFolderForm } from "./forms/MoveToFolderForm";
import { RegisterForm } from "./forms/RegisterForm";
import { UpdateFolderForm } from "./forms/UpdateFolderForm";

/**
 * mikro's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const MIKRO_DIALOGS = {
      // the scene's mesh designer commit (features/meshDesign)
      commitmeshdesign: CommitMeshDesignDialog,
      addlayer: AddLayerForm,
      register: RegisterForm,
      calibrate: CalibrateForm,
      createmikrofolder: CreateFolderForm,
      movetofolder: MoveToFolderForm,
      updatefolder: UpdateFolderForm,
};
