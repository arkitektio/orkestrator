import { ADMIN_ROLE } from "@/core/connection/roles";
import { needsRoles } from "@/core/modules/host/dialogNeeds";
import { AssignMerchantForm } from "./forms/AssignMerchantForm";
import { CategorizeForm } from "./forms/CategorizeForm";
import { CreateBudgetForm } from "./forms/CreateBudgetForm";
import { CreateCategoryForm } from "./forms/CreateCategoryForm";
import { CreateMerchantForm } from "./forms/CreateMerchantForm";
import { CreateRuleForm } from "./forms/CreateRuleForm";
import { DeleteCategoryForm } from "./forms/DeleteCategoryForm";
import { EditCategoryForm } from "./forms/EditCategoryForm";
import { EditMerchantForm } from "./forms/EditMerchantForm";
import { LinkBankForm } from "./forms/LinkBankForm";
import { MergeMerchantForm } from "./forms/MergeMerchantForm";
import { PlaceForm } from "./forms/PlaceForm";
import { CreateProviderForm, EditProviderForm } from "./forms/ProviderForm";

/**
 * bank's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const BANK_DIALOGS = {
  banklink: LinkBankForm,
  bankcreateprovider: needsRoles(ADMIN_ROLE, CreateProviderForm),
  bankeditprovider: needsRoles(ADMIN_ROLE, EditProviderForm),
  bankcreatecategory: CreateCategoryForm,
  bankeditcategory: EditCategoryForm,
  bankdeletecategory: DeleteCategoryForm,
  bankeditmerchant: EditMerchantForm,
  bankcreatemerchant: CreateMerchantForm,
  bankmergemerchant: MergeMerchantForm,
  bankassignmerchant: AssignMerchantForm,
  bankplace: PlaceForm,
  bankcreaterule: CreateRuleForm,
  bankcreatebudget: CreateBudgetForm,
  bankcategorize: CategorizeForm,
};
