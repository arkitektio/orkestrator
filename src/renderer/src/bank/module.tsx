import { defineModule } from "@/core/modules/host/define";
import { BANK_ACTIONS } from "./actions";
import { BANK_AUTH_FLOW } from "./authFlow";
import { BANK_DIALOGS } from "./dialogRegistry";
import { AccountDisplay } from "./displays/AccountDisplay";
import { MerchantDisplay } from "./displays/MerchantDisplay";
import { PlaceDisplay } from "./displays/PlaceDisplay";
import { TransactionDisplay } from "./displays/TransactionDisplay";
import { manifest } from "./manifest";
import { BANK_NAV_LINKS } from "./navLinks";
import { BankEntitySearch } from "./search";
import { service } from "./service";

export const BANK_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./BankModule"),
    navLinks: BANK_NAV_LINKS,
    displays: {
      "@bank/account": AccountDisplay,
      "@bank/transaction": TransactionDisplay,
      "@bank/merchant": MerchantDisplay,
      "@bank/place": PlaceDisplay,
    },
    dialogs: BANK_DIALOGS,
    actions: BANK_ACTIONS,
    authFlow: BANK_AUTH_FLOW,
    search: BankEntitySearch,
  },
});
