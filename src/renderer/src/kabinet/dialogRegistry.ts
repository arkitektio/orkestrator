import { needsServices } from "@/core/modules/host/dialogNeeds";
import { DeployReleaseDialog } from "./dialogs/DeployReleaseDialog";
import { InstallReleaseDialog } from "./dialogs/InstallReleaseDialog";
import { RevokeApprovalDialog } from "./dialogs/RevokeApprovalDialog";
import { CreateRepoForm } from "./forms/CreateRepoForm";

/**
 * kabinet's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const KABINET_DIALOGS = {
  createrepo: CreateRepoForm,
  // Install only authorizes (lok mandate + kabinet approval); it asks rekuest
  // which deployer apps exist. Deploy runs a deployer's install(approval).
  installrelease: needsServices(["rekuest"], InstallReleaseDialog),
  deployrelease: needsServices(["rekuest"], DeployReleaseDialog),
  revokeapproval: RevokeApprovalDialog,
};
