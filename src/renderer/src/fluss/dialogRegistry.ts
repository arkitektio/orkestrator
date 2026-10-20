import { needsServices } from "@/core/modules/host/dialogNeeds";
import { CreateWorkspaceForm } from "./components/forms/CreateWorkspaceForm";
import { DeployPythonFlowForm } from "./components/forms/DeployPythonFlowForm";

/**
 * fluss's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const FLUSS_DIALOGS = {
  createworkspace: CreateWorkspaceForm,
  // Deploying is a rekuest higher-order implementation of fluss's runner.
  deploypythonflow: needsServices(["rekuest"], DeployPythonFlowForm),
};
