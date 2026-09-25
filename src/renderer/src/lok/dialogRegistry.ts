import { ReportClientBugDialog } from "./dialogs/ReportClientBugDialog";
import { AddUserToOrganizationDialog } from "./dialogs/AddUserToOrganization";
import { CreateOrganizationForm } from "./dialogs/CreateOrganization";
import { NotifyDialog } from "./dialogs/NotifyDialog";
import { CreateRedeemTokenForm } from "./forms/CreateRedeemTokenForm";
import { CreateServiceInstanceForm } from "./forms/CreateServiceInstance";
import { UpdateServiceInstanceForm } from "./forms/UpdateServiceInstanceForm";

/**
 * lok's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const LOK_DIALOGS = {
  notifyusers: NotifyDialog,
  addusertoorganization: AddUserToOrganizationDialog,
  createorganization: CreateOrganizationForm,
  createserviceinstance: CreateServiceInstanceForm,
  updateserviceinstance: UpdateServiceInstanceForm,
  createredeemtoken: CreateRedeemTokenForm,
  reportclientbug: ReportClientBugDialog,
};
