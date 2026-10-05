import { ADMIN_ROLE } from "@/core/connection/roles";
import { needsRoles } from "@/core/modules/host/dialogNeeds";
import { ReportClientBugDialog } from "./dialogs/ReportClientBugDialog";
import { AddUserToOrganizationDialog } from "./dialogs/AddUserToOrganization";
import { AnswerMembershipRequestDialog } from "./dialogs/AnswerMembershipRequestDialog";
import { CreateOrganizationForm } from "./dialogs/CreateOrganization";
import { NotifyDialog } from "./dialogs/NotifyDialog";
import { RevokeMandateDialog } from "./dialogs/RevokeMandateDialog";
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
  addusertoorganization: needsRoles(ADMIN_ROLE, AddUserToOrganizationDialog),
  answermembershiprequest: needsRoles(ADMIN_ROLE, AnswerMembershipRequestDialog),
  createorganization: CreateOrganizationForm,
  createserviceinstance: needsRoles(ADMIN_ROLE, CreateServiceInstanceForm),
  updateserviceinstance: needsRoles(ADMIN_ROLE, UpdateServiceInstanceForm),
  createredeemtoken: needsRoles(ADMIN_ROLE, CreateRedeemTokenForm),
  reportclientbug: ReportClientBugDialog,
  revokemandate: RevokeMandateDialog,
};
